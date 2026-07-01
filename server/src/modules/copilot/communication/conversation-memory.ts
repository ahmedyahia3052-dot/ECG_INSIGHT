import type { ConversationMemory } from "../copilot-types";
import { conversationTopic } from "../intent-helpers";
import type { CommunicationMemory, ContextWindowTurn, ConversationTopic } from "./types";

const TOPIC_LABELS: Record<string, string> = {
  "atrial fibrillation": "atrial fibrillation",
  hypertension: "hypertension",
  "heart failure": "heart failure",
  stemi: "STEMI",
  "prolonged QT": "prolonged QT",
};

export const TopicTracker = {
  detect(memory: ConversationMemory, question: string): ConversationTopic | null {
    const fromMemory = conversationTopic(memory);
    if (fromMemory) {
      return { label: TOPIC_LABELS[fromMemory] ?? fromMemory, slug: fromMemory };
    }
    const lowered = question.toLowerCase();
    for (const [slug, label] of Object.entries(TOPIC_LABELS)) {
      if (lowered.includes(slug) || lowered.includes(label.toLowerCase())) {
        return { label, slug };
      }
    }
    if (/hypertension|blood pressure/.test(lowered)) return { label: "hypertension", slug: "hypertension" };
    if (/atrial fibrillation|\baf\b/.test(lowered)) return { label: "atrial fibrillation", slug: "atrial fibrillation" };
    if (/stemi|st elevation/.test(lowered)) return { label: "STEMI", slug: "stemi" };
    if (/prolonged qt|qtc|long qt/.test(lowered)) return { label: "prolonged QT", slug: "prolonged QT" };
    return null;
  },

  resolveQuestion(question: string, topic: ConversationTopic | null): string {
    if (!topic) return question.trim();
    const text = question.trim();
    const topicLabel = topic.label;
    if (/^(how (is|are)|what about|tell me about|can you explain)\s+(it|this|that)\b/i.test(text)) {
      return text.replace(/\b(it|this|that)\b/i, topicLabel);
    }
    const diagnosed = text.match(/^how (?:is|are) (?:it|this|that) (diagnosed|treated|managed|detected|monitored)\b/i);
    if (diagnosed) {
      return `How is ${topicLabel} ${diagnosed[1].toLowerCase()}?`;
    }
    if (/^(what causes|why does|what are the causes of)\s+(it|this|that)\b/i.test(text)) {
      return text.replace(/\b(it|this|that)\b/i, topicLabel);
    }
    if (/^(what treatment|what are the treatment options for)\s+(it|this|that)\b/i.test(text)) {
      return text.replace(/\b(it|this|that)\b/i, topicLabel);
    }
    return text;
  },

  isFollowUp(question: string, topic: ConversationTopic | null, memory: ConversationMemory): boolean {
    if (!topic || memory.turns.length < 2) return false;
    return /^(how|what about|tell me more|and what|also|what treatment|how is it|can you explain it)/i.test(question.trim())
      || /\b(it|this|that)\b/i.test(question);
  },
};

export const ContextWindow = {
  build(memory: ConversationMemory, maxTurns = 12): ContextWindowTurn[] {
    return memory.turns.slice(-maxTurns).map((turn) => ({
      content: turn.content,
      role: turn.role === "assistant" ? "assistant" : "user",
    }));
  },
};

export const ConversationSummarizer = {
  summarize(memory: ConversationMemory, topic: ConversationTopic | null): string {
    const turns = memory.turns.slice(-8);
    if (!turns.length) return "New conversation.";
    const topicLead = topic ? `Topic: ${topic.label}. ` : "";
    const condensed = turns.map((turn) => `${turn.role}: ${turn.content.slice(0, 120)}`).join(" | ");
    return `${topicLead}${condensed}`.slice(0, 900);
  },
};

export function buildCommunicationMemory(memory: ConversationMemory, topic: ConversationTopic | null, resolvedQuestion: string): CommunicationMemory {
  return {
    ...memory,
    activeTopic: topic,
    resolvedFollowUps: resolvedQuestion !== memory.turns.at(-1)?.content ? [resolvedQuestion] : [],
    summary: ConversationSummarizer.summarize(memory, topic),
  };
}
