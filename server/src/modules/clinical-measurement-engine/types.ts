/** Sprint 96 — clinical measurement engine DTOs. */

export const CLINICAL_MEASUREMENT_ENGINE_VERSION = "sprint96-v1" as const;

export interface ClinicalMeasurementSnapshot {
  autoDetailsJson?: Record<string, unknown> | null;
  calipersJson?: Record<string, unknown> | null;
  caseId: string;
  createdAt: string;
  createdById: string | null;
  electricalAxisDeg: number | null;
  engineVersion: typeof CLINICAL_MEASUREMENT_ENGINE_VERSION;
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
}

export interface ClinicalMeasurementAutoResult {
  record: ClinicalMeasurementSnapshot;
  saved: true;
}

export interface ClinicalMeasurementManualResult {
  record: ClinicalMeasurementSnapshot;
  saved: true;
  workspacePersisted: boolean;
}
