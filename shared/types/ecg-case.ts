import type { Patient } from "./patient";

export type ECGCaseStatus =
  | "ai_completed"
  | "approved"
  | "archived"
  | "awaiting_second_opinion"
  | "escalated"
  | "finalized"
  | "new"
  | "pending"
  | "processing"
  | "rejected"
  | "reviewed"
  | "signed"
  | "under_review"
  | "uploaded";

export type ECGCasePriority = "low" | "medium" | "high" | "critical";
export type ECGCaseSeverity = "normal" | "abnormal" | "critical";

export type ECGCase = {
  acquisitionDate: string;
  aiDiagnosis?: string;
  aiStatus: string;
  caseId: string;
  caseNumber?: string;
  ecgType: string;
  files: ECGImage[];
  heartRate?: number;
  id: string;
  patient: Patient;
  patientId: string;
  priority: ECGCasePriority;
  rhythm?: string;
  severity?: ECGCaseSeverity;
  status: ECGCaseStatus;
  uploadDate: string;
};

export type ECGImage = {
  downloadUrl: string;
  id: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
};

export type ECGAnalysis = {
  aiDiagnosis?: string;
  aiModelVersion?: string;
  aiStatus: string;
  caseId: string;
  confidence?: number;
  explainability?: unknown;
  measurements?: {
    prIntervalMs?: number;
    qrsDurationMs?: number;
    qtIntervalMs?: number;
    qtcIntervalMs?: number;
  };
};

export type Diagnosis = {
  aiDiagnosis?: string;
  clinicalComments?: string;
  doctorDiagnosis?: string;
  finalDiagnosis?: string;
  interpretation?: string;
};

export type CaseTimelineEvent = {
  actorName?: string;
  createdAt: string;
  id: string;
  message?: string;
  title: string;
  type: string;
};
