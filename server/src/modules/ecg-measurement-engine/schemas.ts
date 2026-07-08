import { z } from "zod";

export const measureEngineInputSchema = z.object({
  gainMmPerMv: z.union([z.literal(5), z.literal(10), z.literal(20)]).optional(),
  paperSpeedMmPerSec: z.union([z.literal(25), z.literal(50)]).optional(),
});

export const measurementBundleDtoSchema = z.object({
  amplitudes: z.object({
    pWaveAmplitudeMv: z.number(),
    qrsAmplitudeMv: z.number(),
    rWaveAmplitudeMv: z.number(),
    sWaveAmplitudeMv: z.number(),
    tWaveAmplitudeMv: z.number(),
    voltageMv: z.number(),
  }),
  axis: z.object({
    electricalAxisDeg: z.number(),
    meanElectricalAxisDeg: z.number(),
    pAxisDeg: z.number(),
    qrsAxisDeg: z.number(),
    tAxisDeg: z.number(),
  }),
  bundleBranch: z.object({
    patterns: z.array(z.string()),
    qrsDurationMs: z.number(),
  }),
  heartRate: z.object({
    heartRateBpm: z.number(),
    rrIntervalMs: z.number(),
  }),
  intervals: z.object({
    pDurationMs: z.number(),
    prIntervalMs: z.number(),
    qrsDurationMs: z.number(),
    qtDispersionMs: z.number(),
    qtIntervalMs: z.number(),
    qtcBazettMs: z.number(),
    qtcFridericiaMs: z.number(),
  }),
  progression: z.object({
    rProgression: z.enum(["normal", "poor", "reverse"]),
    transitionZone: z.string(),
  }),
  stSegment: z.object({
    jPointMm: z.number(),
    stDepressionMm: z.number(),
    stDeviationMm: z.number(),
    stElevationMm: z.number(),
  }),
  voltageCriteria: z.object({
    lowVoltageLimbLeads: z.boolean(),
    lvhVoltageCriteria: z.boolean(),
    rvhVoltageCriteria: z.boolean(),
  }),
});

export const measurementEngineResultSchema = z.object({
  bundle: measurementBundleDtoSchema,
  confidence: z.number().min(0).max(1),
  engineVersion: z.literal("sprint59-v1"),
  performanceMs: z.number().nonnegative(),
  validation: z.object({
    abnormalCount: z.number().nonnegative(),
    issues: z.array(
      z.object({
        code: z.string(),
        field: z.string(),
        message: z.string(),
        severity: z.enum(["normal", "borderline", "abnormal", "critical"]),
        value: z.number(),
      }),
    ),
    valid: z.boolean(),
  }),
});
