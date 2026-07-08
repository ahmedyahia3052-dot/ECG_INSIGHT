import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  getCaseAlertAuditTrail,
  getCaseAlerts,
  getCaseRiskAssessment,
  recalculateCaseRisk,
} from "./clinical-alerts-risk.service";
import { CLINICAL_ALERTS_RISK_ENGINE_VERSION } from "./types";

export const clinicalAlertsRiskEngineRouter = Router();

clinicalAlertsRiskEngineRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "clinical-alerts-risk-engine",
    version: CLINICAL_ALERTS_RISK_ENGINE_VERSION,
  });
});

clinicalAlertsRiskEngineRouter.use(requireAuth);

clinicalAlertsRiskEngineRouter.get("/alerts/:caseId", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const alerts = await getCaseAlerts(caseId, req.auth!.id);
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    next(error);
  }
});

clinicalAlertsRiskEngineRouter.get("/risk/:caseId", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const assessment = await getCaseRiskAssessment(caseId, req.auth!.id);
    res.json({ assessment });
  } catch (error) {
    next(error);
  }
});

clinicalAlertsRiskEngineRouter.post(
  "/risk/recalculate/:caseId",
  requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const caseId = String(req.params.caseId);
      assertResourceAccess(await canAccessCase(caseId, req.auth!));
      const result = await recalculateCaseRisk(caseId, req.auth!.id);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

clinicalAlertsRiskEngineRouter.get("/audit/:caseId", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const events = await getCaseAlertAuditTrail(caseId);
    res.json({ events });
  } catch (error) {
    next(error);
  }
});
