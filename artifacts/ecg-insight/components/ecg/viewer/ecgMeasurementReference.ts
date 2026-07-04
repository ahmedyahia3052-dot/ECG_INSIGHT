import type { EcgMeasurementKind } from "./measurementTypes";

export type ReferenceEvaluation = {
  referenceRange: string;
  clinicalSignificance: string;
  status: "critical-high" | "critical-low" | "normal" | "borderline" | "unknown";
};

type RangeRule = {
  high?: number;
  low?: number;
  normalHigh?: number;
  normalLow?: number;
  unit: string;
};

const RANGE_RULES: Partial<Record<EcgMeasurementKind, RangeRule>> = {
  heart_rate: { low: 40, high: 150, normalHigh: 100, normalLow: 60, unit: "bpm" },
  pr_interval: { high: 300, normalHigh: 200, normalLow: 120, unit: "ms" },
  qrs_duration: { high: 170, normalHigh: 120, normalLow: 80, unit: "ms" },
  qt_interval: { high: 500, normalHigh: 440, normalLow: 350, unit: "ms" },
  qtc: { high: 500, normalHigh: 440, normalLow: 350, unit: "ms" },
  rr_interval: { high: 1500, normalHigh: 1000, normalLow: 600, unit: "ms" },
  st_elevation: { high: 2, normalHigh: 0.5, normalLow: 0, unit: "mm" },
  st_depression: { high: 2, normalHigh: 0.5, normalLow: 0, unit: "mm" },
  p_wave_duration: { high: 140, normalHigh: 120, normalLow: 80, unit: "ms" },
  t_wave_duration: { high: 220, normalHigh: 200, normalLow: 120, unit: "ms" },
  p_amplitude: { high: 0.35, normalHigh: 0.25, normalLow: 0.05, unit: "mV" },
  r_amplitude: { high: 3.0, normalHigh: 2.5, normalLow: 0.5, unit: "mV" },
  s_amplitude: { high: 3.0, normalHigh: 2.5, normalLow: 0.5, unit: "mV" },
  t_amplitude: { high: 1.0, normalHigh: 0.6, normalLow: 0.1, unit: "mV" },
  electrical_axis: { high: 90, normalHigh: 90, normalLow: -30, unit: "deg" },
  qt_dispersion: { high: 80, normalHigh: 60, normalLow: 20, unit: "ms" },
};

export function formatReferenceRange(kind: EcgMeasurementKind): string {
  const rule = RANGE_RULES[kind];
  if (!rule) return "Refer to institutional norms";
  if (rule.normalLow != null && rule.normalLow < 0) return `${rule.normalLow}° to ${rule.normalHigh}°`;
  if (rule.normalLow != null && rule.normalHigh != null) return `${rule.normalLow}–${rule.normalHigh} ${rule.unit}`;
  if (rule.normalHigh != null) return `< ${rule.normalHigh} ${rule.unit}`;
  return rule.unit;
}

export function evaluateMeasurementReference(kind: EcgMeasurementKind, value: number, unit: string): ReferenceEvaluation {
  const rule = RANGE_RULES[kind];
  const referenceRange = formatReferenceRange(kind);
  if (!rule || !Number.isFinite(value)) {
    return {
      clinicalSignificance: "Manual measurement recorded for clinician review.",
      referenceRange,
      status: "unknown",
    };
  }
  if (rule.low != null && value < rule.low) {
    return {
      clinicalSignificance: `Value ${value} ${unit} is below the critical lower bound (${rule.low} ${rule.unit}).`,
      referenceRange,
      status: "critical-low",
    };
  }
  if (rule.high != null && value > rule.high) {
    return {
      clinicalSignificance: `Value ${value} ${unit} exceeds the critical upper bound (${rule.high} ${rule.unit}).`,
      referenceRange,
      status: "critical-high",
    };
  }
  if (rule.normalLow != null && value < rule.normalLow) {
    return {
      clinicalSignificance: `Value ${value} ${unit} is below the typical reference range.`,
      referenceRange,
      status: "borderline",
    };
  }
  if (rule.normalHigh != null && value > rule.normalHigh) {
    return {
      clinicalSignificance: `Value ${value} ${unit} is above the typical reference range.`,
      referenceRange,
      status: "borderline",
    };
  }
  return {
    clinicalSignificance: `Value ${value} ${unit} falls within the typical reference range.`,
    referenceRange,
    status: "normal",
  };
}
