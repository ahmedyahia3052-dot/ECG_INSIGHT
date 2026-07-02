import type { ConversationMemory, KnowledgeHit } from "../copilot-types";
import type { ApiMessage } from "../v3/llm-provider";
import { runLlmWithTools } from "../v3/llm-provider";
import { KnowledgeService } from "../../knowledge-engine";
import { ecgEducationNextStepLabel } from "../../knowledge-engine/knowledge/cardiology/ecg-education-tree";
import { ClinicalContext } from "./clinical-context";
import type { CorePipelineDeps, CoreStreamCallbacks, CoreTurnContext } from "./types";

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
    if (topic.sections.clinicalPearls?.length) {
      lines.push(`Clinical pearls: ${topic.sections.clinicalPearls.join("; ")}`);
    }
    if (topic.sections.keyPoints?.length) {
      lines.push(`Key points: ${topic.sections.keyPoints.join("; ")}`);
    }
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

export const ResponseOrchestrator = {
  async generate(
    turn: CoreTurnContext,
    _deps: CorePipelineDeps,
    callbacks: CoreStreamCallbacks = {},
  ) {
    const systemMessages = ClinicalContext.buildSystemMessages(turn);
    const historyMessages = buildConversationMessages(turn.input.memory, turn.input.question);
    const messages: ApiMessage[] = [...systemMessages, ...historyMessages];

    if (turn.intent.allowKnowledgeTools || turn.intent.tutorMode || turn.memoryState.educationalMode || turn.intent.slashCommand) {
      callbacks.onStatus?.("Reviewing clinical information...");
    }

    const knowledge = await resolveKnowledgeContext(turn);
    if (knowledge.block) {
      messages.push({ content: knowledge.block, role: "system" });
    }

    const llm = await runLlmWithTools({
      messages,
      onStatus: callbacks.onStatus,
      onToken: callbacks.onToken,
      runTool: async () => ({}),
      toolsEnabled: false,
    });

    return {
      content: llm.content,
      knowledgeHits: knowledge.hits,
      model: llm.model,
      toolCallsUsed: knowledge.hits.length ? ["medical_knowledge_search"] as string[] : [],
    };
  },
};

/** @deprecated use ResponseOrchestrator */
export const MedicalResponseOrchestrator = ResponseOrchestrator;
