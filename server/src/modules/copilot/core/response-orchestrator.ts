import type { CorePipelineDeps, CoreStreamCallbacks, CoreTurnContext } from "./types";
import { runLlmWithTools } from "../v3/llm-provider";
import { PromptBuilder } from "../prompt/prompt-builder";

export const ResponseOrchestrator = {
  async generate(
    turn: CoreTurnContext,
    deps: CorePipelineDeps,
    callbacks: CoreStreamCallbacks = {},
  ) {
    const needsClinicalContext = Boolean(
      turn.input.chatInput.patientId
      || turn.input.chatInput.caseId
      || turn.intent.allowPatientTools,
    );

    const clinical = needsClinicalContext
      ? await deps.retrieveClinicalContext(turn.input.chatInput)
      : null;

    const prompt = await PromptBuilder.buildForTurn(turn, {
      clinicalContext: clinical,
      onStatus: callbacks.onStatus,
    });

    const llm = await runLlmWithTools({
      messages: prompt.messages,
      onStatus: callbacks.onStatus,
      onToken: callbacks.onToken,
      runTool: async () => ({}),
      toolsEnabled: false,
    });

    return {
      content: llm.content,
      knowledgeHits: prompt.knowledgeHits,
      model: llm.model,
      toolCallsUsed: prompt.knowledgeHits.length ? ["medical_knowledge_search"] as string[] : [],
    };
  },
};

/** @deprecated use ResponseOrchestrator */
export const MedicalResponseOrchestrator = ResponseOrchestrator;
