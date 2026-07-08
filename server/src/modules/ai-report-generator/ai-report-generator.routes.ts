import { Router } from "express";
import type { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../../utils/resource-access";
import {
  generateClinicalReport,
  getClinicalGeneratedReport,
  listClinicalGeneratedReportHistory,
  regenerateClinicalReport,
  serializeClinicalGeneratedReport,
} from "./ai-report-generator.service";
import { generateClinicalReportSchema, regenerateClinicalReportSchema } from "./schemas";
import { AI_REPORT_GENERATOR_VERSION } from "./types";

export const aiReportGeneratorRouter = Router();

aiReportGeneratorRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ai-report-generator",
    version: AI_REPORT_GENERATOR_VERSION,
  });
});

aiReportGeneratorRouter.use(requireAuth);

async function reportForAccess(reportId: string, auth: { id: string; role: Role }) {
  const report = await getClinicalGeneratedReport(reportId);
  if (!report) throw new AppError(404, "Clinical generated report not found.", "REPORT_NOT_FOUND");
  assertResourceAccess(
    (await canAccessCase(report.caseId, auth)) || (await canAccessPatient(report.patientId, auth)),
    "You do not have access to this report.",
  );
  return report;
}

aiReportGeneratorRouter.post(
  "/report/generate",
  requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"),
  validateBody(generateClinicalReportSchema),
  async (req, res, next) => {
    try {
      assertResourceAccess(await canAccessCase(req.body.caseId, req.auth!));
      const result = await generateClinicalReport({
        caseId: req.body.caseId,
        clinicalIndication: req.body.clinicalIndication,
        generatedById: req.auth!.id,
      });
      res.status(201).json({
        report: serializeClinicalGeneratedReport(result.report),
      });
    } catch (error) {
      next(error);
    }
  },
);

aiReportGeneratorRouter.get("/report/:id", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.id), req.auth!);
    res.json({ report: serializeClinicalGeneratedReport(report) });
  } catch (error) {
    next(error);
  }
});

aiReportGeneratorRouter.get("/report/:id/history", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.id), req.auth!);
    const history = await listClinicalGeneratedReportHistory(String(req.params.id));
    res.json(history);
  } catch (error) {
    next(error);
  }
});

aiReportGeneratorRouter.post(
  "/report/:id/regenerate",
  requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"),
  validateBody(regenerateClinicalReportSchema),
  async (req, res, next) => {
    try {
      await reportForAccess(String(req.params.id), req.auth!);
      const result = await regenerateClinicalReport(
        String(req.params.id),
        req.auth!.id,
        req.body.clinicalIndication,
      );
      res.status(201).json({
        report: serializeClinicalGeneratedReport(result.report),
      });
    } catch (error) {
      next(error);
    }
  },
);
