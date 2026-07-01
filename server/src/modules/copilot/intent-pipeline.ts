import { classifySmartIntent } from "./intent-classifier";
import { planConversation } from "./conversation-planner";
import type { IntentPipelineInput, IntentPipelineResult } from "./smart-intent-types";

export function runIntentPipeline(input: IntentPipelineInput): IntentPipelineResult {
  const classification = classifySmartIntent(input.question, input.attachments, input.memory);
  const plan = planConversation(classification, input.chatInput, input.attachments, input.memory);
  return { classification, plan };
}

export function parseCopilotProviderSettings(provider: string) {
  if (provider.startsWith("{")) {
    try {
      const parsed = JSON.parse(provider) as { classifier?: string; brainVersion?: string; developerMode?: boolean };
      return {
        brainVersion: parsed.brainVersion ?? "v3",
        classifier: parsed.classifier ?? "SmartIntentClassifier",
        developerMode: Boolean(parsed.developerMode),
      };
    } catch {
      return { classifier: provider, developerMode: false };
    }
  }
  return {
    brainVersion: "v3",
    classifier: provider === "RuleBasedRAG" ? "SmartIntentClassifier" : provider,
    developerMode: provider.includes("Debug"),
  };
}
