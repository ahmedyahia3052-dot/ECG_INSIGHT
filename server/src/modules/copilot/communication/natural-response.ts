import type { KnowledgeHit } from "../copilot-types";
import type { CommunicationComposeInput, CommunicationComposeResult, ResponsePlan } from "./types";

const REPORT_PATTERNS = [
  /^#{1,3}\s.+$/gm,
  /^Short Answer\s*$/gim,
  /^Definition:\s*/gim,
  /^ECG Criteria:\s*/gim,
  /^Criteria:\s*/gim,
  /^References:\s*/gim,
  /^References:[\s\S]*$/im,
  /^Differential diagnosis:\s*/gim,
  /^Knowledge Base\s*/gim,
  /^Retrieved Medical Knowledge\s*/gim,
  /\nConfidence Score:\s*\d+%/gi,
  /\nCitations:\s*.+$/gim,
  /Risk tier:\s*(HIGH|MODERATE|LOW)/gi,
  /Uploaded Document Review/gi,
  /I can go deeper if you want\.?/gi,
  /AI assistance only\. Clinical decisions remain the responsibility of the physician\./gi,
];

function trimParagraphs(content: string, maxParagraphs: number) {
  const parts = content.split(/\n\n+/).filter(Boolean);
  if (parts.length <= maxParagraphs) return content.trim();
  return parts.slice(0, maxParagraphs).join("\n\n").trim();
}

function appendMedicalFollowUps(content: string, topic: string | undefined, plan: ResponsePlan) {
  if (!plan.suggestFollowUps || !topic) return content;
  if (/If you'd like, I can also explain:/i.test(content)) return content;
  const lower = content.toLowerCase();
  if (lower.includes("causes") && lower.includes("treatment")) return content;
  if (/hypertension|blood pressure/.test(topic)) {
    return `${content}\n\nIf you'd like, I can also explain:\n\n• causes\n• diagnosis\n• ECG changes\n• treatment\n• occupational fitness implications`;
  }
  return content;
}

export const NaturalResponseFormatter = {
  format(content: string, plan: ResponsePlan, topic?: string): string {
    let formatted = content;
    for (const pattern of REPORT_PATTERNS) {
      formatted = formatted.replace(pattern, "");
    }
    formatted = formatted.replace(/\n{3,}/g, "\n\n").trim();
    formatted = trimParagraphs(formatted, plan.maxParagraphs);
    if (plan.allowBullets) formatted = appendMedicalFollowUps(formatted, topic, plan);
    return formatted.trim();
  },
};

export const CommunicationResponseComposer = {
  compose(input: CommunicationComposeInput & {
    composeFn: (args: {
      attachments: CommunicationComposeInput["brain"]["composeBase"]["attachments"];
      clarificationPrompt?: string;
      clinicianName?: string | null;
      context: CommunicationComposeInput["clinicalContext"];
      intent: CommunicationComposeInput["brain"]["medicalIntent"];
      knowledge: KnowledgeHit[];
      memory: CommunicationComposeInput["brain"]["composeBase"]["memory"];
      question: string;
      requiresClarification: boolean;
    }) => { citations: unknown[]; confidence: number | null; content: string };
  }): CommunicationComposeResult {
    const draft = input.composeFn({
      attachments: input.brain.composeBase.attachments,
      clarificationPrompt: input.brain.composeBase.clarificationPrompt,
      clinicianName: input.brain.composeBase.clinicianName,
      context: input.clinicalContext,
      intent: input.brain.medicalIntent,
      knowledge: input.knowledgeHits,
      memory: input.brain.composeBase.memory,
      question: input.brain.composeBase.question,
      requiresClarification: input.brain.composeBase.requiresClarification,
    });
    const topic = input.brain.memoryState.currentDiscussionTopic || undefined;
    return {
      citations: [],
      confidence: null,
      content: NaturalResponseFormatter.format(draft.content, input.responsePlan, topic),
    };
  },
};

export const StreamingResponder = {
  chunkContent(content: string, chunkSize = 24): string[] {
    const chunks: string[] = [];
    for (let index = 0; index < content.length; index += chunkSize) {
      chunks.push(content.slice(index, index + chunkSize));
    }
    return chunks.length ? chunks : [content];
  },

  voiceReady: {
    interruptSupported: true,
    resumeSupported: true,
    silenceDetectionReady: true,
    streamingLlmReady: true,
    streamingSttReady: true,
    streamingTtsReady: true,
  } as const,
};
