import type {
  ClinicalGeneratedReportStatus,
  ClinicalRecommendationCategory,
  ClinicalReportFlagType,
  ClinicalRiskLevel,
} from "@prisma/client";
import type { ClinicalSeverity, ClinicalUrgency, RuleFinding } from "../medical-intelligence/types";

export const AI_REPORT_GENERATOR_VERSION = "sprint59-ai-report-generator/1.0.0";

export type ExecutiveSummary = {
  acquisitionQuality: string;
  aiConfidence: string;
  clinicalIndication: string;
  clinicalUrgency: string;
  patientDemographics: {
    ageYears?: number;
    company?: string;
    department?: string;
    gender: string;
    occupation?: string;
    patientId?: string;
    patientName: string;
  };
  primaryDiagnosis: string;
  severity: string;
};

export type FullClinicalInterpretation = {
  axis: string;
  comparison: string;
  conduction: string;
  hypertrophy: string;
  intervals: string;
  morphology: string;
  overallImpression: string;
  rate: string;
  rhythm: string;
  stT: string;
};

export type GeneratedRecommendation = {
  action: string;
  category: ClinicalRecommendationCategory;
  priority: string;
  rationale?: string;
};

export type GeneratedFinding = {
  category: string;
  code: string;
  confidence?: number;
  evidence?: Array<{ feature: string; value: string }>;
  label: string;
  severity: string;
};

export type GeneratedExplanation = {
  clinicalReferences: string[];
  findingCode?: string;
  howText: string;
  supportingEvidence: string[];
  whyText: string;
};

export type ComposedAiReport = {
  clinicalFlags: ClinicalReportFlagType[];
  emergencyWarning?: string;
  executiveSummary: ExecutiveSummary;
  explanations: GeneratedExplanation[];
  findings: GeneratedFinding[];
  fullInterpretation: FullClinicalInterpretation;
  overallImpression: string;
  primaryDiagnosis: string;
  recommendations: GeneratedRecommendation[];
  riskLevel: ClinicalRiskLevel;
  severity: ClinicalSeverity;
  clinicalUrgency: ClinicalUrgency;
  aiConfidence: number;
  acquisitionQuality: string;
  clinicalIndication?: string;
};

export type SerializedClinicalGeneratedReport = {
  acquisitionQuality: string;
  aiConfidence: number;
  caseId: string;
  clinicalFlags: ClinicalReportFlagType[];
  clinicalIndication?: string;
  clinicalUrgency: string;
  createdAt: string;
  emergencyWarning?: string;
  executiveSummary: ExecutiveSummary;
  explanations: GeneratedExplanation[];
  findings: GeneratedFinding[];
  fullInterpretation: FullClinicalInterpretation;
  generatedById?: string;
  id: string;
  overallImpression: string;
  patientId: string;
  primaryDiagnosis: string;
  recommendations: GeneratedRecommendation[];
  reportGroupId: string;
  riskLevel: ClinicalRiskLevel;
  severity: string;
  sourceEngineVersion: string;
  status: ClinicalGeneratedReportStatus;
  updatedAt: string;
  versionNumber: number;
};

export function severityToRiskLevel(severity: ClinicalSeverity): ClinicalRiskLevel {
  switch (severity) {
    case "critical":
      return "CRITICAL";
    case "urgent":
      return "HIGH";
    case "abnormal":
      return "INTERMEDIATE";
    default:
      return "LOW";
  }
}

export function mapFindingToGenerated(finding: RuleFinding): GeneratedFinding {
  return {
    category: finding.category,
    code: finding.code,
    confidence: finding.rawConfidence,
    evidence: finding.evidence.map((row) => ({ feature: row.feature, value: row.value })),
    label: finding.label,
    severity: finding.severity,
  };
}
