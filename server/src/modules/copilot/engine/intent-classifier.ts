import type { ConversationMemory } from "../copilot-types";
import { classifySmartIntent } from "../intent-classifier";
import { mapSmartIntentToCommunicationIntent, type CommunicationIntent } from "./types";

export const INTENT_CONFIDENCE_THRESHOLD = 0.55;

const CLARIFICATION = "I want to make sure I understand you correctly — are you asking about a clinical concept, an ECG, a patient chart, an uploaded report, or something else?";

export const IntentClassifier = {
  classify(question: string, attachments: Parameters<typeof classifySmartIntent>[1], memory: ConversationMemory) {
    const result = classifySmartIntent(question, attachments, memory);
    const communicationIntent = mapSmartIntentToCommunicationIntent(result.primaryIntent);
    const lowConfidence = result.confidence < INTENT_CONFIDENCE_THRESHOLD && communicationIntent === "Unknown";
    const requiresClarification = result.requiresClarification || lowConfidence;
    return {
      classification: result,
      clarificationPrompt: requiresClarification ? result.clarificationPrompt ?? CLARIFICATION : undefined,
      communicationIntent,
      intentConfidence: result.confidence,
      requiresClarification,
    };
  },
};

export type IntentStageResult = ReturnType<typeof IntentClassifier.classify>;
