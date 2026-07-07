import { Router, type Request } from "express";
import { z } from "zod";

import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  advanceExaminationStep,
  buildExaminationSummary,
  getExaminationSession,
  getOrCreateExaminationSession,
  refreshExaminationQuality,
  reviewExaminationFinding,
  saveExaminationImpression,
  signExaminationSession,
  updateExaminationClinicalInfo,
} from "./examination-session.service";
import type { DoctorFindingReviewStatus, ExaminationStepId } from "./types";

export const examinationWorkflowRouter = Router();
examinationWorkflowRouter.use(requireAuth);

const clinicalInfoSchema = z.object({
  chiefComplaint: z.string().optional(),
  clinicalContext: z.string().optional(),
  history: z.string().optional(),
  medications: z.string().optional(),
  riskFactors: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
});

const advanceSchema = z.object({
  stepId: z.string().optional(),
});

const reviewFindingSchema = z.object({
  findingId: z.string().min(1),
  label: z.string().min(1),
  modifiedText: z.string().optional(),
  reason: z.string().optional(),
  status: z.enum(["pending", "accepted", "rejected", "modified"]),
});

const impressionSchema = z.object({
  finalDiagnosis: z.string().optional(),
  finalImpression: z.string().optional(),
  finalRecommendations: z.array(z.string()).optional(),
});

const qualitySchema = z.object({
  leadCount: z.number().int().optional(),
  measurementCount: z.number().int().optional(),
});

async function resolveCase(caseKey: string) {
  const ecgCase = await prisma.eCGCase.findFirst({
    where: { OR: [{ id: caseKey }, { caseId: caseKey }, { caseNumber: caseKey }] },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return ecgCase;
}

function actorFromReq(req: Request) {
  return {
    id: req.auth!.id,
    name: `Clinician ${req.auth!.id.slice(0, 8)}`,
  };
}

examinationWorkflowRouter.get("/:caseId/examination/session", async (req, res, next) => {
  try {
    const ecgCase = await resolveCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const session = await getOrCreateExaminationSession(ecgCase.id, actorFromReq(req));
    res.json({ session, summary: buildExaminationSummary(session) });
  } catch (error) {
    next(error);
  }
});

examinationWorkflowRouter.put("/:caseId/examination/clinical-info", requireRole("DOCTOR"), validateBody(clinicalInfoSchema), async (req, res, next) => {
  try {
    const ecgCase = await resolveCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const session = await updateExaminationClinicalInfo(ecgCase.id, actorFromReq(req), req.body);
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

examinationWorkflowRouter.post("/:caseId/examination/advance", requireRole("DOCTOR"), validateBody(advanceSchema), async (req, res, next) => {
  try {
    const ecgCase = await resolveCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const session = await advanceExaminationStep(
      ecgCase.id,
      actorFromReq(req),
      req.body.stepId as ExaminationStepId | undefined,
    );
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

examinationWorkflowRouter.post("/:caseId/examination/quality", requireRole("DOCTOR"), validateBody(qualitySchema), async (req, res, next) => {
  try {
    const ecgCase = await resolveCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const session = await refreshExaminationQuality(ecgCase.id, actorFromReq(req), req.body);
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

examinationWorkflowRouter.post("/:caseId/examination/findings/review", requireRole("DOCTOR"), validateBody(reviewFindingSchema), async (req, res, next) => {
  try {
    const ecgCase = await resolveCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const session = await reviewExaminationFinding(ecgCase.id, actorFromReq(req), {
      ...req.body,
      status: req.body.status as DoctorFindingReviewStatus,
    });
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

examinationWorkflowRouter.post("/:caseId/examination/impression", requireRole("DOCTOR"), validateBody(impressionSchema), async (req, res, next) => {
  try {
    const ecgCase = await resolveCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const session = await saveExaminationImpression(ecgCase.id, actorFromReq(req), req.body);
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

examinationWorkflowRouter.post("/:caseId/examination/sign", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await resolveCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const session = await signExaminationSession(ecgCase.id, actorFromReq(req));
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

examinationWorkflowRouter.get("/:caseId/examination/summary", async (req, res, next) => {
  try {
    const ecgCase = await resolveCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const session = await getExaminationSession(ecgCase.id);
    if (!session) {
      res.json({ summary: null });
      return;
    }
    res.json({ session, summary: buildExaminationSummary(session) });
  } catch (error) {
    next(error);
  }
});
