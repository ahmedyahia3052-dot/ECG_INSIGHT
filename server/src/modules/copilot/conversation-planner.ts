import type { ChatContextInput } from "./copilot-types";
import { mapSmartIntentToMedicalIntent } from "./intent-classifier";
import { resolveConversationContext } from "./context-resolver";
import { routeTools } from "./tool-router";
import type { ConversationPlan, IntentClassificationResult } from "./smart-intent-types";

export function planConversation(classification: IntentClassificationResult, chatInput: ChatContextInput, attachments: Parameters<typeof resolveConversationContext>[0]["attachments"], memory: Parameters<typeof resolveConversationContext>[0]["memory"]): ConversationPlan {
  const context = resolveConversationContext({ attachments, chatInput, memory });
  const routed = routeTools(classification, context, chatInput);
  const steps = classification.intents.map((match, index) => ({
    intent: match.intent,
    medicalIntent: mapSmartIntentToMedicalIntent(match.intent),
    note: index === 0 ? "primary-step" : "secondary-step",
    tools: routeTools({ ...classification, intents: [match], primaryIntent: match.intent, primaryMedicalIntent: mapSmartIntentToMedicalIntent(match.intent) }, context, chatInput).tools,
  }));
  return {
    clarificationPrompt: classification.clarificationPrompt,
    context: {
      ...context,
      clarificationPrompt: classification.clarificationPrompt,
      requiresClarification: classification.requiresClarification,
    },
    emergencyPriority: classification.emergencyPriority,
    requiresClarification: classification.requiresClarification,
    steps,
    tools: routed.tools,
  };
}
