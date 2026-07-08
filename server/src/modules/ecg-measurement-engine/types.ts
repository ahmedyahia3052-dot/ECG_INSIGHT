/** Sprint 59 — production ECG measurement engine DTOs (backend only). */

export const MEASUREMENT_ENGINE_VERSION = "sprint59-v1" as const;

export type MeasurementUnit = "bpm" | "ms" | "mm" | "mV" | "deg";

export type RProgressionClass = "normal" | "poor" | "reverse";

export type BundleBranchPattern =
  | "none"
  | "rbbb_pattern"
  | "lbbb_pattern"
  | "intraventricular_conduction_delay";

export interface HeartRateMeasurement {
  heartRateBpm: number;
  rrIntervalMs: number;
}

export interface IntervalMeasurements {
  prIntervalMs: number;
  pDurationMs: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  qtcBazettMs: number;
  qtcFridericiaMs: number;
  qtDispersionMs: number;
}

export interface AxisMeasurements {
  electricalAxisDeg: number;
  meanElectricalAxisDeg: number;
  pAxisDeg: number;
  qrsAxisDeg: number;
  tAxisDeg: number;
}

export interface AmplitudeMeasurements {
  pWaveAmplitudeMv: number;
  qrsAmplitudeMv: number;
  rWaveAmplitudeMv: number;
  sWaveAmplitudeMv: number;
  tWaveAmplitudeMv: number;
  voltageMv: number;
}

export interface StSegmentMeasurements {
  stElevationMm: number;
  stDepressionMm: number;
  jPointMm: number;
  stDeviationMm: number;
}

export interface ProgressionMeasurements {
  rProgression: RProgressionClass;
  transitionZone: string;
}

export interface BundleBranchMeasurements {
  patterns: BundleBranchPattern[];
  qrsDurationMs: number;
}

export interface VoltageCriteriaMeasurements {
  lvhVoltageCriteria: boolean;
  rvhVoltageCriteria: boolean;
  lowVoltageLimbLeads: boolean;
}

/** Complete Sprint 59 measurement bundle. */
export interface EcgMeasurementBundleDto {
  amplitudes: AmplitudeMeasurements;
  axis: AxisMeasurements;
  bundleBranch: BundleBranchMeasurements;
  heartRate: HeartRateMeasurement;
  intervals: IntervalMeasurements;
  progression: ProgressionMeasurements;
  stSegment: StSegmentMeasurements;
  voltageCriteria: VoltageCriteriaMeasurements;
}

export type MeasurementValidationSeverity = "normal" | "borderline" | "abnormal" | "critical";

export interface MeasurementValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: MeasurementValidationSeverity;
  value: number;
}

export interface MeasurementValidationResult {
  abnormalCount: number;
  issues: MeasurementValidationIssue[];
  valid: boolean;
}

export interface EcgMeasurementEngineResult {
  bundle: EcgMeasurementBundleDto;
  confidence: number;
  engineVersion: typeof MEASUREMENT_ENGINE_VERSION;
  performanceMs: number;
  validation: MeasurementValidationResult;
}

export interface MeasureEngineInput {
  calibration: import("../ecg-digitization/types").GridCalibration;
  leads: import("../ecg-digitization/types").DigitizedLead[];
}
