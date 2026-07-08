/**
 * ECG Medical Knowledge Platform (EMKP)
 * Enterprise knowledge model — isolated from production runtime.
 * @module enterprise/emkp
 */

/** Top-level knowledge taxonomy */
export type EmkpKnowledgeCategory =
  | "rhythm"
  | "conduction"
  | "ischemia"
  | "electrolyte"
  | "hypertrophy"
  | "channelopathy"
  | "structural"
  | "device"
  | "normal"
  | "other";

/** Evidence grading (adapted from ACC/AHA Class of Recommendation framework) */
export type EmkpEvidenceLevel = "A" | "B" | "C" | "D" | "expert_consensus";

/** Clinical confidence for knowledge assertions */
export type EmkpClinicalConfidence = "definitive" | "high" | "moderate" | "low" | "indeterminate";

/** Risk stratification */
export type EmkpRiskCategory = "critical" | "high" | "intermediate" | "low" | "benign";

/** Recommendation priority */
export type EmkpRecommendationLevel = "immediate" | "urgent" | "routine" | "optional" | "none";

/** Severity classification */
export type EmkpSeverityLevel = "normal" | "minor" | "abnormal" | "urgent" | "critical";

/** Urgency for clinical action */
export type EmkpUrgencyLevel = "routine" | "urgent" | "emergent" | "critical";

export interface EmkpGuidelineReference {
  organization: "ESC" | "AHA" | "ACC" | "ACC/AHA" | "HRS" | "WHF" | "UDMI" | "IEC" | "OTHER";
  documentId: string;
  title: string;
  section?: string;
  year?: number;
  url?: string;
  evidenceLevel?: EmkpEvidenceLevel;
}

export interface EmkpMedicalConcept {
  conceptId: string;
  label: string;
  synonyms: string[];
  abbreviations: string[];
  category: EmkpKnowledgeCategory;
  parentConceptId?: string;
  definition: string;
}

export interface EmkpClinicalRule {
  ruleId: string;
  diagnosisCode: string;
  definition: string;
  diagnosticCriteria: string[];
  requiredFindings: string[];
  supportingFindings: string[];
  exclusionFindings: string[];
  severity: EmkpSeverityLevel;
  clinicalSignificance: string;
  riskLevel: EmkpRiskCategory;
  urgency: EmkpUrgencyLevel;
  recommendedAction: string[];
  evidenceLevel: EmkpEvidenceLevel;
  confidence: EmkpClinicalConfidence;
  guidelineRefs: EmkpGuidelineReference[];
}

export interface EmkpDiseaseEntry {
  code: string;
  name: string;
  category: EmkpKnowledgeCategory;
  definition: string;
  diagnosticCriteria: string[];
  ecgCharacteristics: string[];
  measurements: string[];
  differentialDiagnosis: string[];
  pitfalls: string[];
  severity: EmkpSeverityLevel;
  urgency: EmkpUrgencyLevel;
  riskCategory: EmkpRiskCategory;
  recommendationLevel: EmkpRecommendationLevel;
  clinicalNotes: string[];
  evidenceLevel: EmkpEvidenceLevel;
  confidence: EmkpClinicalConfidence;
  guidelineReferences: EmkpGuidelineReference[];
  icd10?: string;
  snomed?: string;
}

export interface EmkpDifferentialNode {
  nodeId: string;
  label: string;
  diagnosisCode?: string;
  children: EmkpDifferentialNode[];
  distinguishingFeatures?: string[];
}

export interface EmkpLeadKnowledge {
  lead: string;
  territory: string;
  clinicalImportance: string;
  commonFindings: string[];
  associatedDiseases: string[];
  viewVector: string;
}

export interface EmkpTerminologyEntry {
  term: string;
  category: "wave" | "interval" | "segment" | "axis" | "morphology" | "rhythm" | "abbreviation" | "clinical" | "synonym";
  definition: string;
  synonyms: string[];
  abbreviations: string[];
  relatedTerms: string[];
}

export interface EmkpKnowledgePlatform {
  version: string;
  categories: EmkpKnowledgeCategory[];
  diseases: EmkpDiseaseEntry[];
  rules: EmkpClinicalRule[];
  differentialTrees: EmkpDifferentialNode[];
  leads: EmkpLeadKnowledge[];
  terminology: EmkpTerminologyEntry[];
  guidelines: EmkpGuidelineReference[];
}

export const EMKP_VERSION = "1.0.0";
export const EMKP_MODULE_ID = "ecg-medical-knowledge-platform";
