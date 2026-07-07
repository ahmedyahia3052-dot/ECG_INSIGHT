import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import {
  assessRiskForDiagnosis,
  buildDifferentialForDiagnosisCode,
  buildDifferentialForFinding,
  getDiagnosisByCode,
  getGuidelineById,
  getMeasurementReference,
  getMicHealth,
  getRecommendationsForDiagnosis,
  listArrhythmias,
  listDiagnoses,
  listIschemiaEntities,
  listMeasurementReferences,
  listRiskRules,
  lookupGuidelines,
} from "./mic-core";
import { micDiagnosisQuerySchema, micDifferentialRequestSchema, micGuidelineQuerySchema } from "./mic.schemas";
import { getMicSeedStats, seedMicCoreDatabase } from "./persist/seed";

export const micRouter = Router();

micRouter.use(requireAuth);

micRouter.get("/health", (_req, res) => {
  res.json({ ok: true, ...getMicHealth() });
});

micRouter.get("/diagnoses", (req, res) => {
  const query = micDiagnosisQuerySchema.parse(req.query);
  res.json({ entries: listDiagnoses(query) });
});

micRouter.get("/diagnoses/:code", (req, res) => {
  const entry = getDiagnosisByCode(String(req.params.code));
  if (!entry) {
    res.status(404).json({ error: "Diagnosis not found in MIC catalog" });
    return;
  }
  res.json({ entry });
});

micRouter.get("/arrhythmias", (_req, res) => {
  res.json({ entries: listArrhythmias() });
});

micRouter.get("/ischemia", (_req, res) => {
  res.json({ entries: listIschemiaEntities() });
});

micRouter.get("/references", (_req, res) => {
  res.json({ entries: listMeasurementReferences() });
});

micRouter.get("/references/:parameter", (req, res) => {
  const entry = getMeasurementReference(String(req.params.parameter));
  if (!entry) {
    res.status(404).json({ error: "Measurement reference not found" });
    return;
  }
  res.json({ entry });
});

micRouter.get("/recommendations/:code", (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const diagnosis = getDiagnosisByCode(code);
  if (!diagnosis) {
    res.status(404).json({ error: "Diagnosis not found for recommendation lookup" });
    return;
  }
  res.json({ diagnosisCode: code, recommendations: getRecommendationsForDiagnosis(code) });
});

micRouter.post("/differential", (req, res) => {
  const body = micDifferentialRequestSchema.parse(req.body);
  res.json({
    finding: body.finding,
    differential: buildDifferentialForFinding(body.finding, body.limit ?? 5),
  });
});

micRouter.get("/differential/:code", (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const diagnosis = getDiagnosisByCode(code);
  if (!diagnosis) {
    res.status(404).json({ error: "Diagnosis not found for differential lookup" });
    return;
  }
  res.json({ diagnosisCode: code, differential: buildDifferentialForDiagnosisCode(code) });
});

micRouter.get("/risk/:code", (req, res) => {
  const assessment = assessRiskForDiagnosis(String(req.params.code));
  if (!assessment) {
    res.status(404).json({ error: "Diagnosis not found for risk lookup" });
    return;
  }
  res.json({ assessment });
});

micRouter.get("/risk-rules", (_req, res) => {
  res.json({ rules: listRiskRules() });
});

micRouter.get("/guidelines", (req, res) => {
  const query = micGuidelineQuerySchema.parse(req.query);
  res.json({ entries: lookupGuidelines(query) });
});

micRouter.get("/guidelines/:id", (req, res) => {
  const entry = getGuidelineById(String(req.params.id));
  if (!entry) {
    res.status(404).json({ error: "Guideline not found" });
    return;
  }
  res.json({ entry });
});

micRouter.post("/seed", async (_req, res, next) => {
  try {
    const stats = await seedMicCoreDatabase();
    res.status(201).json({ ok: true, stats });
  } catch (error) {
    next(error);
  }
});

micRouter.get("/seed/stats", async (_req, res, next) => {
  try {
    const stats = await getMicSeedStats();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});
