import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory } from "../copilot-types";
import { conversationTopic, hasUploadedEcgAttachment } from "../intent-helpers";
import { extractEntities } from "../entity-extractor";
import type { ContextState, EntityMemory, TopicFrame } from "./types";

const TOPIC_LABELS: Record<string, string> = {
  "atrial fibrillation": "atrial fibrillation",
  "heart failure": "heart failure",
  "heart block": "heart block",
  anemia: "anemia",
  asthma: "asthma",
  copd: "COPD",
  diabetes: "diabetes",
  dyslipidemia: "dyslipidemia",
  hyperkalemia: "hyperkalemia",
  hypokalemia: "hypokalemia",
  hypertension: "hypertension",
  pneumonia: "pneumonia",
  "prolonged QT": "prolonged QT",
  "pulmonary embolism": "pulmonary embolism",
  sepsis: "sepsis",
  stemi: "STEMI",
  syncope: "syncope",
  "type 2 diabetes": "type 2 diabetes",
};

const TOPIC_KEYWORDS: Array<{ pattern: RegExp; slug: string; label: string }> = [
  { label: "hypertension", pattern: /hypertension|blood pressure/, slug: "hypertension" },
  { label: "atrial fibrillation", pattern: /atrial fibrillation|\baf\b/, slug: "atrial fibrillation" },
  { label: "heart failure", pattern: /heart failure|\bhf\b|cardiac failure/, slug: "heart failure" },
  { label: "STEMI", pattern: /\bstemi\b|st elevation myocardial infarction/, slug: "stemi" },
  { label: "prolonged QT", pattern: /prolonged qt|long qt|qtc/, slug: "prolonged QT" },
  { label: "diabetes", pattern: /diabetes|hyperglycemia/, slug: "diabetes" },
  { label: "COPD", pattern: /\bcopd\b|chronic obstructive/, slug: "copd" },
  { label: "asthma", pattern: /\basthma\b/, slug: "asthma" },
  { label: "pneumonia", pattern: /pneumonia/, slug: "pneumonia" },
  { label: "pulmonary embolism", pattern: /pulmonary embolism|\bpe\b/, slug: "pulmonary embolism" },
  { label: "anemia", pattern: /anemia|anaemia/, slug: "anemia" },
  { label: "sepsis", pattern: /sepsis|septic/, slug: "sepsis" },
  { label: "syncope", pattern: /syncope|fainting|passed out/, slug: "syncope" },
  { label: "hyperkalemia", pattern: /hyperkalemia|high potassium/, slug: "hyperkalemia" },
  { label: "hypokalemia", pattern: /hypokalemia|low potassium/, slug: "hypokalemia" },
  { label: "dyslipidemia", pattern: /dyslipidemia|hyperlipid|cholesterol/, slug: "dyslipidemia" },
  { label: "heart block", pattern: /heart block|av block|atrioventricular block/, slug: "heart block" },
];

function detectTopic(memory: ConversationMemory, question: string): TopicFrame | null {
  const fromMemory = conversationTopic(memory);
  if (fromMemory) return { label: TOPIC_LABELS[fromMemory] ?? fromMemory, slug: fromMemory };
  const lowered = question.toLowerCase();
  for (const entry of TOPIC_KEYWORDS) {
    if (entry.pattern.test(lowered)) return { label: entry.label, slug: entry.slug };
  }
  if (/^\s*af\s*[?.!]?\s*$/i.test(lowered)) return { label: "atrial fibrillation", slug: "atrial fibrillation" };
  return null;
}

function resolvePronouns(question: string, activeTopic: TopicFrame | null): string {
  if (!activeTopic) return question.trim();
  const text = question.trim();
  if (/^(how (is|are)|what about|tell me more about|can you explain)\s+(it|this|that)\b/i.test(text)) {
    return text.replace(/\b(it|this|that)\b/i, activeTopic.label);
  }
  if (/^(what are the (complications|symptoms|causes)|what causes|why does)\s+(it|this|that)\b/i.test(text)) {
    return text.replace(/\b(it|this|that)\b/i, activeTopic.label);
  }
  if (/^(how do you (diagnose|treat|manage|monitor)|how is (it|this|that) (diagnosed|treated|managed|detected|monitored))\b/i.test(text)) {
    const match = text.match(/(diagnosed|treated|managed|detected|monitored)/i);
    if (match) return `How is ${activeTopic.label} ${match[1].toLowerCase()}?`;
  }
  if (/^(what causes|why does|why do|what are the causes of)\s+(it|this|that)\b/i.test(text)) {
    return text.replace(/\b(it|this|that)\b/i, activeTopic.label);
  }
  if (/\bwhy does (it|this|that)\b/i.test(text)) {
    return text.replace(/\b(it|this|that)\b/i, activeTopic.label);
  }
  if (/^(what would you do next|what should i do next|what do you do next|how would you manage (it|this|that))\b/i.test(text)) {
    return activeTopic.slug === "hypertension" || activeTopic.label
      ? `What would you do next for ${activeTopic.label}?`
      : text.replace(/\b(it|this|that)\b/i, activeTopic.label);
  }
  if (/^(what treatment|what drugs|which drugs|what medication)\b/i.test(text) && /\b(it|this|that)\b/i.test(text)) {
    return `What drugs are commonly used for ${activeTopic.label}?`;
  }
  if (/^(what are the (complications|symptoms|causes))\b/i.test(text) && activeTopic) {
    const kind = text.match(/^what are the (complications|symptoms|causes)\b/i)?.[1] ?? "complications";
    return `What are the ${kind} of ${activeTopic.label}?`;
  }
  if (/^(what drugs are used|what drugs are commonly used)\b/i.test(text) && activeTopic) {
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
    if (memory.turns.length < 2) return false;
    const text = question.trim();
    if (/\b(this patient|the patient|my patient|those findings|the ecg|the report|the medication)\b/i.test(text)) return true;
    if (/^(what would you do next|what should i do next|what do you do next)\b/i.test(text)) return true;
    if (!activeTopic) return false;
    return /\b(it|this|that)\b/i.test(question)
      || /^(how|what about|tell me more|also|what drugs|what treatment|why does|why do)\b/i.test(text);
  },
};

export const ConversationSummarizer = {
  summarize(memory: ConversationMemory, activeTopic: TopicFrame | null): string {
    const turns = memory.turns.slice(-8);
    const lead = activeTopic ? `Topic: ${activeTopic.label}. ` : "";
    return `${lead}${turns.map((turn) => `${turn.role}: ${turn.content.slice(0, 120)}`).join(" | ")}`.slice(0, 900);
  },
};
