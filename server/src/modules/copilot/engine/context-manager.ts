import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory } from "../copilot-types";
import { conversationTopic, hasUploadedEcgAttachment } from "../intent-helpers";
import { extractEntities } from "../entity-extractor";
import type { ContextState, EntityMemory, TopicFrame } from "./types";

const TOPIC_LABELS: Record<string, string> = {
  "atrial fibrillation": "atrial fibrillation",
  hypertension: "hypertension",
  "heart failure": "heart failure",
  stemi: "STEMI",
  "prolonged QT": "prolonged QT",
};

function detectTopic(memory: ConversationMemory, question: string): TopicFrame | null {
  const fromMemory = conversationTopic(memory);
  if (fromMemory) return { label: TOPIC_LABELS[fromMemory] ?? fromMemory, slug: fromMemory };
  const lowered = question.toLowerCase();
  for (const [slug, label] of Object.entries(TOPIC_LABELS)) {
    if (lowered.includes(slug) || lowered.includes(label.toLowerCase())) return { label, slug };
  }
  if (/hypertension|blood pressure/.test(lowered)) return { label: "hypertension", slug: "hypertension" };
  if (/atrial fibrillation|\baf\b/.test(lowered)) return { label: "atrial fibrillation", slug: "atrial fibrillation" };
  return null;
}

function resolvePronouns(question: string, activeTopic: TopicFrame | null): string {
  if (!activeTopic) return question.trim();
  const text = question.trim();
  if (/^(how (is|are)|what about|tell me more about|can you explain)\s+(it|this|that)\b/i.test(text)) {
    return text.replace(/\b(it|this|that)\b/i, activeTopic.label);
  }
  const diagnosed = text.match(/^how (?:is|are) (?:it|this|that) (diagnosed|treated|managed|detected|monitored)\b/i);
  if (diagnosed) return `How is ${activeTopic.label} ${diagnosed[1].toLowerCase()}?`;
  if (/^(what causes|why does|what are the causes of)\s+(it|this|that)\b/i.test(text)) {
    return text.replace(/\b(it|this|that)\b/i, activeTopic.label);
  }
  if (/^(what treatment|what drugs|which drugs|what medication)\b/i.test(text) && /\b(it|this|that)\b/i.test(text)) {
    return `What drugs are commonly used for ${activeTopic.label}?`;
  }
  if (/^what drugs are used\b/i.test(text) && activeTopic) {
    return `What drugs are commonly used for ${activeTopic.label}?`;
  }
  return text;
}

export const ContextManager = {
  build(input: {
    attachments: AttachmentForAnalysis[];
    chatInput: ChatContextInput;
    memory: ConversationMemory;
    previousTopicStack: TopicFrame[];
    question: string;
  }): ContextState {
    const detected = detectTopic(input.memory, input.question);
    const activeTopic = detected ?? input.previousTopicStack.at(-1) ?? null;
    const topicStack = detected
      ? [...input.previousTopicStack.filter((item) => item.slug !== detected.slug), detected].slice(-6)
      : input.previousTopicStack;
    const entities = extractEntities(input.question, input.memory, input.attachments);
    const entityMemory: EntityMemory = {
      ages: entities.ages,
      diseases: entities.diseases,
      drugs: entities.drugs,
      patientNames: entities.patientNames,
    };
    const resolvedQuestion = resolvePronouns(input.question, activeTopic);
    return {
      activeTopic,
      entityMemory,
      hasActiveCase: Boolean(input.chatInput.caseId),
      hasActivePatient: Boolean(input.chatInput.patientId) || entityMemory.patientNames.length > 0,
      hasUploadedEcg: hasUploadedEcgAttachment(input.attachments) || input.memory.attachments.some((item) => /ecg|ekg/i.test(item.name)),
      hasUploadedFiles: input.attachments.length > 0 || input.memory.attachments.length > 0,
      hasUploadedImages: input.attachments.some((item) => item.kind === "image" || item.kind === "camera"),
      resolvedQuestion,
      topicStack,
    };
  },

  isFollowUp(question: string, activeTopic: TopicFrame | null, memory: ConversationMemory): boolean {
    if (!activeTopic || memory.turns.length < 2) return false;
    return /\b(it|this|that)\b/i.test(question)
      || /^(how|what about|tell me more|also|what drugs|what treatment)/i.test(question.trim());
  },
};

export const ConversationSummarizer = {
  summarize(memory: ConversationMemory, activeTopic: TopicFrame | null): string {
    const turns = memory.turns.slice(-8);
    const lead = activeTopic ? `Topic: ${activeTopic.label}. ` : "";
    return `${lead}${turns.map((turn) => `${turn.role}: ${turn.content.slice(0, 120)}`).join(" | ")}`.slice(0, 900);
  },
};
