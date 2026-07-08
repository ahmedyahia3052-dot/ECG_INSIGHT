/** Sprint 65 — Clinical Decision Support & Follow-up Engine DTOs. */

export const CLINICAL_DECISION_SUPPORT_VERSION = "sprint65-v1" as const;

export type RecommendationTypeCode =
  | "REPEAT_ECG"
  | "HOLTER_MONITOR"
  | "ECHOCARDIOGRAPHY"
  | "TROPONIN"
  | "ELECTROLYTES"
  | "CARDIOLOGY_REFERRAL"
  | "EMERGENCY_EVALUATION"
  | "HOSPITAL_ADMISSION"
  | "OBSERVATION"
  | "REPEAT_MEASUREMENTS"
  | "MANUAL_REVIEW_REQUIRED";

export interface SupportingFinding {
  code: string;
  label: string;
  severity: string;
}

export interface ClinicalEvidenceItem {
  reference: string;
  source: string;
  summary: string;
}

export interface GeneratedRecommendationDto {
  action: string;
  clinicalEvidence: ClinicalEvidenceItem[];
  confidence: number;
  priorityScore: number;
  reasoning: string;
  recommendationType: RecommendationTypeCode;
  ruleCode?: string;
  supportingFindings: SupportingFinding[];
  title: string;
}

export interface GeneratedFollowUpDto {
  nextEcgDate: string;
  priority: "ROUTINE" | "URGENT" | "EMERGENT" | "CRITICAL";
  reasoning: string;
  recommendedIntervalDays: number;
  reminderDates: string[];
  reviewStatus: "PENDING" | "SCHEDULED";
}

export interface DecisionSupportEvaluationInput {
  caseId: string;
  heartRate?: number;
  measurementConfidence?: number;
  morphology?: string[];
  patientId: string;
  prIntervalMs?: number;
  qrsDurationMs?: number;
  qtIntervalMs?: number;
  qtcBazettMs?: number;
  rhythm?: string;
  stDeviationMm?: number;
  structuredFindings?: SupportingFinding[];
}

export interface SerializedCaseClinicalRecommendation {
  acceptedAt?: string;
  action: string;
  caseId: string;
  clinicalEvidence: ClinicalEvidenceItem[];
  confidence: number;
  createdAt: string;
  id: string;
  priorityScore: number;
  reasoning: string;
  recommendationType: RecommendationTypeCode;
  rejectedAt?: string;
  rejectionReason?: string;
  ruleCode?: string;
  status: string;
  supportingFindings: SupportingFinding[];
  title: string;
  updatedAt: string;
}

export interface SerializedFollowUpPlan {
  caseId: string;
  completedAt?: string;
  createdAt: string;
  id: string;
  nextEcgDate?: string;
  priority: string;
  reasoning?: string;
  recommendedIntervalDays: number;
  reminders: Array<{
    acknowledgedAt?: string;
    id: string;
    reminderDate: string;
    sentAt?: string;
    status: string;
  }>;
  reviewStatus: string;
  updatedAt: string;
}
