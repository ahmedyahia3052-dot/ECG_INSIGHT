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

export interface DigitalEcg {
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
  measurements: {
    prIntervalMs: number;
    qrsDurationMs: number;
    qtIntervalMs: number;
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
  quality: {
    score: number;
    warnings: string[];
  };
  status: "available" | "fallback";
}

export async function processECGCase(accessToken: string, caseId: string) {
  return apiRequest<{ measurement: ECGMeasurement }>(`/ecg/process/${caseId}`, {
    accessToken,
    method: "POST",
  });
}

export async function getECGMeasurement(accessToken: string, caseId: string) {
  return apiRequest<{ measurement: ECGMeasurement | null }>(`/ecg/measurements/${caseId}`, {
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
