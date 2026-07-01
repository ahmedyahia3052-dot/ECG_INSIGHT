import { conversationPatientHint, conversationTopic } from "../intent-helpers";
import type { ConversationMemory } from "../copilot-types";
import type { ConversationContextSnapshot } from "./conversation-context.service";
import type { ConversationMemoryState } from "./brain-types";
import type { IntentClassificationResult } from "../smart-intent-types";

export const MemoryManager = {
  build(memory: ConversationMemory, classification: IntentClassificationResult, context: ConversationContextSnapshot): ConversationMemoryState {
    const hint = conversationPatientHint(memory);
    const topic = conversationTopic(memory) || context.discussionTopic;
    const followUpTopics = Array.from(new Set([
      topic,
      ...classification.entities.diseases,
      ...classification.intents.slice(1).map((entry) => entry.intent.replace(/_/g, " ")),
    ].filter(Boolean))).slice(0, 6);
    return {
      currentDiscussionTopic: topic,
      currentPatientAge: hint.age ?? classification.entities.ages[0],
      currentPatientGender: hint.gender ?? classification.entities.genders[0],
      currentPatientName: context.patientName ?? classification.entities.patientNames[0],
      followUpTopics,
      hasActiveCase: context.hasActiveCase,
      hasActivePatient: context.hasActivePatient || Boolean(context.patientName),
      hasUploadedEcg: context.hasUploadedEcg,
      hasUploadedFiles: context.hasUploadedFiles,
      hasUploadedReport: context.hasUploadedReport,
      turnCount: memory.turns.length,
    };
  },
};
