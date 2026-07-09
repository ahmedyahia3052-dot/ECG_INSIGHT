import { z } from "zod";

export const caseIdParamsSchema = z.object({
  caseId: z.string().min(1),
});

const optionalInt = z.number().int().finite().optional();
const optionalFloat = z.number().finite().optional();

export const manualMeasurementBodySchema = z.object({
  calipersJson: z.record(z.string(), z.unknown()).optional(),
  electricalAxisDeg: optionalFloat,
  heartRate: optionalInt,
  pAxisDeg: optionalFloat,
  pDurationMs: optionalInt,
  prIntervalMs: optionalInt,
  qrsAxisDeg: optionalFloat,
  qrsDurationMs: optionalInt,
  qtIntervalMs: optionalInt,
  qtcIntervalMs: optionalInt,
  rrIntervalMs: optionalInt,
  stLevelMm: optionalFloat,
  tAxisDeg: optionalFloat,
  tWaveDurationMs: optionalInt,
  workspace: z.record(z.string(), z.unknown()).optional(),
});

export type ManualMeasurementBody = z.infer<typeof manualMeasurementBodySchema>;
