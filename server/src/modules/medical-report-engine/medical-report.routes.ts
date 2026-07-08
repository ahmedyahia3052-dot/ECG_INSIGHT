import { Router } from "express";
import type { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase, canAccessOwnedResource, canAccessPatient } from "../../utils/resource-access";
import { AppError } from "../../middleware/error";
import {
  createDraftMedicalReport,
  exportReportAsFhir,
  exportReportAsJson,
  finalizeMedicalReport,
  getMedicalReport,
  getMedicalReportEngineHealth,
  getMedicalReportPdfArchitecture,
  getMedicalReportPrintLayout,
  getMedicalReportVersions,
  listMedicalReports,
  signMedicalReport,
  submitMedicalReportForReview,
  updateDraftMedicalReport,
  verifyMedicalReportQr,
} from "./medical-report.service";
import { findReportById } from "./repository";
import {
  createDraftReportSchema,
  reportListQuerySchema,
  signReportSchema,
  updateDraftReportSchema,
  verifyReportQuerySchema,
} from "./schemas";

export const medicalReportEngineRouter = Router();

function requestBaseUrl(req: { get(header: string): string | undefined; protocol: string }) {
  const host = req.get("host");
  return host ? `${req.protocol}://${host}` : "";
}

medicalReportEngineRouter.get("/health", (_req, res) => {
  res.json(getMedicalReportEngineHealth());
});

medicalReportEngineRouter.get("/verify/:reportUuid", validateQuery(verifyReportQuerySchema), async (req, res, next) => {
  try {
    const query = verifyReportQuerySchema.parse(req.query);
    res.json({
      verification: await verifyMedicalReportQr(String(req.params.reportUuid), query.token),
    });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.use(requireAuth);

async function reportForAccess(reportId: string, auth: { id: string; role: Role }) {
  const report = await findReportById(reportId);
  if (!report) throw new AppError(404, "Medical report not found.", "MEDICAL_REPORT_NOT_FOUND");
  assertResourceAccess(
    canAccessOwnedResource(auth, [report.authorId, report.finalizedById, report.signedById]) ||
      (await canAccessPatient(report.patientId, auth)) ||
      (await canAccessCase(report.caseId, auth)),
    "You do not have access to this medical report.",
  );
  return report;
}

medicalReportEngineRouter.post("/drafts", requireRole("DOCTOR"), validateBody(createDraftReportSchema), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(req.body.caseId, req.auth!));
    const report = await createDraftMedicalReport({
      authorId: req.auth!.id,
      baseUrl: requestBaseUrl(req),
      caseId: req.body.caseId,
      clinicalIndication: req.body.clinicalIndication,
      reportType: req.body.reportType,
      templateSlug: req.body.templateSlug,
    });
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.get("/", validateQuery(reportListQuerySchema), async (req, res, next) => {
  try {
    const query = reportListQuerySchema.parse(req.query);
    if (query.caseId) assertResourceAccess(await canAccessCase(query.caseId, req.auth!));
    if (query.patientId) assertResourceAccess(await canAccessPatient(query.patientId, req.auth!));
    const reports = await listMedicalReports(query);
    res.json({ count: reports.length, reports });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.get("/:reportId", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const report = await getMedicalReport(String(req.params.reportId), requestBaseUrl(req));
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.patch("/:reportId", validateBody(updateDraftReportSchema), async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const report = await updateDraftMedicalReport(String(req.params.reportId), req.body, req.auth!);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.post("/:reportId/submit-review", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const report = await submitMedicalReportForReview(String(req.params.reportId), req.auth!.id);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.post("/:reportId/finalize", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const report = await finalizeMedicalReport(String(req.params.reportId), req.auth!, requestBaseUrl(req));
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.post("/:reportId/sign", requireRole("DOCTOR"), validateBody(signReportSchema), async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const report = await signMedicalReport(String(req.params.reportId), req.auth!, req.body.signaturePath);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.get("/:reportId/versions", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const versions = await getMedicalReportVersions(String(req.params.reportId));
    res.json({ count: versions.length, versions });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.get("/:reportId/export/json", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportReportAsJson(String(req.params.reportId), requestBaseUrl(req));
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.get("/:reportId/export/fhir", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportReportAsFhir(String(req.params.reportId), requestBaseUrl(req));
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.get("/:reportId/print", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const print = await getMedicalReportPrintLayout(String(req.params.reportId), requestBaseUrl(req));
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(print.html);
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.get("/:reportId/print-layout", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const print = await getMedicalReportPrintLayout(String(req.params.reportId), requestBaseUrl(req));
    res.json({ layout: print.layout, reportNumber: print.reportNumber });
  } catch (error) {
    next(error);
  }
});

medicalReportEngineRouter.get("/:reportId/pdf-architecture", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const architecture = await getMedicalReportPdfArchitecture(String(req.params.reportId));
    res.json({ architecture });
  } catch (error) {
    next(error);
  }
});
