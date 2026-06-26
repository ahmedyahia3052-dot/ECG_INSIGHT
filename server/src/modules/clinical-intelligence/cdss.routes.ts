import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import { evaluateCDSS, listCDSSRules, listCDSSRuns, upsertCDSSRule } from "./cdss.service";

export const cdssRouter = Router();

cdssRouter.use(requireAuth);

const ruleSchema = z.object({
  category: z.enum(["RHYTHM", "QT_INTERVAL", "ISCHEMIA", "ARRHYTHMIA", "CONDUCTION", "RISK", "OCCUPATIONAL_FITNESS", "RECOMMENDATION", "RED_FLAG", "TREND"]),
  description: z.string().trim().min(1),
  enabled: z.boolean().optional(),
  evidenceLevel: z.string().trim().optional(),
  name: z.string().trim().min(1),
  ruleId: z.string().trim().min(1),
  thresholdJson: z.record(z.string(), z.unknown()).optional(),
  version: z.string().trim().optional(),
});

cdssRouter.get("/rules", async (_req, res, next) => {
  try {
    res.json({ rules: await listCDSSRules() });
  } catch (error) {
    next(error);
  }
});

cdssRouter.put("/rules/:ruleId", requireRole("ADMIN", "SUPER_ADMIN"), async (req, res, next) => {
  try {
    const body = ruleSchema.parse({ ...req.body, ruleId: String(req.params.ruleId) });
    const rule = await upsertCDSSRule(body, req.auth!.id);
    res.json({ rule });
  } catch (error) {
    next(error);
  }
});

cdssRouter.get("/cases/:caseId/runs", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    res.json({ runs: await listCDSSRuns(caseId) });
  } catch (error) {
    next(error);
  }
});

cdssRouter.post("/cases/:caseId/evaluate", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const run = await evaluateCDSS(caseId, req.auth!.id);
    res.status(201).json({ run });
  } catch (error) {
    next(error);
  }
});
