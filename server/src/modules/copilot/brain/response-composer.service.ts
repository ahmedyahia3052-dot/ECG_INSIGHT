import { composeConversationalResponse } from "../conversational-engine";
import { emptyClinicalContext } from "../intent-manager";
import type { BrainResponseInput } from "./brain-types";

export const ResponseComposer = {
  compose(input: BrainResponseInput) {
    const { brain, clinicalContext, knowledgeHits, storedCitations } = input;
    const context = brain.medicalIntent === "show_sources" && storedCitations?.length
      ? { ...emptyClinicalContext(), sources: storedCitations }
      : clinicalContext;
    const result = composeConversationalResponse({
      attachments: brain.composeBase.attachments,
      clarificationPrompt: brain.composeBase.clarificationPrompt,
      clinicianName: brain.composeBase.clinicianName,
      context,
      intent: brain.composeBase.intent,
      knowledge: knowledgeHits,
      memory: brain.composeBase.memory,
      question: brain.composeBase.question,
      requiresClarification: brain.composeBase.requiresClarification,
    });
    return {
      citations: result.citations,
      confidence: null,
      content: result.content,
    };
  },
};
