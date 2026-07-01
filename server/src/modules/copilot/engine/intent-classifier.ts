import type { CommunicationIntent } from "./types";

// Legacy shim — tool routing is handled inside Clinical AI Core V2 pipeline.
export const IntentClassifier = {
  classify() {
    throw new Error("IntentClassifier is deprecated in Clinical AI Core V2. Use runClinicalCopilotEngine.");
  },
};

export const INTENT_CONFIDENCE_THRESHOLD = 0.55;
