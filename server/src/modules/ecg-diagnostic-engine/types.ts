import type { DigitizedLead, GridCalibration } from "../ecg-digitization/types";

export const DIAGNOSTIC_ENGINE_VERSION = "sprint54-v1" as const;

export type EnterpriseRhythmClass =
  | "normal_sinus_rhythm"
  | "sinus_tachycardia"
  | "sinus_bradycardia"
  | "atrial_fibrillation"
  | "atrial_flutter"
  | "supraventricular_tachycardia"
  | "ventricular_tachycardia"
  | "ventricular_fibrillation"
  | "premature_ventricular_contraction"
  | "premature_atrial_contraction"
  | "bigeminy"
  | "trigeminy"
  | "escape_rhythm"
  | "junctional_rhythm"
  | "first_degree_av_block"
  | "second_degree_av_block"
  | "third_degree_av_block"
  | "heart_block"
  | "unknown_rhythm";

export type MorphologyClass =
  | "normal"
  | "wide_qrs"
  | "narrow_qrs"
  | "fragmented_qrs"
  | "bbb_morphology"
  | "delta_wave"
  | "st_morphology_abnormal"
  | "t_morphology_abnormal"
  | "p_morphology_abnormal"
  | "pathological_q"
  | "voltage_abnormality"
  | "lvh_voltage"
  | "rvh_voltage"
  | "poor_r_progression"
  | "bundle_branch_block";

export type DiagnosticCertainty = "definite" | "probable" | "possible" | "uncertain";

export interface WaveSegment {
  onset: number;
  offset: number;
  peak: number;
  confidence: number;
}

export interface DetectedWave {
  p: WaveSegment;
  q: WaveSegment;
  r: WaveSegment;
  s: WaveSegment;
  t: WaveSegment;
  u?: WaveSegment;
  jPoint: number;
}

export interface WaveDetectionBeat {
  beatIndex: number;
  rPeak: number;
  waves: DetectedWave;
  peakConfidence: number;
  waveConfidence: number;
  motionArtifactRejected: boolean;
  noiseScore: number;
}

export interface WaveDetectionResult {
  beats: WaveDetectionBeat[];
  rPeaks: number[];
  filteredLead: string;
  baselineCorrected: boolean;
  powerlineFiltered: boolean;
  adaptiveThreshold: number;
}

export interface EnterpriseMeasurementBundle {
  heartRateBpm: number;
  rrIntervalMs: number;
  prIntervalMs: number;
  pDurationMs: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  qtcBazettMs: number;
  qtcFridericiaMs: number;
  qtDispersionMs: number;
  pAxisDeg: number;
  qrsAxisDeg: number;
  tAxisDeg: number;
  electricalAxisDeg: number;
  meanElectricalAxisDeg: number;
  voltageMv: number;
  rWaveAmplitudeMv: number;
  sWaveAmplitudeMv: number;
  stElevationMm: number;
  stDepressionMm: number;
  jPointMm: number;
  tInversion: boolean;
  rProgression: "normal" | "poor" | "reverse";
  transitionZone: string;
  lvhVoltageCriteria: boolean;
  rvhVoltageCriteria: boolean;
  bundleBranchIndicators: string[];
  atrialActivity: "present" | "absent" | "irregular";
  ventricularActivity: "regular" | "irregular" | "wide" | "narrow";
  pWaveAmplitudeMv: number;
  qrsAmplitudeMv: number;
  tWaveAmplitudeMv: number;
  stDeviationMm: number;
}

export interface RhythmEvidence {
  feature: string;
  value: string | number;
}

export interface RhythmResult {
  classification: EnterpriseRhythmClass;
  confidence: number;
  evidence: RhythmEvidence[];
  supportingMeasurements: Record<string, number>;
}

export interface ClinicalDiagnosis {
  category: "rhythm" | "conduction" | "ischemia" | "hypertrophy" | "morphology" | "interval" | "axis";
  code: string;
  label: string;
  confidence: number;
  reason: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  measurements: string[];
  certainty: DiagnosticCertainty;
}

export interface ConfidenceSummary {
  overall: number;
  measurementConfidence: number;
  rhythmConfidence: number;
  morphologyConfidence: number;
  rulesConfidence: number;
  diagnosticCertainty: DiagnosticCertainty;
  reasons: string[];
}

export interface StructuredClinicalFinding {
  code: string;
  label: string;
  severity: "normal" | "minor" | "abnormal" | "urgent" | "critical";
  confidence: number;
  measurementsReferenced: string[];
  evidence: string[];
}

export interface DiagnosticPipelineInput {
  calibration: GridCalibration;
  leads: DigitizedLead[];
  powerlineHz?: 50 | 60;
}

export interface DiagnosticPipelineResult {
  version: typeof DIAGNOSTIC_ENGINE_VERSION;
  filteredLeads: Array<{ lead: string; samples: number[]; samplingRate: number }>;
  waveDetection: WaveDetectionResult;
  measurements: EnterpriseMeasurementBundle;
  morphology: MorphologyClass[];
  rhythm: RhythmResult;
  clinicalFindings: ClinicalDiagnosis[];
  confidence: ConfidenceSummary;
  structuredFindings: StructuredClinicalFinding[];
  performanceMs: number;
}

export interface MeasurementStudioSnapshot {
  caseId: string;
  capturedAt: string;
  measurements: EnterpriseMeasurementBundle;
  confidence: number;
  abnormalKeys: string[];
}

export interface MeasurementTrendPoint {
  timestamp: string;
  value: number;
  abnormal: boolean;
}

export interface MeasurementComparisonResult {
  baseline: MeasurementStudioSnapshot;
  current: MeasurementStudioSnapshot;
  deltas: Record<string, number>;
  trendDirection: Record<string, "up" | "down" | "stable">;
}

export interface MeasurementExportPayload {
  version: typeof DIAGNOSTIC_ENGINE_VERSION;
  exportedAt: string;
  caseId: string;
  measurements: EnterpriseMeasurementBundle;
  rhythm: RhythmResult;
  morphology: MorphologyClass[];
  clinicalFindings: ClinicalDiagnosis[];
  confidence: ConfidenceSummary;
}
