import type { DigitizedLead, GridCalibration } from "../ecg-digitization/types";

export type RhythmClassification =
  | "regular"
  | "irregular"
  | "sinus_rhythm"
  | "sinus_tachycardia"
  | "sinus_bradycardia";

export type MorphologyFlag =
  | "wide_qrs"
  | "narrow_qrs"
  | "poor_r_progression"
  | "pathological_q_waves"
  | "low_voltage"
  | "lvh_criteria"
  | "rvh_criteria";

export interface MeasurementHighlight {
  endMs: number;
  lead: string;
  peakMs?: number;
  startMs: number;
}

export interface EcgMeasurementIntervals {
  pWaveDurationMs: number;
  prIntervalMs: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  qtcBazettMs: number;
  qtcFridericiaMs: number;
  rrIntervalMs: number;
}

export interface EcgMeasurementAmplitudes {
  pWaveAmplitudeMv: number;
  qrsAmplitudeMv: number;
  rWaveProgression: "normal" | "poor" | "reverse";
  stDeviationMm: number;
  tWaveAmplitudeMv: number;
}

export interface EcgMeasurementAxis {
  electricalAxisDeg: number;
  frontalPlaneAxisDeg: number;
  meanQrsAxisDeg: number;
}

export interface EcgMeasurementItem {
  highlight?: MeasurementHighlight;
  label: string;
  unit: "bpm" | "ms" | "mm" | "mV" | "deg";
  value: number;
}

export interface EcgClinicalMeasurementResult {
  amplitudes: EcgMeasurementAmplitudes;
  axis: EcgMeasurementAxis;
  confidence: number;
  heartRate: number;
  intervals: EcgMeasurementIntervals;
  measurements: EcgMeasurementItem[];
  morphology: MorphologyFlag[];
  rhythm: RhythmClassification;
  stDeviation: number;
}

export interface MeasureLeadsInput {
  calibration: GridCalibration;
  leads: DigitizedLead[];
}
