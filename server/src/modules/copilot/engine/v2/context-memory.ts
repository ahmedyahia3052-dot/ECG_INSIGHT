import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory } from "../../copilot-types";
import { ContextManager } from "../context-manager";
import { ConversationManager } from "../conversation-manager";
import type { ContextState } from "../types";

export type MemorySnapshot = {
  contextState: ContextState;
  isFollowUp: boolean;
  session: ReturnType<typeof ConversationManager.get>;
};

export const ContextMemory = {
  load(input: {
    attachments: AttachmentForAnalysis[];
    chatInput: ChatContextInput;
    conversationId: string;
    memory: ConversationMemory;
    question: string;
  }): MemorySnapshot {
    const session = ConversationManager.get(input.conversationId);
    const contextState = ContextManager.build({
      attachments: input.attachments,
      chatInput: input.chatInput,
      memory: input.memory,
      previousTopicStack: session?.topicStack ?? [],
      question: input.question,
    });
    const isFollowUp = ContextManager.isFollowUp(
      input.question,
      contextState.activeTopic,
      input.memory,
    );
    return { contextState, isFollowUp, session };
  },

  persist(input: {
    conversationId: string;
    contextState: ContextState;
    educationalMode: boolean;
    educationalTopic: "ecg_basics" | "general_medicine" | "none";
    isFollowUp: boolean;
    learningStep: number;
    memory: ConversationMemory;
    mode: string;
    voiceMode?: boolean;
  }) {
    return ConversationManager.upsert({
      conversationId: input.conversationId,
      educationalMode: input.educationalMode,
      educationalTopic: input.educationalTopic,
      entityMemory: input.contextState.entityMemory,
      intent: mapModeToLegacyIntent(input.mode),
      isFollowUp: input.isFollowUp,
      learningStep: input.learningStep,
      memory: input.memory,
      topicStack: input.contextState.topicStack,
      turnCount: input.memory.turns.length + 1,
      voiceActive: Boolean(input.voiceMode),
      voiceStatus: input.voiceMode ? "thinking" : "idle",
    });
  },
};

function mapModeToLegacyIntent(mode: string) {
  switch (mode) {
    case "greeting": return "Greeting" as const;
    case "small_talk": return "SmallTalk" as const;
    case "education": return "Education" as const;
    case "emergency": return "EmergencyAdvice" as const;
    case "patient_context": return "PatientLookup" as const;
    case "vision_review": return "ImageInterpretation" as const;
    case "follow_up": return "FollowUpQuestion" as const;
    default: return "MedicalQuestion" as const;
  }
}
