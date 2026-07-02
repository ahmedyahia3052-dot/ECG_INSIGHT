import type { AttachmentForAnalysis, ConversationMemory } from "../copilot-types";
import type { SessionRecord } from "../engine/conversation-manager";
import { ConversationIntentEngine, type ConversationIntentResult } from "../engine/v2/conversation-intent";
import type { ContextState } from "../engine/types";
import { parseSlashCommand } from "./slash-commands";
import type { ExtendedIntentResult } from "./types";

export type IntentInput = {
  attachments: AttachmentForAnalysis[];
  contextState: ContextState;
  memory: ConversationMemory;
  question: string;
  session?: SessionRecord;
};

function knowledgeToolsAllowed(intent: ConversationIntentResult, tutorMode: boolean): boolean {
  if (tutorMode) return false;
  if (intent.intent === "greeting" || intent.intent === "general_conversation") return false;
  if (intent.intent === "clarification_request") return false;
  return [
    "medical_explanation",
    "follow_up",
    "drug_question",
    "clinical_reasoning",
    "differential_diagnosis",
    "case_discussion",
    "emergency_advice",
    "medical_education",
    "conversation_continuation",
  ].includes(intent.intent);
}

function patientToolsAllowed(intent: ConversationIntentResult, contextState: ContextState, chatHasPatient: boolean): boolean {
  if (intent.intent === "case_discussion" || intent.intent === "clinical_reasoning") {
    return contextState.hasActivePatient || contextState.hasActiveCase || chatHasPatient;
  }
  return false;
}

function intentFromSlashCommand(command: NonNullable<ReturnType<typeof parseSlashCommand>["command"]>): ConversationIntentResult["intent"] {
  switch (command) {
    case "teach": return "medical_education";
    case "quiz": return "medical_education";
    case "case": return "case_discussion";
    case "explain": return "medical_explanation";
    case "summarize": return "conversation_continuation";
    default: return "medical_education";
  }
}

export const IntentUnderstanding = {
  analyze(input: IntentInput): ExtendedIntentResult {
    const slash = parseSlashCommand(input.question);
    const questionForIntent = slash.command ? (slash.argument || slash.strippedQuestion) : input.question;

    const base = ConversationIntentEngine.classify({
      ...input,
      question: questionForIntent || input.question,
    });

    const slashTutor = slash.command === "teach" || slash.command === "quiz";
    const tutorMode = slashTutor || base.isTutorMode || base.intent === "medical_education";

    let intent: ConversationIntentResult = tutorMode && base.intent !== "medical_education" && base.intent !== "conversation_continuation" && !slash.command
      ? { ...base, intent: "medical_education" as const, isEducational: true, isTutorMode: true }
      : base;

    if (slash.command) {
      intent = {
        ...intent,
        intent: intentFromSlashCommand(slash.command),
        isEducational: slash.command === "teach" || slash.command === "quiz",
        isTutorMode: slash.command === "teach" || slash.command === "quiz",
        reason: `slash:${slash.command}`,
      };
    }

    const resolvedQuestion = slash.argument || input.contextState.resolvedQuestion || questionForIntent;

    return {
      ...intent,
      allowKnowledgeTools: knowledgeToolsAllowed(intent, tutorMode),
      allowPatientTools: patientToolsAllowed(
        intent,
        input.contextState,
        Boolean(input.contextState.hasActivePatient || input.contextState.hasActiveCase),
      ),
      resolvedQuestion,
      slashArgument: slash.argument,
      slashCommand: slash.command,
      tutorMode: tutorMode || slash.command === "teach" || slash.command === "quiz",
    };
  },
};

export type { ConversationIntentResult };
