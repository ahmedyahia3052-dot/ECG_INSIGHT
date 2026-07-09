import { apiRequest } from "./api";

export type ClinicalMeasurementSnapshot = {
  autoDetailsJson?: Record<string, unknown> | null;
  calipersJson?: Record<string, unknown> | null;
  caseId: string;
  createdAt: string;
  createdById: string | null;
  electricalAxisDeg: number | null;
  engineVersion: string;
  heartRate: number | null;
  id: string;
  pAxisDeg: number | null;
  pDurationMs: number | null;
  prIntervalMs: number | null;
  qrsAxisDeg: number | null;
  qrsDurationMs: number | null;
  qtIntervalMs: number | null;
  qtcIntervalMs: number | null;
  rrIntervalMs: number | null;
  source: "AUTO" | "MANUAL" | "HYBRID";
  stLevelMm: number | null;
  tAxisDeg: number | null;
  tWaveDurationMs: number | null;
  validation?: {
    abnormalCount: number;
    issues: Array<{ code: string; field: string; message: string; severity: string; value: number }>;
    valid: boolean;
  };
};

export type ClinicalMeasurementSnapshotResponse = {
  caseId: string;
  clinicalPreview: Record<string, unknown> | null;
  engineVersion: string;
  latestRecord: ClinicalMeasurementSnapshot | null;
  workspace: Record<string, unknown> | null;
};

export type ManualClinicalMeasurementPayload = {
  calipersJson?: Record<string, unknown>;
  electricalAxisDeg?: number;
  heartRate?: number;
  pAxisDeg?: number;
  pDurationMs?: number;
  prIntervalMs?: number;
  qrsAxisDeg?: number;
  qrsDurationMs?: number;
  qtIntervalMs?: number;
  qtcIntervalMs?: number;
  rrIntervalMs?: number;
  stLevelMm?: number;
  tAxisDeg?: number;
  tWaveDurationMs?: number;
  workspace?: Record<string, unknown>;
};

export async function getClinicalMeasurementSnapshot(accessToken: string, caseId: string) {
  return apiRequest<ClinicalMeasurementSnapshotResponse>(`/clinical-measurement-engine/cases/${caseId}`, { accessToken });
}

export async function runAutoClinicalMeasurement(accessToken: string, caseId: string) {
  return apiRequest<{ record: ClinicalMeasurementSnapshot; saved: true }>(
    `/clinical-measurement-engine/cases/${caseId}/auto`,
    { accessToken, method: "POST" },
  );
}

export async function saveManualClinicalMeasurement(
  accessToken: string,
  caseId: string,
  payload: ManualClinicalMeasurementPayload,
) {
  return apiRequest<{ record: ClinicalMeasurementSnapshot; saved: true; workspacePersisted: boolean }>(
    `/clinical-measurement-engine/cases/${caseId}/manual`,
    { accessToken, body: JSON.stringify(payload), method: "PUT" },
  );
}
