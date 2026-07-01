import type { ConversationMemory } from "../copilot-types";
import { ConversationSummarizer } from "./context-manager";
import type { CommunicationIntent, EntityMemory, TopicFrame } from "./types";

export type ConversationState = {
  conversationId: string;
  conversationSummary: string;
  currentTopic: TopicFrame | null;
  educationalMode: boolean;
  educationalTopic: "ecg_basics" | "general_medicine" | "none";
  entities: EntityMemory;
  isFollowUp: boolean;
  lastIntent: CommunicationIntent;
  learningStep: number;
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
    educationalMode?: boolean;
    educationalTopic?: ConversationState["educationalTopic"];
    entityMemory?: EntityMemory;
    intent: CommunicationIntent;
    isFollowUp?: boolean;
    learningStep?: number;
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
      educationalMode: input.educationalMode ?? previous?.educationalMode ?? false,
      educationalTopic: input.educationalTopic ?? previous?.educationalTopic ?? "none",
      entities: input.entityMemory ?? previous?.entities ?? { ages: [], diseases: [], drugs: [], patientNames: [] },
      isFollowUp: input.isFollowUp ?? previous?.isFollowUp ?? false,
      lastIntent: input.intent,
      learningStep: input.learningStep ?? previous?.learningStep ?? 0,
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
      educationalMode: false,
      educationalTopic: "none",
      entities: { ages: [], diseases: [], drugs: [], patientNames: [] },
      isFollowUp: false,
      lastIntent: "Unknown",
      learningStep: 0,
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
