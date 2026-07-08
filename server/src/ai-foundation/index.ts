export { AI_FOUNDATION_VERSION, buildVersionTag, formatVersionTag } from "./version";
export { AI_FOUNDATION_ID } from "./types";
export type {
  AiActorContext,
  AiAuditAction,
  AiConfidenceResult,
  AiExplainabilityBundle,
  AiInferenceKind,
  AiInferenceRequest,
  AiInferenceResult,
  AiProviderKind,
  AiStructuredEcgOutput,
  AiVersionTag,
  ClinicalReasoningResult,
  EcgAnalysisInferenceResult,
  EcgInterpretationInferenceResult,
  LlmInferenceResult,
} from "./types";

export { getEcgProviderHandle, getLlmProviderHandle, listProviderDescriptors, describeEcgProvider, describeLlmProvider } from "./providers/registry";
export type { UnifiedProviderDescriptor, UnifiedProviderHandle } from "./providers/types";

export { promptManager, PromptManager, renderPromptById, hashPromptContent, listManagedPrompts } from "./prompts/manager";
export type { PromptTemplate, RenderedPrompt, PromptRenderContext } from "./prompts/types";
export { PROMPT_CATALOG, getPromptById } from "./prompts/catalog";

export { runInference } from "./inference/service";
export { executeAiInference, getAiFoundationHealth, getAiFoundationStatus } from "./foundation.service";
export { aiFoundationRouter } from "./foundation.routes";

export {
  scoreEcgAnalysisConfidence,
  scoreClinicalReasoningConfidence,
  scoreLlmConfidence,
} from "./confidence/service";

export {
  buildEcgExplainability,
  buildClinicalExplainability,
  buildLlmExplainability,
} from "./explainability/service";

export { runClinicalReasoning, toClinicalReasoningResult } from "./clinical-reasoning/service";

export {
  ecgInterpretationModel,
  runEcgInterpretation,
  toEcgInterpretationResult,
  EnterpriseEcgInterpretationModel,
} from "./ecg-interpretation/interface";
export type { EcgInterpretationModel, EcgInterpretationModelInput } from "./ecg-interpretation/interface";

export { recordAiAuditEvent, recordInferenceAudit } from "./audit/service";
export { InferenceCache, inferenceResultCache } from "./cache/inference-cache";
export { checkAiRateLimit, resetAiRateLimits } from "./rate-limit/service";

export {
  validateInferenceRequest,
  validateEcgOutput,
  validateInferenceKind,
} from "./validation/input-validator";
export {
  validateMedicalEcgOutput,
  validateMedicalIntelligenceReport,
  requiresPhysicianReview,
} from "./validation/medical-validator";
export {
  structuredEcgOutputSchema,
  structuredLlmOutputSchema,
  inferenceRequestSchema,
  promptRenderRequestSchema,
} from "./validation/schemas";
