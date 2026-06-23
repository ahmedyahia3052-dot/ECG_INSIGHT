import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
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
