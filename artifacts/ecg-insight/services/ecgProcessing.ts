import { apiRequest } from "./api";

export interface ECGMeasurement {
  caseId: string;
  createdAt: string;
  heartRate: number;
  id: string;
  prInterval: number;
  qrsDuration: number;
  qtInterval: number;
  qtcInterval: number;
  rhythmRegularity: number;
  signalQuality: "excellent" | "good" | "fair" | "poor";
  stDeviation: number;
}

export interface WaveformPoint {
  t: number;
  v: number;
}

export interface ProcessedWaveform {
  durationSeconds: number;
  points: WaveformPoint[];
  sampleRate: number;
}

export interface DigitalEcgLead {
  durationSeconds: number;
  lead: string;
  samples: number[];
  samplingRate: number;
}

export interface DigitalEcgAnnotation {
  endMs: number;
  label: string;
  lead: string;
  peakMs: number;
  startMs: number;
  type: string;
}

export interface EcgMeasurementHighlight {
  endMs: number;
  lead: string;
  peakMs?: number;
  startMs: number;
}

export interface EcgMeasurementItem {
  highlight?: EcgMeasurementHighlight;
  label: string;
  unit: "bpm" | "ms" | "mm" | "mV" | "deg";
  value: number;
}

export interface EcgClinicalMeasurements {
  amplitudes: {
    pWaveAmplitudeMv: number;
    qrsAmplitudeMv: number;
    rWaveProgression: "normal" | "poor" | "reverse";
    stDeviationMm: number;
    tWaveAmplitudeMv: number;
  };
  axis: {
    electricalAxisDeg: number;
    frontalPlaneAxisDeg: number;
    meanQrsAxisDeg: number;
  };
  confidence: number;
  heartRate: number;
  intervals: {
    pWaveDurationMs: number;
    prIntervalMs: number;
    qrsDurationMs: number;
    qtIntervalMs: number;
    qtcBazettMs: number;
    qtcFridericiaMs: number;
    rrIntervalMs: number;
  };
  measurements: EcgMeasurementItem[];
  morphology: string[];
  rhythm: "regular" | "irregular" | "sinus_rhythm" | "sinus_tachycardia" | "sinus_bradycardia";
  stDeviation: number;
}

export interface EcgClinicalInterpretation {
  confidence: number;
  findings: Array<{
    category: "axis" | "conduction" | "electrolyte" | "hypertrophy" | "ischemia" | "rhythm";
    code: string;
    confidence: number;
    evidence: Array<{ feature: string; value: string }>;
    label: string;
    severity: "normal" | "minor" | "abnormal" | "urgent" | "critical";
    triggeredBy: string[];
  }>;
  markdownReport: string;
  measurementsUsed: Record<string, number | string>;
  primaryDiagnosis: string;
  recommendations: string[];
  report: {
    confidence: number;
    evidence: Array<{ feature: string; value: string }>;
    findings: string[];
    measurementsUsed: Record<string, number | string>;
    recommendations: string[];
    summary: string;
    urgency: "normal" | "minor" | "abnormal" | "urgent" | "critical";
  };
  severity: "normal" | "minor" | "abnormal" | "urgent" | "critical";
  urgency: "normal" | "minor" | "abnormal" | "urgent" | "critical";
}

export interface EcgAiDiagnosis {
  agreementWithRules: number;
  clinicalReasoning: string;
  confidence: number;
  disagreementExplanation: string;
  ensembleSources: string[];
  evidence: string[];
  markdownReport: string;
  primaryDiagnosis: string;
  recommendations: string[];
  topDiagnoses: Array<{
    agreementWithRules: number;
    confidence: number;
    evidence: string[];
    label: string;
    probability: number;
    source: "deep_learning" | "measurement" | "rules";
  }>;
  urgency: "normal" | "minor" | "abnormal" | "urgent" | "critical";
}

export interface DigitalEcg {
  aiDiagnosis: EcgAiDiagnosis;
  annotations: DigitalEcgAnnotation[];
  calibration: {
    confidence: number;
    gainMmPerMv: 5 | 10 | 20;
    gridDetected: boolean;
    paperSpeedMmPerSec: 25 | 50;
  };
  durationSeconds: number;
  ecgFileId?: string;
  enhancedImageUrl?: string;
  extractionTimestamp?: string;
  fallbackReason?: string;
  leadSegments: Array<{
    confidence: number;
    heightPercent: number;
    lead: string;
    widthPercent: number;
    xPercent: number;
    yPercent: number;
  }>;
  leads: DigitalEcgLead[];
  interpretationEngine: EcgClinicalInterpretation;
  measurementEngine: EcgClinicalMeasurements;
  measurements: {
    heartRate: number;
    prIntervalMs: number;
    qrsDurationMs: number;
    qtIntervalMs: number;
    qtcBazettMs: number;
    rrIntervalMs: number;
  };
  originalImageUrl?: string;
  preprocessing?: {
    autoRotationDegrees: number;
    borderDetected: boolean;
    contrastEnhanced: boolean;
    croppingOptimization: { heightPercent: number; widthPercent: number; xPercent: number; yPercent: number };
    deskewDegrees: number;
    gridEnhanced: boolean;
    noiseReduced: boolean;
    perspectiveCorrected: boolean;
    shadowRemoved: boolean;
  };
  ocrMetadata?: {
    gain?: string;
    patientName?: string;
    speed?: string;
  };
  quality: {
    score: number;
    warnings: string[];
  };
  status: "available" | "fallback";
  validation?: {
    calibrationAccuracy: number;
    digitizationAccuracy: number;
    gridAccuracy: number;
    leadDetectionPercent: number;
    score: number;
    signalContinuityPercent: number;
    warnings: string[];
  };
}

export async function processECGCase(accessToken: string, caseId: string) {
  return apiRequest<{ measurement: ECGMeasurement }>(`/ecg/process/${caseId}`, {
    accessToken,
    method: "POST",
  });
}

export async function measureDigitalECG(accessToken: string, caseId: string) {
  return apiRequest<{ clinicalDisclaimer: string; clinicalInterpretation: EcgClinicalInterpretation; clinicalMeasurements: EcgClinicalMeasurements; digitalEcg: DigitalEcg }>(`/ecg/measure/${caseId}`, {
    accessToken,
    method: "POST",
  });
}

export async function diagnoseDigitalECG(accessToken: string, caseId: string) {
  return apiRequest<{ aiDiagnosis: EcgAiDiagnosis; clinicalDisclaimer: string; digitalEcg: DigitalEcg; markdownReport: string }>(`/ecg/diagnose/${caseId}`, {
    accessToken,
    method: "POST",
  });
}

export async function interpretDigitalECG(accessToken: string, caseId: string) {
  return apiRequest<{ clinicalDisclaimer: string; clinicalInterpretation: EcgClinicalInterpretation; digitalEcg: DigitalEcg; markdownReport: string }>(`/ecg/interpret/${caseId}`, {
    accessToken,
    method: "POST",
  });
}

export async function getECGMeasurement(accessToken: string, caseId: string) {
  return apiRequest<{ clinicalMeasurements: EcgClinicalMeasurements | null; measurement: ECGMeasurement | null }>(`/ecg/measurements/${caseId}`, {
    accessToken,
  });
}

export async function getECGWaveform(accessToken: string, caseId: string) {
  return apiRequest<{ waveform: ProcessedWaveform | null }>(`/ecg/waveform/${caseId}`, {
    accessToken,
  });
}

export async function getDigitalECG(accessToken: string, caseId: string) {
  return apiRequest<{ digitalEcg: DigitalEcg }>(`/ecg/digital/${caseId}`, { accessToken });
}

export async function digitizeECG(
  accessToken: string,
  input: { caseId?: string; ecgFileId?: string; gainMmPerMv?: 5 | 10 | 20; paperSpeedMmPerSec?: 25 | 50 },
) {
  return apiRequest<{ clinicalDisclaimer: string; digitalEcg: DigitalEcg }>("/ecg/digitize", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function getDigitizedECG(accessToken: string, caseId: string) {
  return apiRequest<{ clinicalDisclaimer: string; digitalEcg: DigitalEcg }>(`/ecg/${caseId}/digitized`, { accessToken });
}

export async function getDigitizationQuality(accessToken: string, caseId: string) {
  return apiRequest<{
    clinicalDisclaimer: string;
    digitizationQuality: Pick<DigitalEcg, "calibration" | "ecgFileId" | "extractionTimestamp" | "leadSegments" | "preprocessing" | "quality" | "status">;
  }>(`/ecg/${caseId}/digitization-quality`, { accessToken });
}

export async function reconstructDigitalECG(
  accessToken: string,
  caseId: string,
  override?: { gainMmPerMv?: 5 | 10 | 20; paperSpeedMmPerSec?: 25 | 50 },
) {
  return apiRequest<{ digitalEcg: DigitalEcg }>(`/ecg/digital/${caseId}/reconstruct`, {
    accessToken,
    body: JSON.stringify(override ?? {}),
    method: "POST",
  });
}

export function digitalECGExportUrl(caseId: string, format: "json" | "pdf" | "png" | "svg") {
  return `/ecg/digital/${caseId}/export/${format}`;
}
