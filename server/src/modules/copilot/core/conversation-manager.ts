import type { ConversationMemory } from "../copilot-types";
import type { CommunicationIntent } from "../engine/types";
import { ConversationManager, type SessionRecord } from "../engine/conversation-manager";
import type { CorePipelineInput } from "./types";

export type ConversationTurnContext = {
  conversationId: string;
  input: CorePipelineInput;
  session: SessionRecord;
};

export const CoreConversationManager = {
  beginTurn(input: CorePipelineInput): ConversationTurnContext {
    const existing = ConversationManager.get(input.conversationId);
    const session = existing ?? {
      conversationId: input.conversationId,
      conversationSummary: input.memory.summary,
      currentTopic: null,
      educationalMode: false,
      educationalTopic: "none",
      entities: { ages: [], diseases: [], drugs: [], patientNames: [] },
      isFollowUp: input.memory.turns.length >= 2,
      lastIntent: "Unknown",
      learningStep: 0,
      previousTopic: null,
      topicStack: [],
      turnCount: input.memory.turns.length,
      voiceActive: Boolean(input.voiceMode),
      voiceStatus: input.voiceMode ? "listening" : "idle",
    };

    if (input.voiceMode) {
      ConversationManager.setVoiceActive(input.conversationId, true, "thinking");
    }

    return { conversationId: input.conversationId, input, session };
  },

  completeTurn(input: {
    communicationIntent: CommunicationIntent;
    conversationId: string;
    educationalMode: boolean;
    educationalTopic: SessionRecord["educationalTopic"];
    entityMemory: SessionRecord["entities"];
    isFollowUp: boolean;
    learningStep: number;
    memory: ConversationMemory;
    topicStack: SessionRecord["topicStack"];
    turnCount: number;
    voiceMode?: boolean;
  }): SessionRecord {
    return ConversationManager.upsert({
      conversationId: input.conversationId,
      educationalMode: input.educationalMode,
      educationalTopic: input.educationalTopic,
      entityMemory: input.entityMemory,
      intent: input.communicationIntent,
      isFollowUp: input.isFollowUp,
      learningStep: input.learningStep,
      memory: input.memory,
      topicStack: input.topicStack,
      turnCount: input.turnCount,
      voiceActive: Boolean(input.voiceMode),
      voiceStatus: input.voiceMode ? "idle" : "idle",
    });
  },

  resetForTests() {
    ConversationManager.resetForTests();
  },
};

export { ConversationManager };
