import type { ConversationMemory } from "../copilot-types";
import { ConversationSummarizer } from "./context-manager";
import type { CommunicationIntent, EntityMemory, TopicFrame } from "./types";

export type ConversationState = {
  conversationId: string;
  conversationSummary: string;
  currentTopic: TopicFrame | null;
  entities: EntityMemory;
  isFollowUp: boolean;
  lastIntent: CommunicationIntent;
  previousTopic: TopicFrame | null;
  topicStack: TopicFrame[];
  turnCount: number;
  voiceActive: boolean;
  voiceStatus: "idle" | "listening" | "thinking" | "speaking" | "transcribing";
};

export type SessionRecord = ConversationState;

const sessions = new Map<string, SessionRecord>();

export const ConversationManager = {
  get(conversationId: string) {
    return sessions.get(conversationId);
  },

  upsert(input: {
    conversationId: string;
    entityMemory?: EntityMemory;
    intent: CommunicationIntent;
    isFollowUp?: boolean;
    memory?: ConversationMemory;
    topicStack: TopicFrame[];
    turnCount: number;
    voiceActive?: boolean;
    voiceStatus?: ConversationState["voiceStatus"];
  }): SessionRecord {
    const previous = sessions.get(input.conversationId);
    const currentTopic = input.topicStack.at(-1) ?? previous?.currentTopic ?? null;
    const previousTopic = input.topicStack.length > 1
      ? input.topicStack.at(-2) ?? previous?.previousTopic ?? null
      : previous?.currentTopic ?? null;
    const record: SessionRecord = {
      conversationId: input.conversationId,
      conversationSummary: input.memory && currentTopic
        ? ConversationSummarizer.summarize(input.memory, currentTopic)
        : previous?.conversationSummary ?? "",
      currentTopic,
      entities: input.entityMemory ?? previous?.entities ?? { ages: [], diseases: [], drugs: [], patientNames: [] },
      isFollowUp: input.isFollowUp ?? previous?.isFollowUp ?? false,
      lastIntent: input.intent,
      previousTopic,
      topicStack: input.topicStack.length ? input.topicStack : previous?.topicStack ?? [],
      turnCount: input.turnCount,
      voiceActive: input.voiceActive ?? previous?.voiceActive ?? false,
      voiceStatus: input.voiceStatus ?? previous?.voiceStatus ?? "idle",
    };
    sessions.set(input.conversationId, record);
    return record;
  },

  setVoiceActive(conversationId: string, active: boolean, voiceStatus: ConversationState["voiceStatus"] = active ? "listening" : "idle") {
    const current = sessions.get(conversationId);
    if (current) {
      sessions.set(conversationId, { ...current, voiceActive: active, voiceStatus });
      return;
    }
    sessions.set(conversationId, {
      conversationId,
      conversationSummary: "",
      currentTopic: null,
      entities: { ages: [], diseases: [], drugs: [], patientNames: [] },
      isFollowUp: false,
      lastIntent: "Unknown",
      previousTopic: null,
      topicStack: [],
      turnCount: 0,
      voiceActive: active,
      voiceStatus,
    });
  },

  setVoiceStatus(conversationId: string, voiceStatus: ConversationState["voiceStatus"]) {
    const current = sessions.get(conversationId);
    if (current) sessions.set(conversationId, { ...current, voiceStatus });
  },

  resetForTests() {
    sessions.clear();
  },
};
