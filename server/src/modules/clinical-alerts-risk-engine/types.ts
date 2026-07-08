import type {
  EcgAlertCode,
  EcgAlertSeverity,
  EcgClinicalPriority,
  EcgRiskCategory,
  EcgUrgencyLevel,
} from "@prisma/client";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import type { MedicalIntelligenceReport } from "../medical-intelligence/types";

export const CLINICAL_ALERTS_RISK_ENGINE_VERSION = "sprint64-clinical-alerts-risk-engine/1.0.0";
export const CLINICAL_ALERTS_RISK_SOURCE_ENGINE = "sprint64-clinical-alerts-risk-engine";

export type AlertDetectionContext = {
  analysisRhythm?: string | null;
  caseRhythm?: string | null;
  intelligence?: MedicalIntelligenceReport;
  measurement: EcgClinicalMeasurementResult;
  patientGender?: string;
};

export type DetectedClinicalAlert = {
  alertCode: EcgAlertCode;
  alertSeverity: EcgAlertSeverity;
  alertType: "STEMI" | "VENTRICULAR_TACHYCARDIA" | "AF_RVR" | "COMPLETE_HEART_BLOCK" | "EXTREME_BRADYCARDIA";
  confidence: number;
  evidence: Array<{ feature: string; threshold?: string; value: string }>;
  message: string;
  supportingFindings: string[];
};

export type RiskFactorDraft = {
  category: string;
  code: string;
  contribution: number;
  evidence: string[];
  label: string;
  weight: number;
};

export type RiskAssessmentDraft = {
  clinicalPriority: EcgClinicalPriority;
  confidence: number;
  factors: RiskFactorDraft[];
  riskCategory: EcgRiskCategory;
  riskScore: number;
  supportingFindings: string[];
  urgency: EcgUrgencyLevel;
};

export type SerializedEcgClinicalAlert = {
  alertCode?: EcgAlertCode;
  alertSeverity?: EcgAlertSeverity;
  alertType: string;
  caseId?: string;
  confidenceScore: number;
  createdAt: string;
  engineVersion?: string;
  evidence?: Array<{ feature: string; threshold?: string; value: string }>;
  id: string;
  message: string;
  patientId: string;
  severity: string;
  sourceEngine?: string;
  status: string;
  supportingFindings?: string[];
};

export type SerializedEcgRiskAssessment = {
  assessmentGroupId: string;
  calculatedById?: string;
  caseId: string;
  clinicalPriority: EcgClinicalPriority;
  confidence: number;
  createdAt: string;
  engineVersion: string;
  factors: Array<{
    category: string;
    code: string;
    contribution: number;
    evidence: string[];
    label: string;
    weight: number;
  }>;
  id: string;
  patientId: string;
  riskCategory: EcgRiskCategory;
  riskScore: number;
  supportingFindings: string[];
  urgency: EcgUrgencyLevel;
  versionNumber: number;
};

export const SEVERITY_SCORE_WEIGHT: Record<EcgAlertSeverity, number> = {
  CRITICAL: 45,
  HIGH: 30,
  LOW: 5,
  MODERATE: 15,
  NORMAL: 0,
};

export const SEVERITY_RANK: Record<EcgAlertSeverity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  LOW: 2,
  MODERATE: 3,
  NORMAL: 1,
};

export function severityToAiSeverity(severity: EcgAlertSeverity) {
  switch (severity) {
    case "NORMAL":
      return "NORMAL" as const;
    case "LOW":
      return "MILD" as const;
    case "MODERATE":
      return "MODERATE" as const;
    case "HIGH":
      return "SEVERE" as const;
    default:
      return "CRITICAL" as const;
  }
}

export function riskCategoryFromScore(score: number): EcgRiskCategory {
  if (score >= 76) return "CRITICAL";
  if (score >= 46) return "HIGH";
  if (score >= 21) return "MODERATE";
  return "LOW";
}

export function clinicalPriorityFromCategory(category: EcgRiskCategory): EcgClinicalPriority {
  switch (category) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "HIGH";
    case "MODERATE":
      return "ELEVATED";
    default:
      return "ROUTINE";
  }
}

export function urgencyFromCategory(category: EcgRiskCategory): EcgUrgencyLevel {
  switch (category) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "EMERGENT";
    case "MODERATE":
      return "URGENT";
    default:
      return "ROUTINE";
  }
}
