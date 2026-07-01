import type { SessionState } from "./types";
import type { CommunicationIntent, ConversationTopic } from "./types";

const sessions = new Map<string, SessionState>();

export const SessionManager = {
  get(conversationId: string): SessionState | undefined {
    return sessions.get(conversationId);
  },

  upsert(input: {
    conversationId: string;
    intent: CommunicationIntent;
    topic: ConversationTopic | null;
    turnCount: number;
    voiceSessionActive?: boolean;
  }): SessionState {
    const previous = sessions.get(input.conversationId);
    const next: SessionState = {
      conversationId: input.conversationId,
      lastIntent: input.intent,
      lastUpdatedAt: Date.now(),
      topic: input.topic ?? previous?.topic ?? null,
      turnCount: input.turnCount,
      voiceSessionActive: input.voiceSessionActive ?? previous?.voiceSessionActive ?? false,
    };
    sessions.set(input.conversationId, next);
    return next;
  },

  setVoiceSession(conversationId: string, active: boolean) {
    const current = sessions.get(conversationId);
    if (current) sessions.set(conversationId, { ...current, voiceSessionActive: active, lastUpdatedAt: Date.now() });
  },

  resetForTests() {
    sessions.clear();
  },
};

export const ConversationManager = {
  shouldContinueTopic(previousIntent: CommunicationIntent | undefined, nextIntent: CommunicationIntent, isFollowUp: boolean): boolean {
    if (isFollowUp) return true;
    if (!previousIntent) return false;
    const conversational: CommunicationIntent[] = ["Greeting", "SmallTalk", "SystemQuestion"];
    if (conversational.includes(nextIntent) && conversational.includes(previousIntent)) return true;
    return previousIntent === nextIntent;
  },
};
