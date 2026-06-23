import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  calculatePatientTrends,
  calculateRiskAssessments,
  ClinicalAssistantService,
  generateClinicalAlerts,
  populationAnalytics,
} from "./clinical-intelligence.service";

export const assistantRouter = Router();
export const riskRouter = Router();
export const trendsRouter = Router();
export const populationAnalyticsRouter = Router();
export const clinicalAlertsRouter = Router();

const patientBodySchema = z.object({
  patientId: z.string().trim().min(1),
});

assistantRouter.use(requireAuth);
riskRouter.use(requireAuth);
trendsRouter.use(requireAuth);
populationAnalyticsRouter.use(requireAuth);
clinicalAlertsRouter.use(requireAuth);

assistantRouter.post("/chat", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = patientBodySchema.extend({ question: z.string().trim().min(1) }).parse(req.body);
    const conversation = await new ClinicalAssistantService().answer(body.patientId, req.auth!.id, body.question);
    res.status(201).json({ conversation });
  } catch (error) {
    next(error);
  }
});

riskRouter.post("/calculate", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = patientBodySchema.parse(req.body);
    const assessments = await calculateRiskAssessments(body.patientId, req.auth!.id);
    res.status(201).json({ assessments });
  } catch (error) {
    next(error);
  }
});

trendsRouter.get("/", async (req, res, next) => {
  try {
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const trends = await prisma.patientTrend.findMany({
      orderBy: { measuredAt: "desc" },
      take: 100,
      where: { patientId },
    });
    res.json({ trends });
  } catch (error) {
    next(error);
  }
});

trendsRouter.post("/", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = patientBodySchema.parse(req.body);
    const trends = await calculatePatientTrends(body.patientId);
    res.status(201).json({ trends });
  } catch (error) {
    next(error);
  }
});

populationAnalyticsRouter.get("/population", requireRole("ADMIN", "SUPER_ADMIN", "DOCTOR"), async (_req, res, next) => {
  try {
    res.json({ analytics: await populationAnalytics() });
  } catch (error) {
    next(error);
  }
});

clinicalAlertsRouter.get("/", async (req, res, next) => {
  try {
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const alerts = await prisma.clinicalAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: {
        patientId,
        ...(status && ["OPEN", "ACKNOWLEDGED", "RESOLVED"].includes(status) ? { status: status as "OPEN" | "ACKNOWLEDGED" | "RESOLVED" } : {}),
      },
    });
    res.json({ alerts });
  } catch (error) {
    next(error);
  }
});

clinicalAlertsRouter.post("/", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({ patientId: z.string().trim().optional() }).parse(req.body);
    const alerts = await generateClinicalAlerts(req.auth!.id, body.patientId);
    res.status(201).json({ alerts });
  } catch (error) {
    next(error);
  }
});
