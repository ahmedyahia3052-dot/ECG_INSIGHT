import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { runAnalysisNow, serializeAnalysis } from "../../ai/ai.service";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { ensureClinicalReportForCase, serializeReport } from "../reports/reports.service";
import { assertCanRunAnalysis, recordAnalysisUsage } from "../../subscriptions/monetization.service";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../../utils/resource-access";
import { exportDigitalEcg, getDigitalEcg, reconstructCaseEcg } from "./ecg-digitization.service";
import { analyzeEcgImage, getEcgImageAnalysisResults } from "./ecg-image-analysis.service";
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

const imageAnalysisSchema = z.object({
  caseId: z.string().trim().optional(),
  ecgFileId: z.string().trim().optional(),
}).refine((body) => body.caseId || body.ecgFileId, {
  message: "caseId or ecgFileId is required.",
});

const realAiAnalysisSchema = z.object({
  caseId: z.string().trim().min(1),
});

ecgProcessingRouter.post("/analyze", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = imageAnalysisSchema.parse(req.body);
    if (body.caseId) assertResourceAccess(await canAccessCase(body.caseId, req.auth!));
    if (body.ecgFileId) {
      const file = await prisma.eCGFile.findUnique({ where: { id: body.ecgFileId } });
      if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
      assertResourceAccess(file.caseId ? await canAccessCase(file.caseId, req.auth!) : await canAccessPatient(file.patientId, req.auth!));
    }
    const result = await analyzeEcgImage({ actorId: req.auth!.id, caseId: body.caseId, ecgFileId: body.ecgFileId });
    res.status(202).json({ result });
  } catch (error) {
    next(error);
  }
});

ecgProcessingRouter.post("/analyze-real-ai", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = realAiAnalysisSchema.parse(req.body);
    assertResourceAccess(await canAccessCase(body.caseId, req.auth!));
    await assertCanRunAnalysis(req.auth!.id);
    const analysis = await runAnalysisNow(body.caseId, req.auth!.id);
    if (!analysis || analysis.status === "FAILED") throw new AppError(500, "Real AI ECG analysis failed.", "REAL_AI_ANALYSIS_FAILED");
    await recordAnalysisUsage(req.auth!.id, { analysisId: analysis.id, caseId: body.caseId });
    const report = await ensureClinicalReportForCase(body.caseId, req.auth!.id);
    res.status(201).json({
      analysis: serializeAnalysis(analysis),
      report: serializeReport(report),
    });
  } catch (error) {
    next(error);
  }
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

ecgProcessingRouter.get("/:id/results", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const results = await getEcgImageAnalysisResults(id);
    if (results.case?.id) assertResourceAccess(await canAccessCase(results.case.id, req.auth!));
    else if (results.patientId) assertResourceAccess(await canAccessPatient(results.patientId, req.auth!));
    res.json({ results });
  } catch (error) {
    next(error);
  }
});
