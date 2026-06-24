import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase, canAccessOwnedResource, canAccessPatient } from "../../utils/resource-access";
import {
  assertCanEditReport,
  assertCanFinalize,
  buildReportPdf,
  canManageReport,
  createReportVersion,
  generateClinicalReport,
  serializeReport,
  statusFromApi,
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

reportsRouter.use(requireAuth);

function reportInclude() {
  return {
    author: { select: { email: true, id: true, name: true, specialization: true } },
    emailLogs: { orderBy: { sentAt: "desc" } },
    versions: { orderBy: { versionNumber: "desc" } },
  } satisfies Prisma.ClinicalReportInclude;
}

async function reportForAccess(reportId: string, auth: { id: string; role: "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "STUDENT" }) {
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
    const caseId = typeof req.query.caseId === "string" ? req.query.caseId : undefined;
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const where: Prisma.ClinicalReportWhereInput = {
      caseId,
      patientId,
      ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN"
        ? {}
        : {
            OR: [
              { authorId: req.auth!.id },
              { finalizedById: req.auth!.id },
              { signedById: req.auth!.id },
              { case: { OR: [{ assignedDoctorId: req.auth!.id }, { uploadedById: req.auth!.id }] } },
              { patient: { auditLogs: { some: { action: "PATIENT_CREATED", actorId: req.auth!.id } } } },
            ],
          }),
    };
    const reports = await prisma.clinicalReport.findMany({
      include: reportInclude(),
      orderBy: { updatedAt: "desc" },
      where,
    });
    res.json({ reports: reports.map(serializeReport) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/cases/:caseId/generate", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(String(req.params.caseId), req.auth!));
    const report = await generateClinicalReport(String(req.params.caseId), req.auth!.id);
    res.status(201).json({ report: serializeReport(report) });
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
    const report = await prisma.clinicalReport.update({
      data: {
        finalizedAt: new Date(),
        finalizedById: req.auth!.id,
        status: "FINALIZED",
      },
      where: { id: current.id },
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
    const pdf = buildReportPdf(report, typeof req.query.watermark === "string" ? req.query.watermark : undefined);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${report.reportNumber}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:reportId/save-to-record", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    if (!canManageReport(req.auth!, report)) throw new AppError(403, "You can only save your own reports.", "FORBIDDEN");
    const pdf = buildReportPdf(report);
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
    res.status(201).json({ documentId: document.id });
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
        metadata: { message: req.body.message ?? "", reportNumber: report.reportNumber },
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
