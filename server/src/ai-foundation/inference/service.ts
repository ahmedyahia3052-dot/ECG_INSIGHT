import { AppError } from "../../middleware/error";
import { mapApiMessagesToChatMessages } from "../../llm/llm-client";
import { resolveLlmProvider } from "../../llm/llm-registry";
import { recordInferenceAudit } from "../audit/service";
import { InferenceCache, inferenceResultCache } from "../cache/inference-cache";
import { scoreEcgAnalysisConfidence, scoreLlmConfidence } from "../confidence/service";
import { toClinicalReasoningResult } from "../clinical-reasoning/service";
import { toEcgInterpretationResult } from "../ecg-interpretation/interface";
import { buildEcgExplainability, buildLlmExplainability } from "../explainability/service";
import { getEcgProviderHandle } from "../providers/registry";
import { promptManager } from "../prompts/manager";
import { checkAiRateLimit } from "../rate-limit/service";
import type { AiInferenceRequest, AiInferenceResult } from "../types";
import { buildVersionTag } from "../version";
import { validateEcgOutput, validateInferenceRequest } from "../validation/input-validator";
import { validateMedicalEcgOutput } from "../validation/medical-validator";

function resolveCacheKey(request: AiInferenceRequest): string | undefined {
  if (request.cacheKey) return request.cacheKey;
  if (request.kind === "ecg_analysis" && request.ecgInput?.case?.id) {
    return InferenceCache.hashKey(["ecg_analysis", request.ecgInput.case.id, request.ecgInput.measurement?.id ?? "none"]);
  }
  if (request.kind === "clinical_reasoning" && request.measurement) {
    return InferenceCache.hashKey(["clinical_reasoning", request.measurement]);
  }
  return undefined;
}

export async function runInference<T = unknown>(request: AiInferenceRequest): Promise<AiInferenceResult<T>> {
  const started = Date.now();
  const validation = validateInferenceRequest(request);
  if (!validation.valid) {
    await recordInferenceAudit("AI_VALIDATION_FAILED", request.actor, {
      error: validation.errors.join("; "),
      kind: request.kind,
    });
    throw new AppError(400, validation.errors.join("; "), "AI_VALIDATION_FAILED");
  }

  const actorId = request.actor?.actorId ?? "anonymous";
  const rateLimit = checkAiRateLimit(actorId, request.kind);
  if (!rateLimit.allowed) {
    await recordInferenceAudit("AI_INFERENCE_RATE_LIMITED", request.actor, { kind: request.kind });
    throw new AppError(429, "AI inference rate limit exceeded.", "AI_RATE_LIMITED");
  }

  const cacheKey = !request.skipCache ? resolveCacheKey(request) : undefined;
  if (cacheKey) {
    const cached = inferenceResultCache.get(cacheKey) as AiInferenceResult<T> | undefined;
    if (cached) {
      await recordInferenceAudit("AI_INFERENCE_CACHED", request.actor, { cached: true, kind: request.kind });
      return { ...cached, cached: true, latencyMs: Date.now() - started };
    }
  }

  await recordInferenceAudit("AI_INFERENCE_STARTED", request.actor, { kind: request.kind });

  try {
    let result: AiInferenceResult<T>;

    switch (request.kind) {
      case "ecg_analysis":
        result = await runEcgInference(request, started) as AiInferenceResult<T>;
        break;
      case "llm_chat":
        result = await runLlmInference(request, started) as AiInferenceResult<T>;
        break;
      case "clinical_reasoning":
        result = toClinicalReasoningResult(
          { measurement: request.measurement!, clinicalContext: undefined },
          Date.now() - started,
        ) as AiInferenceResult<T>;
        break;
      case "ecg_interpretation":
        result = toEcgInterpretationResult(
          { caseId: request.actor?.caseId, measurement: request.measurement! },
          Date.now() - started,
        ) as AiInferenceResult<T>;
        break;
      default:
        throw new AppError(400, `Unsupported inference kind: ${request.kind}`, "AI_UNSUPPORTED_KIND");
    }

    if (cacheKey && result.validation.valid) {
      inferenceResultCache.set(cacheKey, result);
    }

    const auditId = await recordInferenceAudit("AI_INFERENCE_COMPLETED", request.actor, {
      cached: false,
      kind: request.kind,
      latencyMs: result.latencyMs,
      modelVersion: result.version.modelVersion,
      providerName: result.version.providerName,
    });

    return { ...result, auditId };
  } catch (error) {
    await recordInferenceAudit("AI_INFERENCE_FAILED", request.actor, {
      error: error instanceof Error ? error.message : "unknown error",
      kind: request.kind,
    });
    throw error;
  }
}

async function runEcgInference(request: AiInferenceRequest, started: number): Promise<AiInferenceResult> {
  const handle = getEcgProviderHandle();
  if (handle.kind !== "ecg") {
    throw new AppError(503, "ECG provider unavailable.", "ECG_PROVIDER_UNAVAILABLE");
  }

  const output = await handle.provider.analyze({
    ...request.ecgInput!,
    actorId: request.actor?.actorId,
  });

  const structuralValidation = validateEcgOutput(output);
  const medicalValidation = validateMedicalEcgOutput(output);
  const combinedValidation = {
    errors: [...structuralValidation.errors, ...medicalValidation.errors],
    valid: structuralValidation.valid && medicalValidation.valid,
  };

  const confidence = scoreEcgAnalysisConfidence(output);
  const explainability = buildEcgExplainability(output, request.ecgInput?.measurement);

  return {
    cached: false,
    confidence,
    explainability,
    kind: "ecg_analysis",
    latencyMs: Date.now() - started,
    output,
    validation: combinedValidation,
    version: buildVersionTag({
      modelVersion: handle.provider.modelVersion,
      providerName: handle.provider.name,
    }),
  };
}

async function runLlmInference(request: AiInferenceRequest, started: number): Promise<AiInferenceResult> {
  let messages = request.llmInput!.messages;

  if (request.promptId) {
    const rendered = promptManager.render(request.promptId, { variables: request.promptVariables });
    await recordInferenceAudit("AI_PROMPT_RENDERED", request.actor, {
      kind: request.kind,
      promptHash: rendered.hash,
    });
    messages = [{ content: rendered.content, role: "system" }, ...messages];
  }

  const provider = await resolveLlmProvider();
  const chatMessages = mapApiMessagesToChatMessages(
    messages.map((message) => ({
      content: message.content,
      role: message.role,
    })),
  );

  if (!chatMessages.length) {
    throw new AppError(400, "No valid LLM messages after prompt rendering.", "LLM_EMPTY_MESSAGES");
  }

  const completion = await provider.generateChat({
    messages: chatMessages,
    temperature: request.llmInput?.temperature,
  });

  const confidence = scoreLlmConfidence(completion.content);
  const explainability = buildLlmExplainability(completion.content, request.promptId);

  return {
    cached: false,
    confidence,
    explainability,
    kind: "llm_chat",
    latencyMs: Date.now() - started,
    output: completion,
    validation: { errors: [], valid: Boolean(completion.content?.trim()) },
    version: buildVersionTag({
      modelVersion: completion.model,
      promptVersion: request.promptId,
      providerName: provider.providerName,
    }),
  };
}
