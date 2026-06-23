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
