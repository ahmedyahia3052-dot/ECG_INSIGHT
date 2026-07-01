import type { ChatContextInput, ClinicalContext } from "../copilot-types";
import type { EngineDebugPayload, EngineInput, EngineResult } from "./types";
import { CLINICAL_AI_ENGINE_VERSION } from "./types";
import { runClinicalAiV3, toV3EngineResult } from "../v3/pipeline";
import type { V3StreamCallbacks } from "../v3/types";

export type EngineDependencies = {
  retrieveClinicalContext: (input: ChatContextInput) => Promise<ClinicalContext>;
};

export async function runClinicalCopilotEngine(
  input: EngineInput,
  deps: EngineDependencies,
  callbacks: V3StreamCallbacks = {},
): Promise<EngineResult> {
  const started = performance.now();
  const pipeline = await runClinicalAiV3(
    {
      attachments: input.attachments,
      chatInput: input.chatInput,
      clinicianName: input.clinicianName,
      conversationId: input.conversationId,
      memory: input.memory,
      question: input.question,
      voiceMode: input.voiceMode,
    },
    deps,
    callbacks,
  );
  return toV3EngineResult(input, pipeline, Math.max(0, Math.round(performance.now() - started)));
}

export async function previewClinicalCopilotEngine(_input: EngineInput, _deps: EngineDependencies) {
  return {
    toolPlan: {
      runClinicalContext: false,
      runDrugDatabase: false,
      runEcgEngine: false,
      runKnowledge: false,
      runOcr: false,
      runPatientDatabase: false,
      runReportGenerator: false,
      tools: ["conversation"] as const,
    },
  };
}

export function buildEngineDebugPayload(engine: EngineResult): EngineDebugPayload {
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
    executionTimeMs: engine.executionTimeMs,
    knowledgeRoute: engine.knowledgeRoute,
    plan: engine.plan,
    toolPlan: engine.toolPlan,
  };
}
