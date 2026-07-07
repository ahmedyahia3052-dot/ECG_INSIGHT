import { z } from "zod";

export const medicalAnalysisRequestSchema = z.object({
  measurement: z.object({
    amplitudes: z.object({
      pWaveAmplitudeMv: z.number(),
      qrsAmplitudeMv: z.number(),
      rWaveProgression: z.enum(["normal", "poor", "reverse"]),
      stDeviationMm: z.number(),
      tWaveAmplitudeMv: z.number(),
    }),
    axis: z.object({
      electricalAxisDeg: z.number(),
      frontalPlaneAxisDeg: z.number(),
      meanQrsAxisDeg: z.number(),
    }),
    confidence: z.number().min(0).max(1),
    heartRate: z.number(),
    intervals: z.object({
      pWaveDurationMs: z.number(),
      prIntervalMs: z.number(),
      qrsDurationMs: z.number(),
      qtIntervalMs: z.number(),
      qtcBazettMs: z.number(),
      qtcFridericiaMs: z.number(),
      rrIntervalMs: z.number(),
    }),
    morphology: z.array(z.string()),
    rhythm: z.enum(["regular", "irregular", "sinus_rhythm", "sinus_tachycardia", "sinus_bradycardia"]),
    stDeviation: z.number(),
    measurements: z.array(z.object({
      label: z.string(),
      unit: z.enum(["bpm", "ms", "mm", "mV", "deg"]),
      value: z.number(),
    })).optional(),
  }),
  clinicalContext: z.object({
    symptoms: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    priorDiagnoses: z.array(z.string()).optional(),
    age: z.number().optional(),
    sex: z.enum(["male", "female", "other"]).optional(),
  }).optional(),
  caseId: z.string().optional(),
  patientId: z.string().optional(),
});

export const knowledgeSearchSchema = z.object({
  query: z.string().trim().optional(),
  category: z.enum(["rhythm", "conduction", "ischemia", "electrolyte", "hypertrophy", "channelopathy", "other"]).optional(),
  code: z.string().trim().optional(),
});
