import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";

/** Canonical diagnosis codes for the Medical Intelligence Engine */
export const MEDICAL_DIAGNOSIS_CODES = [
  "NSR",
  "SBRAD",
  "STACH",
  "AF",
  "AFL",
  "PAC",
  "PVC",
  "SVT",
  "VT",
  "VF",
  "ASYSTOLE",
  "PEA",
  "LBBB",
  "RBBB",
  "BIFASC",
  "TRIFASC",
  "AVB1",
  "AVB2I",
  "AVB2II",
  "AVB3",
  "WPW",
  "BRUGADA",
  "LONG_QT",
  "SHORT_QT",
  "HYPERK",
  "HYPOK",
  "HYPOCAL",
  "LVH",
  "RVH",
  "PERICARDITIS",
  "PE",
  "STEMI",
  "NSTEMI",
  "EARLY_REPOL",
  "HYPERTROPHY",
  "ELECTROLYTE",
  "DRUG_EFFECT",
  "PACEMAKER",
] as const;

export type MedicalDiagnosisCode = (typeof MEDICAL_DIAGNOSIS_CODES)[number];

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export type ClinicalUrgency = "routine" | "urgent" | "emergent" | "critical";

export type ClinicalSeverity = "normal" | "minor" | "abnormal" | "urgent" | "critical";

export type RecommendationType =
  | "repeat_ecg"
  | "serial_troponin"
  | "echo"
  | "electrolytes"
  | "cardiology_consult"
  | "emergency_referral"
  | "observation"
  | "no_immediate_action"
  | "continuous_monitoring"
  | "anticoagulation_review"
  | "chest_xray"
  | "ct_angiography";

export interface GuidelineReference {
  organization: string;
  title: string;
  year?: number;
  url?: string;
}

export interface KnowledgeBaseEntry {
  code: MedicalDiagnosisCode;
  label: string;
  category: "rhythm" | "conduction" | "ischemia" | "electrolyte" | "hypertrophy" | "channelopathy" | "other";
  diagnosticCriteria: string[];
  ecgCharacteristics: string[];
  measurements: string[];
  differentialDiagnosis: string[];
  pitfalls: string[];
  severity: ClinicalSeverity;
  urgency: ClinicalUrgency;
  clinicalNotes: string[];
  guidelineReferences: GuidelineReference[];
}

export interface RuleEvidence {
  feature: string;
  value: string;
  threshold?: string;
  met: boolean;
}

export interface RuleFinding {
  code: MedicalDiagnosisCode;
  label: string;
  category: KnowledgeBaseEntry["category"];
  severity: ClinicalSeverity;
  urgency: ClinicalUrgency;
  ruleId: string;
  triggeredBy: string[];
  evidence: RuleEvidence[];
  rawConfidence: number;
}

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  score: number;
  explanation: string;
  factors: Array<{ factor: string; impact: "positive" | "negative" | "neutral"; weight: number }>;
}

export interface ExplainabilityArtifact {
  diagnosisCode: MedicalDiagnosisCode;
  diagnosisLabel: string;
  rationale: string;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  missingEvidence: string[];
  possibleAlternatives: Array<{ code: MedicalDiagnosisCode; label: string; reason: string }>;
}

export interface DifferentialDiagnosisEntry {
  rank: number;
  code: MedicalDiagnosisCode;
  label: string;
  likelihood: number;
  distinguishingFeatures: string[];
  explanation: string;
}

export interface ClinicalRecommendation {
  type: RecommendationType;
  priority: "immediate" | "urgent" | "routine" | "optional";
  action: string;
  rationale: string;
  timeframe?: string;
}

export interface MedicalIntelligenceInput {
  measurement: EcgClinicalMeasurementResult;
  caseId?: string;
  patientId?: string;
  clinicalContext?: {
    symptoms?: string[];
    medications?: string[];
    priorDiagnoses?: string[];
    age?: number;
    sex?: "male" | "female" | "other";
  };
}

export interface MedicalIntelligenceReport {
  version: string;
  generatedAt: string;
  engineId: string;
  measurements: Record<string, number | string>;
  findings: Array<{
    code: MedicalDiagnosisCode;
    label: string;
    category: string;
    severity: ClinicalSeverity;
    urgency: ClinicalUrgency;
    confidence: ConfidenceAssessment;
    explainability: ExplainabilityArtifact;
    differentialDiagnosis: DifferentialDiagnosisEntry[];
  }>;
  primaryDiagnosis: {
    code: MedicalDiagnosisCode | null;
    label: string;
    confidence: ConfidenceAssessment;
  };
  recommendations: ClinicalRecommendation[];
  warnings: string[];
  criticalFindings: string[];
  overallSeverity: ClinicalSeverity;
  overallUrgency: ClinicalUrgency;
  overallConfidence: ConfidenceAssessment;
  explainabilitySummary: string;
}
