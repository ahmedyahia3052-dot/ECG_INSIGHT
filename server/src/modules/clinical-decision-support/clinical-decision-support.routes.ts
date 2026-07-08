import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { prisma } from "../../config/prisma";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  acceptRecommendation,
  generateFollowUpForCase,
  getFollowUpForCase,
  listRecommendationsForCase,
  regenerateRecommendationsForCase,
  rejectRecommendation,
} from "./clinical-decision-support.service";
import { rejectRecommendationSchema } from "./schemas";

export const clinicalDecisionSupportRouter = Router();

clinicalDecisionSupportRouter.use(requireAuth);

async function assertCaseAccess(caseId: string, auth: Parameters<typeof canAccessCase>[1]) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertResourceAccess(await canAccessCase(caseId, auth));
  return ecgCase;
}

clinicalDecisionSupportRouter.get("/recommendations/:caseId", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    await assertCaseAccess(caseId, req.auth!);
    const recommendations = await listRecommendationsForCase(caseId);
    res.json({ caseId, engineVersion: "sprint65-v1", recommendations });
  } catch (error) {
    next(error);
  }
});

clinicalDecisionSupportRouter.post("/recommendations/regenerate/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    await assertCaseAccess(caseId, req.auth!);
    const recommendations = await regenerateRecommendationsForCase(caseId, req.auth!.id);
    res.status(201).json({ caseId, engineVersion: "sprint65-v1", recommendations });
  } catch (error) {
    next(error);
  }
});

clinicalDecisionSupportRouter.post("/recommendations/:recommendationId/accept", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const recommendation = await acceptRecommendation(String(req.params.recommendationId), req.auth!.id);
    res.json({ recommendation });
  } catch (error) {
    next(error);
  }
});

clinicalDecisionSupportRouter.post("/recommendations/:recommendationId/reject", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = rejectRecommendationSchema.parse(req.body ?? {});
    const recommendation = await rejectRecommendation(String(req.params.recommendationId), req.auth!.id, body.rejectionReason);
    res.json({ recommendation });
  } catch (error) {
    next(error);
  }
});

clinicalDecisionSupportRouter.get("/followup/:caseId", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    await assertCaseAccess(caseId, req.auth!);
    const followUp = await getFollowUpForCase(caseId);
    res.json({ caseId, followUp, engineVersion: "sprint65-v1" });
  } catch (error) {
    next(error);
  }
});

clinicalDecisionSupportRouter.post("/followup/generate/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    await assertCaseAccess(caseId, req.auth!);
    const followUp = await generateFollowUpForCase(caseId, req.auth!.id);
    res.status(201).json({ caseId, followUp, engineVersion: "sprint65-v1" });
  } catch (error) {
    next(error);
  }
});
