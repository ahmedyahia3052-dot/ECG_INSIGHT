import { z } from "zod";

const measurementIntervalsSchema = z.object({
  pWaveDurationMs: z.number(),
  prIntervalMs: z.number(),
  qrsDurationMs: z.number(),
  qtIntervalMs: z.number(),
  qtcBazettMs: z.number(),
  qtcFridericiaMs: z.number(),
  rrIntervalMs: z.number(),
});

const measurementAmplitudesSchema = z.object({
  pWaveAmplitudeMv: z.number(),
  qrsAmplitudeMv: z.number(),
  rWaveProgression: z.enum(["normal", "poor", "reverse"]),
  stDeviationMm: z.number(),
  tWaveAmplitudeMv: z.number(),
});

const measurementAxisSchema = z.object({
  electricalAxisDeg: z.number(),
  frontalPlaneAxisDeg: z.number(),
  meanQrsAxisDeg: z.number(),
});

export const clinicalMeasurementSchema = z.object({
  amplitudes: measurementAmplitudesSchema,
  axis: measurementAxisSchema,
  confidence: z.number().min(0).max(1),
  heartRate: z.number().int().min(0).max(350),
  intervals: measurementIntervalsSchema,
  measurements: z.array(z.object({
    label: z.string(),
    unit: z.enum(["bpm", "ms", "mm", "mV", "deg"]),
    value: z.number(),
  })).default([]),
  morphology: z.array(z.enum([
    "wide_qrs",
    "narrow_qrs",
    "poor_r_progression",
    "pathological_q_waves",
    "low_voltage",
    "lvh_criteria",
    "rvh_criteria",
  ])).default([]),
  rhythm: z.enum(["regular", "irregular", "sinus_rhythm", "sinus_tachycardia", "sinus_bradycardia"]),
  stDeviation: z.number(),
});

export const interpretRequestSchema = z.object({
  caseId: z.string().trim().min(1).optional(),
  measurement: clinicalMeasurementSchema.optional(),
  persist: z.boolean().default(false),
}).refine((value) => Boolean(value.caseId || value.measurement), {
  message: "Either caseId or measurement must be provided.",
});

export const interpretCaseParamsSchema = z.object({
  caseId: z.string().trim().min(1),
});
