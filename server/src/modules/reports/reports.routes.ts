import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { Router } from "express";
import type { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { assertCaseStatusTransition, statusTimestampPatch } from "../../cases/state-machine";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase, canAccessOwnedResource, canAccessPatient } from "../../utils/resource-access";
import {
  assertCanEditReport,
  assertCanFinalize,
  buildReportHtml,
  buildReportPdf,
  canManageReport,
  createReportVersion,
  generateClinicalReport,
  ensureClinicalReportForCase,
  persistReportArtifacts,
  serializeReport,
  statusFromApi,
  verifyReport,
} from "./reports.service";
import {
  drawnSignatureSchema,
  emailReportSchema,
  physicianProfileSchema,
  reportStatusSchema,
  reportUpdateSchema,
} from "./reports.schemas";

const reportRoot = path.resolve(process.cwd(), "uploads", "reports");
const signatureRoot = path.resolve(process.cwd(), "uploads", "signatures");
fs.mkdirSync(reportRoot, { recursive: true });
fs.mkdirSync(signatureRoot, { recursive: true });

const reportStatusQueryMap = {
  archived: "ARCHIVED",
  draft: "DRAFT",
  finalized: "FINALIZED",
  signed: "SIGNED",
  under_review: "UNDER_REVIEW",
} as const;

const signatureMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png"]);
const signatureExtensions = new Set([".jpeg", ".jpg", ".png"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, signatureRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!signatureExtensions.has(ext)) {
      cb(new AppError(400, "Unsupported signature file extension.", "INVALID_SIGNATURE_EXTENSION"), "");
      return;
    }
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const uploadSignature = multer({
  fileFilter: (_req, file, cb) => {
    if (!signatureMimeTypes.has(file.mimetype)) {
      cb(new AppError(400, "Unsupported signature image type.", "INVALID_SIGNATURE_TYPE"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
  storage,
});

export const reportsRouter = Router();

reportsRouter.get("/verify/:reportNumber", async (req, res, next) => {
  try {
    res.json({ verification: await verifyReport(String(req.params.reportNumber), typeof req.query.token === "string" ? req.query.token : undefined) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.use(requireAuth);

function requestBaseUrl(req: { get(header: string): string | undefined; protocol: string }) {
  const host = req.get("host");
  return host ? `${req.protocol}://${host}` : "";
}

function reportInclude() {
  return {
    author: { select: { email: true, id: true, name: true, specialization: true } },
    case: { select: { caseId: true, caseNumber: true } },
    emailLogs: { orderBy: { sentAt: "desc" } },
    patient: { select: { firstName: true, lastName: true, patientCode: true } },
    versions: { orderBy: { versionNumber: "desc" } },
  } satisfies Prisma.ClinicalReportInclude;
}

async function reportForAccess(reportId: string, auth: { id: string; role: Role }) {
  const report = await prisma.clinicalReport.findUnique({
    include: reportInclude(),
    where: { id: reportId },
  });
  if (!report) throw new AppError(404, "Clinical report not found.", "REPORT_NOT_FOUND");
  assertResourceAccess(
    canAccessOwnedResource(auth, [report.authorId, report.finalizedById, report.signedById]) ||
      (await canAccessPatient(report.patientId, auth)) ||
      (await canAccessCase(report.caseId, auth)),
    "You do not have access to this report.",
  );
  return report;
}

reportsRouter.get("/", async (req, res, next) => {
  try {
    const query = z
      .object({
        caseId: z.string().trim().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
        patientId: z.string().trim().optional(),
        q: z.string().trim().optional(),
        status: z.enum(["draft", "under_review", "finalized", "signed", "archived"]).optional(),
      })
      .parse(req.query);
    const where: Prisma.ClinicalReportWhereInput = {
      caseId: query.caseId,
      patientId: query.patientId,
      ...(query.status
        ? {
            status: reportStatusQueryMap[query.status],
          }
        : {}),
      AND: [
        ...(query.q
          ? [
              {
                OR: [
                  { reportNumber: { contains: query.q } },
                  { physicianName: { contains: query.q } },
                  { finalPhysicianImpression: { contains: query.q } },
                  { caseId: query.q },
                  { patientId: query.q },
                ],
              },
            ]
          : []),
        ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN"
          ? []
          : [
              {
                OR: [
                  { authorId: req.auth!.id },
                  { finalizedById: req.auth!.id },
                  { signedById: req.auth!.id },
                  { case: { OR: [{ assignedDoctorId: req.auth!.id }, { uploadedById: req.auth!.id }] } },
                  { patient: { auditLogs: { some: { action: "PATIENT_CREATED" as const, actorId: req.auth!.id } } } },
                ],
              },
            ]),
      ],
    };
    const [total, reports] = await Promise.all([
      prisma.clinicalReport.count({ where }),
      prisma.clinicalReport.findMany({
        include: reportInclude(),
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({
      page: query.page,
      pageSize: query.pageSize,
      reports: reports.map(serializeReport),
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({
      aiFindings: z.string().trim().max(4000).optional(),
      caseId: z.string().trim().optional(),
      doctorInterpretation: z.string().trim().max(4000).optional(),
      manualTitle: z.string().trim().max(180).optional(),
      patientId: z.string().trim().optional(),
      recommendations: z.string().trim().max(4000).optional(),
      reportType: z.enum(["ecg_case", "patient", "manual"]),
    }).parse(req.body);

    let caseId = body.caseId;
    if (caseId) {
      const existingCase = await prisma.eCGCase.findFirst({
        where: { OR: [{ id: caseId }, { caseId }, { caseNumber: caseId }] },
      });
      if (!existingCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
      caseId = existingCase.id;
    }
    if (!caseId) {
      if (!body.patientId) throw new AppError(400, "Patient is required for patient or manual reports.", "PATIENT_REQUIRED");
      assertResourceAccess(await canAccessPatient(body.patientId, req.auth!));
      const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
      if (!patient || patient.archivedAt) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
      const total = await prisma.eCGCase.count();
      const ecgCase = await prisma.eCGCase.create({
        data: {
          caseId: `ECG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`,
          caseNumber: `ECGCASE-${String(total + 1).padStart(6, "0")}`,
          clinicalComments: body.doctorInterpretation,
          clinicalNotes: body.doctorInterpretation,
          doctorDiagnosis: body.manualTitle ?? "Manual clinical report",
          ecgType: body.reportType === "manual" ? "Manual Report" : "Patient Clinical Report",
          finalDiagnosis: body.manualTitle ?? "Manual clinical report",
          patientId: body.patientId,
          recommendations: body.recommendations,
          severity: "NORMAL",
          status: "UNDER_REVIEW",
          uploadedById: req.auth!.id,
        },
      });
      caseId = ecgCase.id;
    }

    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const report = await ensureClinicalReportForCase(caseId, req.auth!.id);
    const updated = await prisma.clinicalReport.update({
      data: {
        aiFindings: body.aiFindings ?? report.aiFindings,
        finalPhysicianImpression: body.doctorInterpretation ?? report.finalPhysicianImpression,
        recommendations: body.recommendations ? body.recommendations.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean) : report.recommendations,
      },
      include: reportInclude(),
      where: { id: report.id },
    });
    const persisted = await persistReportArtifacts(updated.id, requestBaseUrl(req));
    res.status(201).json({ report: serializeReport(persisted) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.delete("/:reportId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    if (!canManageReport(req.auth!, report)) throw new AppError(403, "You can only delete your own reports.", "FORBIDDEN");
    if (report.status === "SIGNED") throw new AppError(409, "Signed reports cannot be deleted. Archive them instead.", "REPORT_LOCKED");
    await prisma.reportVersion.deleteMany({ where: { reportId: report.id } });
    await prisma.emailLog.deleteMany({ where: { reportId: report.id } });
    await prisma.clinicalReport.delete({ where: { id: report.id } });
    await prisma.auditLog.create({
      data: {
        action: "REPORT_ARCHIVED",
        actorId: req.auth!.id,
        caseId: report.caseId,
        entityId: report.id,
        entityType: "ClinicalReport",
        message: `Clinical report ${report.reportNumber} deleted.`,
        patientId: report.patientId,
      },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/cases/:caseId/generate", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(String(req.params.caseId), req.auth!));
    const report = await ensureClinicalReportForCase(String(req.params.caseId), req.auth!.id);
    const persisted = await persistReportArtifacts(report.id, requestBaseUrl(req));
    res.status(201).json({ report: serializeReport(persisted) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/signature/me", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const signature = await prisma.reportSignature.findUnique({ where: { physicianId: req.auth!.id } });
    res.json({
      signature: signature
        ? {
            createdAt: signature.createdAt.toISOString(),
            id: signature.id,
            imagePath: signature.imagePath,
            source: signature.source,
            updatedAt: signature.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.patch(
  "/physician-profile",
  requireRole("DOCTOR"),
  validateBody(physicianProfileSchema),
  async (req, res, next) => {
    try {
      const user = await prisma.user.update({
        data: {
          licenseNumber: req.body.licenseNumber,
          specialization: req.body.specialization,
        },
        where: { id: req.auth!.id },
      });
      res.json({
        physician: {
          id: user.id,
          licenseNumber: user.licenseNumber ?? undefined,
          name: user.name,
          specialization: user.specialization ?? undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

reportsRouter.post("/signature/upload", requireRole("DOCTOR"), uploadSignature.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "Signature image is required.", "FILE_REQUIRED");
    const signature = await prisma.reportSignature.upsert({
      create: {
        imagePath: req.file.path,
        physicianId: req.auth!.id,
        source: "upload",
      },
      update: {
        imagePath: req.file.path,
        source: "upload",
      },
      where: { physicianId: req.auth!.id },
    });
    res.status(201).json({ signature });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/signature/draw", requireRole("DOCTOR"), validateBody(drawnSignatureSchema), async (req, res, next) => {
  try {
    const payload = String(req.body.dataUrl);
    const base64 = payload.includes(",") ? payload.split(",").at(-1) : payload;
    if (!base64) throw new AppError(400, "Signature drawing data is invalid.", "INVALID_SIGNATURE");
    const filePath = path.join(signatureRoot, `${Date.now()}-${randomUUID()}.png`);
    fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
    const signature = await prisma.reportSignature.upsert({
      create: { imagePath: filePath, physicianId: req.auth!.id, source: "draw" },
      update: { imagePath: filePath, source: "draw" },
      where: { physicianId: req.auth!.id },
    });
    res.status(201).json({ signature });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:reportId", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    res.json({ report: serializeReport(report) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.patch("/:reportId", validateBody(reportUpdateSchema), async (req, res, next) => {
  try {
    const current = await reportForAccess(String(req.params.reportId), req.auth!);
    assertCanEditReport(req.auth!, current);
    const updated = await prisma.clinicalReport.update({
      data: req.body,
      where: { id: current.id },
    });
    await createReportVersion(updated, req.auth!.id, `Updated fields: ${Object.keys(req.body).join(", ") || "none"}.`);
    await prisma.auditLog.create({
      data: {
        action: "REPORT_UPDATED",
        actorId: req.auth!.id,
        caseId: updated.caseId,
        message: `Clinical report ${updated.reportNumber} updated.`,
        patientId: updated.patientId,
      },
    });
    res.json({ report: serializeReport(updated) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:reportId/status", validateBody(reportStatusSchema), async (req, res, next) => {
  try {
    const current = await reportForAccess(String(req.params.reportId), req.auth!);
    assertCanEditReport(req.auth!, current);
    const report = await prisma.clinicalReport.update({
      data: { status: statusFromApi(req.body.status) },
      where: { id: current.id },
    });
    await createReportVersion(report, req.auth!.id, `Report status changed to ${report.status}.`);
    res.json({ report: serializeReport(report) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:reportId/finalize", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const current = await reportForAccess(String(req.params.reportId), req.auth!);
    assertCanFinalize(req.auth!, current);
    const ecgCase = await prisma.eCGCase.findUnique({ where: { id: current.caseId } });
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseStatusTransition(ecgCase.status, "FINALIZED");
    const report = await prisma.clinicalReport.update({
      data: {
        finalizedAt: new Date(),
        finalizedById: req.auth!.id,
        status: "FINALIZED",
      },
      where: { id: current.id },
    });
    await prisma.eCGCase.update({
      data: {
        ...statusTimestampPatch("FINALIZED", req.auth!.id),
        status: "FINALIZED",
      },
      where: { id: ecgCase.id },
    });
    await createReportVersion(report, req.auth!.id, "Report finalized for physician signature.");
    await prisma.auditLog.create({
      data: {
        action: "REPORT_FINALIZED",
        actorId: req.auth!.id,
        caseId: report.caseId,
        message: `Clinical report ${report.reportNumber} finalized.`,
        patientId: report.patientId,
      },
    });
    res.json({ report: serializeReport(report) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:reportId/sign", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const current = await reportForAccess(String(req.params.reportId), req.auth!);
    if (current.status !== "FINALIZED") {
      throw new AppError(409, "Only finalized reports can be signed.", "REPORT_NOT_FINALIZED");
    }
    if (!canManageReport(req.auth!, current)) {
      throw new AppError(403, "You can only sign your own reports.", "FORBIDDEN");
    }
    const signature = await prisma.reportSignature.findUnique({ where: { physicianId: req.auth!.id } });
    if (!signature) throw new AppError(400, "Upload or draw a signature before signing reports.", "SIGNATURE_REQUIRED");
    const report = await prisma.clinicalReport.update({
      data: {
        electronicSignaturePath: signature.imagePath,
        signedAt: new Date(),
        signedById: req.auth!.id,
        status: "SIGNED",
      },
      where: { id: current.id },
    });
    await createReportVersion(report, req.auth!.id, "Electronic signature applied.");
    await prisma.auditLog.create({
      data: {
        action: "REPORT_SIGNED",
        actorId: req.auth!.id,
        caseId: report.caseId,
        message: `Clinical report ${report.reportNumber} signed electronically.`,
        patientId: report.patientId,
      },
    });
    res.json({ report: serializeReport(report) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:reportId/archive", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const current = await reportForAccess(String(req.params.reportId), req.auth!);
    if (!canManageReport(req.auth!, current)) throw new AppError(403, "You can only archive your own reports.", "FORBIDDEN");
    const report = await prisma.clinicalReport.update({
      data: { archivedAt: new Date(), status: "ARCHIVED" },
      where: { id: current.id },
    });
    await createReportVersion(report, req.auth!.id, "Report archived.");
    await prisma.auditLog.create({
      data: {
        action: "REPORT_ARCHIVED",
        actorId: req.auth!.id,
        caseId: report.caseId,
        message: `Clinical report ${report.reportNumber} archived.`,
        patientId: report.patientId,
      },
    });
    res.json({ report: serializeReport(report) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:reportId/versions", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const versions = await prisma.reportVersion.findMany({
      orderBy: { versionNumber: "desc" },
      where: { reportId: report.id },
    });
    res.json({
      versions: versions.map((version) => ({
        authorId: version.authorId,
        createdAt: version.createdAt.toISOString(),
        id: version.id,
        modifications: version.modifications,
        snapshot: version.snapshot,
        versionNumber: version.versionNumber,
      })),
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:reportId/pdf", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const pdf = report.pdfStoragePath && fs.existsSync(report.pdfStoragePath)
      ? fs.readFileSync(report.pdfStoragePath)
      : await buildReportPdf(report, typeof req.query.watermark === "string" ? req.query.watermark : undefined, requestBaseUrl(req));
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${report.reportNumber}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:reportId/html", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const html = report.htmlStoragePath && fs.existsSync(report.htmlStoragePath)
      ? fs.readFileSync(report.htmlStoragePath, "utf8")
      : await buildReportHtml(report, requestBaseUrl(req));
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:reportId/print", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const html = report.htmlStoragePath && fs.existsSync(report.htmlStoragePath)
      ? fs.readFileSync(report.htmlStoragePath, "utf8")
      : await buildReportHtml(report, requestBaseUrl(req));
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(html.replace("</body>", "<script>window.addEventListener('load',()=>window.print());</script></body>"));
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:reportId/save-to-record", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    if (!canManageReport(req.auth!, report)) throw new AppError(403, "You can only save your own reports.", "FORBIDDEN");
    const pdf = await buildReportPdf(report, "ECG Insight", requestBaseUrl(req));
    const persisted = await persistReportArtifacts(report.id, requestBaseUrl(req));
    const storedName = `${report.reportNumber}-${randomUUID()}.pdf`;
    const storagePath = path.join(reportRoot, storedName);
    fs.writeFileSync(storagePath, pdf);
    const document = await prisma.clinicalDocument.create({
      data: {
        caseId: report.caseId,
        category: "OTHER",
        mimeType: "application/pdf",
        originalName: `${report.reportNumber}.pdf`,
        patientId: report.patientId,
        sizeBytes: pdf.byteLength,
        storagePath,
        storedName,
        title: `Clinical Report ${report.reportNumber}`,
        uploadedById: req.auth!.id,
      },
    });
    res.status(201).json({ documentId: document.id, report: serializeReport(persisted) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:reportId/email", validateBody(emailReportSchema), async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    if (req.auth!.role !== "STUDENT" && !canManageReport(req.auth!, report)) {
      throw new AppError(403, "You can only send your own reports.", "FORBIDDEN");
    }
    const emailLog = await prisma.emailLog.create({
      data: {
        metadata: {
          htmlStoragePath: report.htmlStoragePath,
          message: req.body.message ?? "",
          pdfStoragePath: report.pdfStoragePath,
          reportNumber: report.reportNumber,
          verificationUrl: report.verificationUrl,
        },
        recipient: req.body.recipient,
        reportId: report.id,
        senderId: req.auth!.id,
        status: "queued",
      },
    });
    res.status(202).json({
      emailLog: {
        id: emailLog.id,
        recipient: emailLog.recipient,
        senderId: emailLog.senderId,
        sentAt: emailLog.sentAt.toISOString(),
        status: emailLog.status,
      },
    });
  } catch (error) {
    next(error);
  }
});
