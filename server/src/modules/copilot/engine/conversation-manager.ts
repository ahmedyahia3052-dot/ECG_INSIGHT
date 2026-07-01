import type { CommunicationIntent, TopicFrame } from "./types";

export type SessionRecord = {
  conversationId: string;
  lastIntent: CommunicationIntent;
  topicStack: TopicFrame[];
  turnCount: number;
  voiceActive: boolean;
};

const sessions = new Map<string, SessionRecord>();

export const ConversationManager = {
  get(conversationId: string) {
    return sessions.get(conversationId);
  },

  upsert(input: {
    conversationId: string;
    intent: CommunicationIntent;
    topicStack: TopicFrame[];
    turnCount: number;
    voiceActive?: boolean;
  }): SessionRecord {
    const previous = sessions.get(input.conversationId);
    const record: SessionRecord = {
      conversationId: input.conversationId,
      lastIntent: input.intent,
      topicStack: input.topicStack.length ? input.topicStack : previous?.topicStack ?? [],
      turnCount: input.turnCount,
      voiceActive: input.voiceActive ?? previous?.voiceActive ?? false,
    };
    sessions.set(input.conversationId, record);
    return record;
  },

  setVoiceActive(conversationId: string, active: boolean) {
    const current = sessions.get(conversationId);
    if (current) sessions.set(conversationId, { ...current, voiceActive: active });
  },

  resetForTests() {
    sessions.clear();
  },
};
