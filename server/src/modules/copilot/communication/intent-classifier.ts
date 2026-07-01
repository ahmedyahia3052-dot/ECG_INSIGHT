import type { IntentClassificationResult } from "../smart-intent-types";
import {
  INTENT_CONFIDENCE_THRESHOLD,
  mapSmartIntentToCommunicationIntent,
  type CommunicationIntent,
} from "./types";

export type CommunicationIntentResult = {
  clarificationPrompt?: string;
  confidence: number;
  intent: CommunicationIntent;
  requiresClarification: boolean;
};

const CLARIFICATION_PROMPT = "I want to make sure I help you correctly. Are you asking about ECG interpretation, a clinical concept, a patient record, an uploaded file, or something else?";

export const IntentClassifier = {
  classify(classification: IntentClassificationResult): CommunicationIntentResult {
    const intent = mapSmartIntentToCommunicationIntent(classification.primaryIntent);
    const confidence = classification.confidence;
    const lowConfidence = confidence < INTENT_CONFIDENCE_THRESHOLD && (intent === "Unknown" || classification.primaryIntent === "unknown");
    const requiresClarification = classification.requiresClarification || lowConfidence;
    return {
      clarificationPrompt: requiresClarification
        ? classification.clarificationPrompt ?? CLARIFICATION_PROMPT
        : undefined,
      confidence,
      intent,
      requiresClarification,
    };
  },
};
