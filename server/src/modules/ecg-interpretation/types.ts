export type InterpretationSeverity = "normal" | "minor" | "abnormal" | "urgent" | "critical";

export type InterpretationCategory =
  | "axis"
  | "conduction"
  | "electrolyte"
  | "hypertrophy"
  | "ischemia"
  | "rhythm";

export interface InterpretationEvidence {
  feature: string;
  value: string;
}

export interface ClinicalFinding {
  category: InterpretationCategory;
  code: string;
  confidence: number;
  evidence: InterpretationEvidence[];
  label: string;
  severity: InterpretationSeverity;
  triggeredBy: string[];
}

export interface EcgClinicalInterpretation {
  confidence: number;
  findings: ClinicalFinding[];
  markdownReport: string;
  measurementsUsed: Record<string, number | string>;
  primaryDiagnosis: string;
  recommendations: string[];
  report: {
    confidence: number;
    evidence: InterpretationEvidence[];
    findings: string[];
    measurementsUsed: Record<string, number | string>;
    recommendations: string[];
    summary: string;
    urgency: InterpretationSeverity;
  };
  severity: InterpretationSeverity;
  urgency: InterpretationSeverity;
}

export interface InterpretMeasurementInput {
  measurement: import("../ecg-measurement/types").EcgClinicalMeasurementResult;
}
