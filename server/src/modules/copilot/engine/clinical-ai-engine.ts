import type { ChatContextInput, ClinicalContext } from "../copilot-types";
import { runClinicalAiCoreV2 } from "./v2/pipeline";
import { buildMinimalDebugPayload } from "./v2/compat";
import type { EngineDebugPayload, EngineInput, EngineResult } from "./types";
import { CLINICAL_AI_ENGINE_VERSION } from "./types";

export type EngineDependencies = {
  retrieveClinicalContext: (input: ChatContextInput) => Promise<ClinicalContext>;
};

export async function runClinicalCopilotEngine(
  input: EngineInput,
  deps: EngineDependencies,
): Promise<EngineResult> {
  return runClinicalAiCoreV2(input, deps);
}

export function previewClinicalCopilotEngine(input: EngineInput, deps: EngineDependencies) {
  return runClinicalCopilotEngine(input, deps);
}

export function buildEngineDebugPayload(engine: EngineResult): EngineDebugPayload {
  const minimal = buildMinimalDebugPayload(engine);
  return {
    classification: engine.classification,
    communicationIntent: engine.communicationIntent,
    context: engine.context,
    conversationState: engine.conversationState
      ? {
          conversationSummary: engine.conversationState.conversationSummary,
          currentTopic: engine.conversationState.currentTopic,
          isFollowUp: engine.conversationState.isFollowUp,
          previousTopic: engine.conversationState.previousTopic,
          voiceActive: engine.conversationState.voiceActive,
          voiceStatus: engine.conversationState.voiceStatus,
        }
      : undefined,
    engineVersion: CLINICAL_AI_ENGINE_VERSION,
    executionTimeMs: minimal.executionTimeMs,
    knowledgeRoute: engine.knowledgeRoute,
    plan: engine.plan,
    toolPlan: engine.toolPlan,
  };
}

