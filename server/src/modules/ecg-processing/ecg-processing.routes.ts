import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import { exportDigitalEcg, getDigitalEcg, reconstructCaseEcg } from "./ecg-digitization.service";
import {
  getProcessedWaveform,
  latestMeasurement,
  processCaseWaveform,
  serializeMeasurement,
} from "./ecg-processing.service";

export const ecgProcessingRouter = Router();

ecgProcessingRouter.use(requireAuth);

ecgProcessingRouter.post("/process/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const measurement = await processCaseWaveform(String(req.params.caseId), req.auth!.id);
    res.status(202).json({ measurement: serializeMeasurement(measurement) });
  } catch (error) {
    next(error);
  }
});

ecgProcessingRouter.get("/measurements/:caseId", async (req, res, next) => {
  try {
    const measurement = await latestMeasurement(String(req.params.caseId));
    res.json({ measurement: measurement ? serializeMeasurement(measurement) : null });
  } catch (error) {
    next(error);
  }
});

ecgProcessingRouter.get("/waveform/:caseId", async (req, res, next) => {
  try {
    res.json({ waveform: await getProcessedWaveform(String(req.params.caseId)) });
  } catch (error) {
    if (error instanceof AppError && error.code === "WAVEFORM_NOT_FOUND") {
      res.json({ waveform: null });
      return;
    }
    next(error);
  }
});

const calibrationOverrideSchema = z.object({
  gainMmPerMv: z.union([z.literal(5), z.literal(10), z.literal(20)]).optional(),
  paperSpeedMmPerSec: z.union([z.literal(25), z.literal(50)]).optional(),
});

ecgProcessingRouter.post("/digital/:caseId/reconstruct", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const override = calibrationOverrideSchema.parse(req.body);
    res.status(202).json({ digitalEcg: await reconstructCaseEcg(caseId, req.auth!.id, override) });
  } catch (error) {
    next(error);
  }
});

ecgProcessingRouter.get("/digital/:caseId", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    res.json({ digitalEcg: await getDigitalEcg(caseId) });
  } catch (error) {
    if (error instanceof AppError && error.code === "ECG_FILE_NOT_FOUND") {
      res.json({
        digitalEcg: {
          annotations: [],
          calibration: { confidence: 0, gainMmPerMv: 10, gridDetected: false, paperSpeedMmPerSec: 25 },
          durationSeconds: 0,
          fallbackReason: "Digital waveform reconstruction unavailable.",
          leads: [],
          measurements: { prIntervalMs: 0, qrsDurationMs: 0, qtIntervalMs: 0, rrIntervalMs: 0 },
          status: "fallback",
        },
      });
      return;
    }
    next(error);
  }
});

ecgProcessingRouter.get("/digital/:caseId/export/:format", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    const format = z.enum(["json", "pdf", "png", "svg"]).parse(req.params.format);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const exported = exportDigitalEcg(await getDigitalEcg(caseId), format);
    res.setHeader("content-type", exported.contentType);
    res.setHeader("content-disposition", `attachment; filename="${exported.fileName}"`);
    res.send(exported.data);
  } catch (error) {
    next(error);
  }
});
