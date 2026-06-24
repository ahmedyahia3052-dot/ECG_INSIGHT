import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { assertCanRunAnalysis, recordAnalysisUsage } from "../subscriptions/monetization.service";
import { reconstructCaseEcg } from "../modules/ecg-processing/ecg-digitization.service";
import { assertResourceAccess, canAccessCase } from "../utils/resource-access";
import { aiHistorySchema } from "./schemas";
import {
  fromApiAnalysisStatus,
  fromApiSeverity,
  getLatestAnalysis,
  getStatistics,
  queueAnalysis,
  serializeAnalysis,
} from "./ai.service";

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post("/analyze/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(String(req.params.caseId), req.auth!));
    await assertCanRunAnalysis(req.auth!.id);
    const analysis = await queueAnalysis(String(req.params.caseId), req.auth!.id);
    await recordAnalysisUsage(req.auth!.id, { caseId: String(req.params.caseId), analysisId: analysis.id });
    await reconstructCaseEcg(String(req.params.caseId), req.auth!.id).catch(() => null);
    res.status(202).json({ analysis: serializeAnalysis(analysis) });
  } catch (error) {
    next(error);
  }
});

aiRouter.get("/result/:caseId", async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(String(req.params.caseId), req.auth!));
    const analysis = await getLatestAnalysis(String(req.params.caseId));
    res.json({ analysis: analysis ? serializeAnalysis(analysis) : null });
  } catch (error) {
    next(error);
  }
});

aiRouter.get("/statistics", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    res.json({ statistics: await getStatistics() });
  } catch (error) {
    next(error);
  }
});

aiRouter.get("/history", async (req, res, next) => {
  try {
    const query = aiHistorySchema.parse(req.query);
    const where: Prisma.AIAnalysisWhereInput = {};
    if (query.status) where.status = fromApiAnalysisStatus(query.status);
    if (query.severity) where.severity = fromApiSeverity(query.severity);

    const [total, analyses] = await Promise.all([
      prisma.aIAnalysis.count({ where }),
      prisma.aIAnalysis.findMany({
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);

    res.json({
      analyses: analyses.map(serializeAnalysis),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    next(error);
  }
});
