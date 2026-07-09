import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import {
  getClinicalMeasurementEngineStatus,
  getClinicalMeasurementSnapshot,
  runAutoClinicalMeasurement,
  saveManualClinicalMeasurement,
} from "./service";
import { caseIdParamsSchema, manualMeasurementBodySchema } from "./schemas";

export const clinicalMeasurementEngineRouter = Router();

clinicalMeasurementEngineRouter.get("/health", (_req, res) => {
  res.json(getClinicalMeasurementEngineStatus());
});

clinicalMeasurementEngineRouter.use(requireAuth);

clinicalMeasurementEngineRouter.get("/cases/:caseId", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json(await getClinicalMeasurementSnapshot(params.caseId, req.auth!));
  } catch (error) {
    next(error);
  }
});

clinicalMeasurementEngineRouter.post(
  "/cases/:caseId/auto",
  requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const params = caseIdParamsSchema.parse(req.params);
      const result = await runAutoClinicalMeasurement(params.caseId, req.auth!);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

clinicalMeasurementEngineRouter.put(
  "/cases/:caseId/manual",
  requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"),
  validateBody(manualMeasurementBodySchema),
  async (req, res, next) => {
    try {
      const params = caseIdParamsSchema.parse(req.params);
      const result = await saveManualClinicalMeasurement(params.caseId, req.auth!, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);
