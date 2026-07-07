/** Sprint 40 — Medical Intelligence Core (MIC) canonical types */

export type MicDiagnosisCategory =
  | "arrhythmia"
  | "conduction"
  | "electrolyte"
  | "hypertrophy"
  | "ischemia"
  | "other"
  | "rhythm";

export type MicEmergencyLevel = "critical" | "emergent" | "routine" | "urgent";
export type MicSeverity = "abnormal" | "critical" | "minor" | "normal" | "urgent";
export type MicRiskLevel = "critical" | "high" | "intermediate" | "low";

export type MicGuidelineOrganization = "ACC/AHA" | "AHA" | "ESC" | "OTHER";

export interface MicReference {
  organization: string;
  title: string;
  url?: string;
  year?: number;
}

export interface MicDiagnosisEntry {
  associatedSymptoms: string[];
  category: MicDiagnosisCategory;
  clinicalSignificance: string;
  code: string;
  definition: string;
  diagnosticCriteria: string[];
  differentialDiagnosis: string[];
  emergencyLevel: MicEmergencyLevel;
  icd10Code?: string;
  libraryTags: string[];
  name: string;
  possibleCauses: string[];
  recommendedNextSteps: string[];
  references: MicReference[];
  severity: MicSeverity;
  snomedCode?: string;
  typicalFindings: string[];
}

export interface MicArrhythmiaEntity {
  code: string;
  description: string;
  diagnosisCode: string;
  emergencyLevel: MicEmergencyLevel;
  keyFeatures: string[];
  name: string;
  treatmentNotes: string[];
}

export interface MicIschemiaEntity {
  affectedLeads: string[];
  code: string;
  description: string;
  diagnosisCode: string;
  emergencyLevel: MicEmergencyLevel;
  name: string;
  pattern: "anterior" | "diffuse" | "inferior" | "lateral" | "nSTEMI" | "posterior" | "right_ventricular" | "septal" | "st_depression" | "t_wave";
  stCriteria: string[];
  territory?: string;
}

export interface MicMeasurementReference {
  borderlineHigh?: number;
  borderlineLow?: number;
  hypertrophyCriteria?: string[];
  normalMax?: number;
  normalMin?: number;
  notes: string[];
  parameter: string;
  references: MicReference[];
  unit: string;
}

export interface MicRecommendationEntry {
  action: string;
  diagnosisCode: string;
  priority: "immediate" | "optional" | "routine" | "urgent";
  rationale: string;
  type: string;
}

export interface MicDifferentialResult {
  code: string;
  confidence: number;
  distinguishingFeatures: string[];
  label: string;
  rank: number;
  rationale: string;
}

export interface MicRiskAssessment {
  contributingFactors: string[];
  level: MicRiskLevel;
  rationale: string;
  ruleId: string;
}

export interface MicGuidelineEntry {
  applicableCategories: MicDiagnosisCategory[];
  id: string;
  organization: MicGuidelineOrganization;
  title: string;
  url?: string;
  version?: string;
  year?: number;
}

export const MIC_ENGINE_ID = "ecg-medical-intelligence-core";
export const MIC_ENGINE_VERSION = "1.0.0";
