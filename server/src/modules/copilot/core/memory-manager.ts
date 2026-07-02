import type { ConversationMemory } from "../copilot-types";
import { ContextManager } from "../engine/context-manager";
import { ConversationManager, type SessionRecord } from "../engine/conversation-manager";
import type { ContextState } from "../engine/types";
import { ECG_LEARNING_PATH } from "../engine/v2/types";
import { resolveTutorStepFromText } from "./slash-commands";
import type { CorePipelineInput, ExtendedIntentResult, MemoryState, UserRole } from "./types";

function detectUserRole(memory: ConversationMemory, question: string, clinicianName?: string | null): UserRole {
  const combined = `${memory.turns.filter((turn) => turn.role === "user").map((turn) => turn.content).join(" ")} ${question}`.toLowerCase();
  if (/\b(medical student|student doctor|resident|trainee|junior doctor)\b/.test(combined)) return "medical_student";
  if (/\b(i am a patient|as a patient|explain.*simple|plain language|lay terms)\b/.test(combined)) return "patient";
  if (clinicianName?.trim()) return "physician";
  return "unknown";
}

function nextLearningStep(
  session: SessionRecord | undefined,
  question: string,
  educationalMode: boolean,
  slashCommand: string | null,
  slashArgument: string,
) {
  if (!educationalMode && slashCommand !== "teach") return session?.learningStep ?? 0;

  const current = session?.learningStep ?? 0;
  const combined = `${slashArgument} ${question}`.trim();

  const topicStep = resolveTutorStepFromText(combined, ECG_LEARNING_PATH);
  if (topicStep) return topicStep;

  if (/^(where should i start|what should i learn first|how do i start)\b/i.test(question.trim())) return 1;
  if (/\b(next|continue|what next|go on|next step|next topic|keep going|next lesson)\b/i.test(question)) {
    return Math.min(Math.max(current, 1) + 1, ECG_LEARNING_PATH.length);
  }
  if (slashCommand === "teach" && !slashArgument) {
    return current > 0 ? current : 1;
  }
  if (current > 0) return current;
  return session?.educationalMode ? Math.max(current, 1) : 0;
}

export const MemoryManager = {
  ECG_FOUNDATION_STEPS: ECG_LEARNING_PATH,

  load(input: CorePipelineInput): { contextState: ContextState; session: SessionRecord | undefined } {
    const session = ConversationManager.get(input.conversationId);
    const contextState = ContextManager.build({
      attachments: input.attachments,
      chatInput: input.chatInput,
      memory: input.memory,
      previousTopicStack: session?.topicStack ?? [],
      question: input.question,
    });
    return { contextState, session };
  },

  build(
    input: CorePipelineInput,
    session: SessionRecord | undefined,
    contextState: ContextState,
    intent: ExtendedIntentResult,
  ): MemoryState {
    const userRole = detectUserRole(input.memory, input.question, input.clinicianName);
    const educationalMode = intent.isTutorMode || intent.isEducational || Boolean(session?.educationalMode)
      || intent.slashCommand === "teach" || intent.slashCommand === "quiz";
    const educationalTopic = intent.educationalTopic !== "none"
      ? intent.educationalTopic
      : session?.educationalTopic ?? "none";

    return {
      activeTopic: contextState.activeTopic,
      currentCaseId: input.chatInput.caseId,
      currentPatientId: input.chatInput.patientId,
      educationalMode,
      educationalTopic: educationalMode
        ? (educationalTopic === "none" && intent.isTutorMode ? "ecg_basics" : educationalTopic)
        : "none",
      hasUploadedFiles: contextState.hasUploadedFiles,
      isFollowUp: intent.isFollowUp || ContextManager.isFollowUp(input.question, contextState.activeTopic, input.memory),
      learningStep: nextLearningStep(
        session,
        input.question,
        educationalMode,
        intent.slashCommand ?? null,
        intent.slashArgument ?? "",
      ),
      topicStack: contextState.topicStack,
      turnCount: input.memory.turns.length + 1,
      userRole: userRole === "unknown" && intent.isLearner ? "medical_student" : userRole,
    };
  },
};
