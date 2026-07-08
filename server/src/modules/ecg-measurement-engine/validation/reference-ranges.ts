/** Clinical reference ranges for automated measurement validation (Sprint 59). */

export type ReferenceRange = {
  borderlineMax?: number;
  borderlineMin?: number;
  criticalMax?: number;
  criticalMin?: number;
  normalMax: number;
  normalMin: number;
  unit: string;
};

export const MEASUREMENT_REFERENCE_RANGES: Record<string, ReferenceRange> = {
  electricalAxisDeg: { normalMin: -30, normalMax: 90, unit: "deg" },
  heartRateBpm: { borderlineMin: 50, borderlineMax: 110, criticalMin: 40, criticalMax: 150, normalMin: 60, normalMax: 100, unit: "bpm" },
  jPointMm: { normalMin: -0.5, normalMax: 0.5, unit: "mm" },
  pDurationMs: { normalMin: 60, normalMax: 120, unit: "ms" },
  pWaveAmplitudeMv: { normalMin: 0.05, normalMax: 0.25, unit: "mV" },
  prIntervalMs: { borderlineMax: 220, normalMin: 120, normalMax: 200, unit: "ms" },
  qrsDurationMs: { borderlineMax: 130, normalMin: 60, normalMax: 120, unit: "ms" },
  qtIntervalMs: { normalMin: 300, normalMax: 450, unit: "ms" },
  qtcBazettMs: { borderlineMax: 480, criticalMax: 500, normalMin: 350, normalMax: 450, unit: "ms" },
  rrIntervalMs: { normalMin: 600, normalMax: 1200, unit: "ms" },
  stDepressionMm: { borderlineMax: 0.5, normalMin: 0, normalMax: 0, unit: "mm" },
  stElevationMm: { borderlineMax: 1, criticalMax: 2, normalMin: 0, normalMax: 0, unit: "mm" },
};
