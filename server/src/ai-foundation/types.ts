import type { ECGAnalysisInput, ECGAnalysisOutput } from "../ai/domain";
import type { LlmCompletionDTO, LlmGenerateInput } from "../llm/types";
import type { EcgClinicalMeasurementResult } from "../modules/ecg-measurement/types";
import type { EnterpriseEcgInterpretation } from "../modules/ecg-interpretation-engine/types";
import type { MedicalIntelligenceReport } from "../modules/medical-intelligence/types";

export const AI_FOUNDATION_ID = "ecg-insight-ai-foundation";

export type AiInferenceKind = "ecg_analysis" | "llm_chat" | "clinical_reasoning" | "ecg_interpretation";

export type AiProviderKind = "ecg" | "llm";

export type AiAuditAction =
  | "AI_INFERENCE_QUEUED"
  | "AI_INFERENCE_STARTED"
  | "AI_INFERENCE_COMPLETED"
  | "AI_INFERENCE_FAILED"
  | "AI_INFERENCE_CACHED"
  | "AI_INFERENCE_RATE_LIMITED"
  | "AI_PROMPT_RENDERED"
  | "AI_VALIDATION_FAILED";

export interface AiActorContext {
  actorId?: string;
  organizationId?: string;
  caseId?: string;
  patientId?: string;
}

export interface AiVersionTag {
  foundationVersion: string;
  engineVersion?: string;
  modelVersion?: string;
  promptVersion?: string;
  providerName?: string;
}

export interface AiConfidenceResult {
  level: "high" | "medium" | "low" | "unknown";
  score: number;
  explanation: string;
  factors: Array<{ factor: string; impact: "positive" | "negative" | "neutral"; weight: number }>;
}

export interface AiExplainabilityBundle {
  summary: string;
  visual?: Record<string, unknown>;
  evidence?: {
    supportingEvidence: string[];
    conflictingEvidence: string[];
    missingEvidence: string[];
    alternatives: string[];
  };
}

export interface AiStructuredEcgOutput {
  primaryDiagnosis: string;
  confidenceScore: number;
  clinicalSeverity: string;
  interpretation: string;
  recommendations: string[];
  urgentActions: string[];
  detectedAbnormalities: string[];
  rhythm: string;
  heartRate: number;
}

export interface AiInferenceRequest {
  kind: AiInferenceKind;
  actor?: AiActorContext;
  cacheKey?: string;
  skipCache?: boolean;
  promptId?: string;
  promptVariables?: Record<string, string>;
  ecgInput?: ECGAnalysisInput;
  llmInput?: LlmGenerateInput;
  measurement?: EcgClinicalMeasurementResult;
}

export interface AiInferenceResult<T = unknown> {
  kind: AiInferenceKind;
  output: T;
  version: AiVersionTag;
  confidence?: AiConfidenceResult;
  explainability?: AiExplainabilityBundle;
  validation: { valid: boolean; errors: string[] };
  cached: boolean;
  latencyMs: number;
  auditId?: string;
}

export type EcgAnalysisInferenceResult = AiInferenceResult<ECGAnalysisOutput>;
export type LlmInferenceResult = AiInferenceResult<LlmCompletionDTO>;
export type ClinicalReasoningResult = AiInferenceResult<MedicalIntelligenceReport>;
export type EcgInterpretationInferenceResult = AiInferenceResult<EnterpriseEcgInterpretation>;
