import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../../utils/resource-access";
import {
  compareLongitudinalECG,
  listLongitudinalComparisons,
  patientLongitudinalDashboard,
} from "./longitudinal-ecg.service";

export const longitudinalEcgRouter = Router();

longitudinalEcgRouter.use(requireAuth);

const surveillanceTypeSchema = z.enum(["PRE_EMPLOYMENT", "PERIODIC_EXAMINATION", "RETURN_TO_WORK", "POST_INCIDENT", "EXIT_EXAMINATION"]);

const comparisonSchema = z.object({
  baselineCaseId: z.string().trim().optional(),
  scope: z.enum(["PREVIOUS", "BASELINE", "HISTORICAL"]).default("PREVIOUS"),
  surveillanceType: surveillanceTypeSchema.optional(),
});

longitudinalEcgRouter.post("/cases/:caseId/compare", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const body = comparisonSchema.parse(req.body);
    const comparison = await compareLongitudinalECG({
      baselineCaseId: body.baselineCaseId,
      caseId,
      evaluatedById: req.auth!.id,
      scope: body.scope,
      surveillanceType: body.surveillanceType,
    });
    res.status(201).json({ comparison });
  } catch (error) {
    next(error);
  }
});

longitudinalEcgRouter.get("/cases/:caseId/comparisons", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    res.json({ comparisons: await listLongitudinalComparisons(caseId) });
  } catch (error) {
    next(error);
  }
});

longitudinalEcgRouter.get("/patients/:patientId/dashboard", async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    assertResourceAccess(await canAccessPatient(patientId, req.auth!));
    res.json({ dashboard: await patientLongitudinalDashboard(patientId) });
  } catch (error) {
    next(error);
  }
});

longitudinalEcgRouter.post("/patients/:patientId/surveillance/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessPatient(patientId, req.auth!));
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const body = comparisonSchema.extend({ surveillanceType: surveillanceTypeSchema }).parse(req.body);
    const comparison = await compareLongitudinalECG({
      baselineCaseId: body.baselineCaseId,
      caseId,
      evaluatedById: req.auth!.id,
      scope: body.scope,
      surveillanceType: body.surveillanceType,
    });
    res.status(201).json({ comparison });
  } catch (error) {
    next(error);
  }
});
