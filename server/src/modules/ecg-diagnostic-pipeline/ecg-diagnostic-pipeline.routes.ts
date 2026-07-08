import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { runEcgDiagnosticCasePipeline } from "./case-orchestrator";
import { diagnosticCasePipelineRequestSchema } from "./schemas";

export const ecgDiagnosticPipelineRouter = Router();

ecgDiagnosticPipelineRouter.use(requireAuth);

ecgDiagnosticPipelineRouter.post("/run/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertResourceAccess(await canAccessCase(caseId, req.auth!));

    const body = diagnosticCasePipelineRequestSchema.parse(req.body ?? {});
    const result = await runEcgDiagnosticCasePipeline({
      actorId: req.auth!.id,
      caseId,
      options: body.options,
    });

    res.status(202).json({
      caseId: result.caseId,
      confidence: result.confidence,
      enterpriseReportId: result.enterpriseReportId,
      generatedReportId: result.generatedReportId,
      performanceMs: result.performanceMs,
      pipelineVersion: result.pipelineVersion,
      primaryDiagnosis: result.artifacts.medicalIntelligence.primaryDiagnosis.label,
      stages: result.stages,
    });
  } catch (error) {
    next(error);
  }
});
