import type { EcgLeadId } from "../types";

export type CdssSeverity =
  | "normal"
  | "low_risk"
  | "moderate"
  | "high_risk"
  | "critical"
  | "life_threatening";

export type CdssTriageLevel = "green" | "yellow" | "orange" | "red" | "black";

export type CdssGuidelineSource = "ACC/AHA" | "ESC" | "Universal Definition of MI";

export type CdssRuleId =
  | "normal_ecg"
  | "sinus_rhythm"
  | "sinus_bradycardia"
  | "sinus_tachycardia"
  | "atrial_fibrillation"
  | "atrial_flutter"
  | "pac"
  | "pvc"
  | "first_degree_av_block"
  | "second_degree_av_block"
  | "complete_heart_block"
  | "rbbb"
  | "lbbb"
  | "left_axis_deviation"
  | "right_axis_deviation"
  | "lvh"
  | "rvh"
  | "early_repolarization"
  | "qt_prolongation"
  | "short_qt"
  | "wpw"
  | "brugada_pattern"
  | "pericarditis"
  | "hyperkalemia_pattern"
  | "hypokalemia_pattern"
  | "pulmonary_embolism_pattern"
  | "anterior_stemi"
  | "inferior_stemi"
  | "lateral_stemi"
  | "posterior_mi_suspicion"
  | "nstemi_suspicion";

export type CdssExplainableEvidence = {
  affectedLeads: EcgLeadId[];
  axis?: string;
  measurements: string[];
  morphology: string[];
  reasoning: string;
  rhythm?: string;
};

export type CdssRuleEvaluation = {
  confidence: number;
  contradictingFindings: string[];
  diagnosis: string;
  evidence: CdssExplainableEvidence;
  matched: boolean;
  ruleId: CdssRuleId;
  severity: CdssSeverity;
  supportingFindings: string[];
};

export type CdssDifferentialRow = {
  clinicalConfidence: number;
  contradictingFindings: string[];
  diagnosis: string;
  probability: number;
  supportingFindings: string[];
};

export type CdssRecommendation = {
  action: string;
  linkedDiagnoses: string[];
  linkedFindings: string[];
  linkedMeasurements: string[];
  priority: "routine" | "urgent" | "emergent";
  rationale: string;
};

export type CdssGuidelineReference = {
  evidenceLevel: string;
  recommendationClass: string;
  source: CdssGuidelineSource;
  statement: string;
  topic: string;
};

export type CdssConfidenceMetric = {
  label: string;
  percent: number;
};

export type CdssRelationshipNode = {
  id: string;
  kind: "measurement" | "finding" | "diagnosis" | "recommendation";
  label: string;
};

export type CdssRelationshipEdge = {
  from: string;
  label: string;
  to: string;
};

export type CdssRelationshipGraph = {
  edges: CdssRelationshipEdge[];
  nodes: CdssRelationshipNode[];
};

export type CdssClinicalAssessment = {
  finalDiagnosis: string;
  overallConfidence: number;
  pipelineStage: string;
  reasoning: string;
  severity: CdssSeverity;
  triage: CdssTriageLevel;
};

export type CdssWorkspaceModel = {
  assessment: CdssClinicalAssessment;
  confidence: CdssConfidenceMetric[];
  differential: CdssDifferentialRow[];
  evaluatedAt: string;
  guidelines: CdssGuidelineReference[];
  loaded: boolean;
  primaryRules: CdssRuleEvaluation[];
  recommendations: CdssRecommendation[];
  relationshipGraph: CdssRelationshipGraph;
  summary: string;
};

export type EnterpriseClinicalDecisionSection = {
  assessment: CdssClinicalAssessment;
  differential: CdssDifferentialRow[];
  guidelines: CdssGuidelineReference[];
  primaryDiagnosis: CdssRuleEvaluation | null;
  recommendations: CdssRecommendation[];
  relationshipSummary: string;
  triageLabel: string;
};
