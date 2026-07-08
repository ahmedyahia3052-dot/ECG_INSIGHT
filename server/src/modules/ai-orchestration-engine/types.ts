import type { AiInferenceResult } from "../../ai-foundation/types";
import type { ECGAnalysisOutput } from "../../ai/domain";
import type { EnterpriseEcgInterpretation } from "../ecg-interpretation-engine/types";
import type { MedicalIntelligenceReport } from "../medical-intelligence/types";
import type { LlmCompletionDTO } from "../../llm/types";

export const AI_ORCHESTRATION_ENGINE_VERSION = "sprint86-ai-orchestration-v1" as const;

export const ORCHESTRATION_STAGE_ORDER = [
  "VALIDATE",
  "LOAD_CONTEXT",
  "ECG_ANALYSIS",
  "CLINICAL_REASONING",
  "ECG_INTERPRETATION",
  "LLM_ENRICHMENT",
  "PERSIST",
  "COMPLETE",
] as const;

export type AiOrchestrationStageName = (typeof ORCHESTRATION_STAGE_ORDER)[number];

export const ORCHESTRATION_STAGE_PROGRESS: Record<AiOrchestrationStageName, number> = {
  VALIDATE: 5,
  LOAD_CONTEXT: 15,
  ECG_ANALYSIS: 30,
  CLINICAL_REASONING: 45,
  ECG_INTERPRETATION: 60,
  LLM_ENRICHMENT: 75,
  PERSIST: 90,
  COMPLETE: 100,
};

export type OrchestrationStageLogEntry = {
  durationMs?: number;
  message?: string;
  stage: AiOrchestrationStageName;
  status: "completed" | "failed" | "running" | "skipped" | "timed_out";
  timestamp: string;
};

export type OrchestrationProcessingLogEntry = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  stage?: AiOrchestrationStageName;
  timestamp: string;
};

export type AiOrchestrationJobResult = {
  analysisId: string;
  durationMs: number;
  ecgAnalysis?: AiInferenceResult<ECGAnalysisOutput>;
  clinicalReasoning?: AiInferenceResult<MedicalIntelligenceReport>;
  ecgInterpretation?: AiInferenceResult<EnterpriseEcgInterpretation>;
  engineVersion: string;
  llmEnrichment?: AiInferenceResult<LlmCompletionDTO>;
  providerUsed: string;
};

export type OrchestrationPipelineContext = {
  actorId: string;
  analysisId?: string;
  caseId: string;
  jobId: string;
  patientId?: string;
  pipelineKind: "FULL" | "ECG_ONLY" | "LLM_ONLY";
  providerPreference: "AUTO" | "OPENAI" | "OLLAMA" | "RULE_BASED";
  result?: AiOrchestrationJobResult;
  timeoutMs: number;
};

export type SerializedAiOrchestrationJob = {
  analysisId?: string;
  attemptCount: number;
  caseId: string;
  completedAt?: string;
  createdAt: string;
  engineVersion: string;
  errorCode?: string;
  errorMessage?: string;
  id: string;
  jobGroupId: string;
  maxAttempts: number;
  nextRetryAt?: string;
  patientId?: string;
  pipelineKind: string;
  processingLogs: OrchestrationProcessingLogEntry[];
  progress: number;
  providerPreference: string;
  requestedById: string;
  result?: AiOrchestrationJobResult;
  stage: AiOrchestrationStageName;
  stageLog: OrchestrationStageLogEntry[];
  startedAt?: string;
  status: string;
  timedOutAt?: string;
  timeoutMs: number;
  updatedAt: string;
};
