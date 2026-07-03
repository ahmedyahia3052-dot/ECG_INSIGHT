import type { InterpretationSeverity } from "../ecg-interpretation/types";
import type { AiDiagnosisLabel } from "./diagnosis-codes";

export interface AiDiagnosisCandidate {
  agreementWithRules: number;
  confidence: number;
  evidence: string[];
  label: AiDiagnosisLabel;
  probability: number;
  source: "deep_learning" | "measurement" | "rules";
}

export interface EcgAiDiagnosisResult {
  agreementWithRules: number;
  clinicalReasoning: string;
  confidence: number;
  disagreementExplanation: string;
  ensembleSources: string[];
  evidence: string[];
  markdownReport: string;
  primaryDiagnosis: AiDiagnosisLabel;
  recommendations: string[];
  topDiagnoses: AiDiagnosisCandidate[];
  urgency: InterpretationSeverity;
}
