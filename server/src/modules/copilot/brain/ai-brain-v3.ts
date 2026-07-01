import { runIntentPipeline } from "../intent-pipeline";
import { tagForIntent } from "../intent-manager";
import { ConversationContextService } from "./conversation-context.service";
import { MemoryManager } from "./memory-manager";
import { ConversationStateManager } from "./conversation-state-manager";
import { ClinicalPlanner } from "./clinical-planner";
import { DecisionEngine } from "./decision-engine";
import type { BrainDebugPayload, BrainInput, BrainResult } from "./brain-types";

export const AI_BRAIN_VERSION = "v3" as const;

export function runAiBrainV3(input: BrainInput): BrainResult {
  const started = performance.now();
  const context = ConversationContextService.resolve({
    attachments: input.attachments,
    chatInput: input.chatInput,
    memory: input.memory,
  });
  const pipeline = runIntentPipeline({
    attachments: input.attachments,
    chatInput: input.chatInput,
    memory: input.memory,
    question: input.question,
  });
  const { classification, plan } = pipeline;
  const memoryState = ConversationStateManager.merge(
    input.conversationId,
    MemoryManager.build(input.memory, classification, context),
  );
  const clinicalPlan = ClinicalPlanner.build(plan, context, input);
  const decision = DecisionEngine.decide({
    chatInput: input.chatInput,
    classification,
    clinicalPlan,
    context,
    plan,
    question: input.question,
  });
  const medicalIntent = classification.primaryMedicalIntent;
  const tag = tagForIntent(medicalIntent, "Clinical Summary");
  return {
    classification,
    clinicalPlan,
    composeBase: {
      attachments: input.attachments,
      clarificationPrompt: classification.clarificationPrompt,
      clinicianName: input.clinicianName,
      intent: medicalIntent,
      memory: input.memory,
      question: input.question,
      requiresClarification: classification.requiresClarification,
    },
    decision,
    executionTimeMs: Math.max(0, Math.round(performance.now() - started)),
    medicalIntent,
    memoryState,
    plan,
    tag,
  };
}

export function buildBrainDebugPayload(brain: BrainResult): BrainDebugPayload {
  return {
    brainVersion: AI_BRAIN_VERSION,
    classification: brain.classification,
    clinicalPlan: brain.clinicalPlan,
    decision: brain.decision,
    executionTimeMs: brain.executionTimeMs,
    memoryState: brain.memoryState,
    plan: brain.plan,
  };
}

export function previewAiBrainV3(input: BrainInput) {
  return runAiBrainV3(input);
}
