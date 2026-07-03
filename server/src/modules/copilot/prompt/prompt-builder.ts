import type { ConversationMemory, KnowledgeHit } from "../copilot-types";
import type { ApiMessage } from "../v3/llm-provider";
import { KnowledgeService } from "../../knowledge-engine";
import { ecgEducationNextStepLabel } from "../../knowledge-engine/knowledge/cardiology/ecg-education-tree";
import { buildAttachmentContextBlock, formatClinicalContextBlock } from "../core/attachment-context";
import { ClinicalContext } from "../core/clinical-context";
import type { CoreTurnContext } from "../core/types";
import type { ClinicalContext as DbClinicalContext } from "../copilot-types";

function buildConversationMessages(memory: ConversationMemory, question: string): ApiMessage[] {
  const messages: ApiMessage[] = [];
  for (const turn of memory.turns) {
    if (!turn.content.trim()) continue;
    messages.push({
      content: turn.content.trim(),
      role: turn.role === "assistant" ? "assistant" : "user",
    });
  }
  const last = messages.at(-1);
  if (!last || last.role !== "user" || last.content !== question.trim()) {
    messages.push({ content: question.trim(), role: "user" });
  }
  return messages.slice(-24);
}

function formatTutorKnowledgeBlock(
  step: NonNullable<ReturnType<typeof KnowledgeService.getEcgEducationStep>>,
  topic: ReturnType<typeof KnowledgeService.getTopic>,
  learningStep: number,
): string {
  const nextLesson = ecgEducationNextStepLabel(learningStep > 0 ? learningStep : 1);
  const lines = [
    `Tutor lesson: ${step.title}`,
    `Focus: ${step.teachingFocus}`,
  ];
  if (topic) {
    lines.push(`Definition: ${topic.sections.definition}`);
    if (topic.sections.teachingNotes) lines.push(`Teaching notes: ${topic.sections.teachingNotes}`);
    if (topic.sections.clinicalPearls?.length) lines.push(`Clinical pearls: ${topic.sections.clinicalPearls.join("; ")}`);
    if (topic.sections.keyPoints?.length) lines.push(`Key points: ${topic.sections.keyPoints.join("; ")}`);
  }
  if (nextLesson) lines.push(`Suggested Next Lesson section topic: ${nextLesson}`);
  lines.push("Synthesize into the tutor Markdown schema — do not paste this block verbatim.");
  return lines.join("\n");
}

async function resolveKnowledgeContext(turn: CoreTurnContext): Promise<{ block: string | null; hits: KnowledgeHit[] }> {
  if (turn.intent.tutorMode || turn.memoryState.educationalMode) {
    const step = KnowledgeService.getEcgEducationStep(turn.memoryState.learningStep);
    if (!step) return { block: null, hits: [] };
    const topic = step.topicSlug ? KnowledgeService.getTopic(step.topicSlug) : null;
    return { block: formatTutorKnowledgeBlock(step, topic, turn.memoryState.learningStep), hits: [] };
  }

  if (turn.intent.slashCommand === "summarize" && turn.input.memory.turns.length) {
    const recap = turn.input.memory.turns
      .slice(-10)
      .map((item) => `${item.role}: ${item.content.slice(0, 280)}`)
      .join("\n");
    return {
      block: `Conversation to summarize:\n${recap}\n\nProduce a structured tutor-style summary.`,
      hits: [],
    };
  }

  if (!turn.intent.allowKnowledgeTools) {
    return { block: null, hits: [] };
  }

  const result = await KnowledgeService.search({
    activeTopic: turn.memoryState.activeTopic?.slug ?? null,
    intent: turn.intent.intent,
    limit: 6,
    query: turn.intent.resolvedQuestion,
  });
  return { block: KnowledgeService.formatForLlmContext(result), hits: result.hits };
}

export type PromptBuildInput = {
  attachmentBlock?: string | null;
  clinicalBlock?: string | null;
  knowledgeBlock?: string | null;
  turn: CoreTurnContext;
};

export const PromptBuilder = {
  async build(input: PromptBuildInput): Promise<ApiMessage[]> {
    const systemMessages = ClinicalContext.buildSystemMessages(input.turn);
    const historyMessages = buildConversationMessages(input.turn.input.memory, input.turn.input.question);
    const messages: ApiMessage[] = [...systemMessages, ...historyMessages];

    if (input.attachmentBlock) {
      messages.push({ content: input.attachmentBlock, role: "system" });
    }
    if (input.clinicalBlock) {
      messages.push({ content: input.clinicalBlock, role: "system" });
    }
    if (input.knowledgeBlock) {
      messages.push({ content: input.knowledgeBlock, role: "system" });
    }

    return messages;
  },

  async buildForTurn(
    turn: CoreTurnContext,
    options: {
      clinicalContext?: DbClinicalContext | null;
      onStatus?: (message: string) => void;
    } = {},
  ) {
    let attachmentBlock: string | null = null;
    if (turn.input.attachments.length) {
      options.onStatus?.("Reviewing uploaded attachments...");
      attachmentBlock = buildAttachmentContextBlock(turn.input.attachments);
    }

    let clinicalBlock: string | null = null;
    if (options.clinicalContext) {
      options.onStatus?.("Loading patient context...");
      clinicalBlock = formatClinicalContextBlock(options.clinicalContext);
    }

    const knowledge = await resolveKnowledgeContext(turn);
    if (turn.intent.allowKnowledgeTools || turn.intent.tutorMode || turn.memoryState.educationalMode || turn.intent.slashCommand) {
      options.onStatus?.("Reviewing clinical information...");
    }

    const messages = await PromptBuilder.build({
      attachmentBlock,
      clinicalBlock,
      knowledgeBlock: knowledge.block,
      turn,
    });

    return { knowledgeHits: knowledge.hits, messages };
  },
};
