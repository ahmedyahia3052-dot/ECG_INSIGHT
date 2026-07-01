import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory } from "../../copilot-types";
import type { ContextState } from "../types";
import type { SessionRecord } from "../conversation-manager";
import { ConversationIntentEngine, type ConversationIntent } from "./conversation-intent";
import type { EducationalTopic, EmergencyLevel, ReasoningResult } from "./types";
import { ECG_LEARNING_PATH } from "./types";

type ReasonInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  contextState: ContextState;
  isFollowUp: boolean;
  memory: ConversationMemory;
  question: string;
  session?: SessionRecord;
};

function learningStepFor(memory: ConversationMemory, text: string, session?: SessionRecord) {
  const current = session?.learningStep ?? 0;
  if (/^(where should i start|what should i learn first|how do i start)\b/i.test(text.trim()) || /\bwhere (?:do|should) i start\b/i.test(text)) {
    return 1;
  }
  if (/\b(next|continue|what next|go on|next step|next topic|keep going)\b/i.test(text)) {
    return Math.min(Math.max(current, 1) + 1, ECG_LEARNING_PATH.length);
  }
  if (current > 0) return current;
  return 0;
}

function detectEmergency(text: string): EmergencyLevel {
  const lowered = text.toLowerCase();
  if (/\b(cardiac arrest|not breathing|unresponsive|collapsed|anaphylaxis|active bleeding)\b/.test(lowered)) return "HIGH";
  if (/\b(chest pain|syncope|crushing pain|stemi|shortness of breath|dyspnea)\b/.test(lowered)) return "MODERATE";
  return "NONE";
}

function modeForIntent(intent: ConversationIntent): ReasoningResult["mode"] {
  switch (intent) {
    case "medical_education": return "education";
    case "greeting": return "greeting";
    case "general_conversation": return "small_talk";
    case "emergency_advice": return "emergency";
    case "case_discussion": return "patient_context";
    case "ecg_interpretation":
    case "image_discussion":
    case "laboratory_interpretation":
    case "radiology_interpretation": return "vision_review";
    case "clarification_request": return "clarification";
    case "follow_up": return "follow_up";
    case "conversation_continuation": return "education";
    default: return "clinical_question";
  }
}

function needsKnowledgeForIntent(intent: ConversationIntent, tutorMode: boolean): boolean {
  if (tutorMode || intent === "medical_education" || intent === "conversation_continuation") return false;
  if (intent === "greeting" || intent === "general_conversation") return false;
  if (intent === "clarification_request") return false;
  if (intent === "case_discussion") return false;
  return ["medical_explanation", "clinical_reasoning", "follow_up", "drug_question", "differential_diagnosis", "emergency_advice", "ecg_interpretation"].includes(intent);
}

function needsVisionForIntent(intent: ConversationIntent, attachments: AttachmentForAnalysis[], memory: ConversationMemory) {
  if (["ecg_interpretation", "image_discussion", "laboratory_interpretation", "radiology_interpretation"].includes(intent)) {
    return attachments.length > 0 || memory.attachments.length > 0;
  }
  return false;
}

function responseTagForIntent(intent: ConversationIntent, tutorMode: boolean) {
  if (tutorMode || intent === "medical_education") return "Medical Education";
  if (intent === "emergency_advice") return "Follow-up";
  if (intent === "ecg_interpretation") return "ECG Interpretation";
  return "Clinical Summary";
}

export const MedicalReasoning = {
  analyze(input: ReasonInput): ReasoningResult {
    const intentResult = ConversationIntentEngine.classify({
      attachments: input.attachments,
      contextState: input.contextState,
      memory: input.memory,
      question: input.question,
      session: input.session,
    });

    const text = input.contextState.resolvedQuestion.toLowerCase();
    const emergencyLevel = detectEmergency(text);
    const mode = modeForIntent(intentResult.intent);
    const educationalTopic: EducationalTopic = intentResult.educationalTopic;
    const tutorMode = intentResult.isTutorMode;

    if (intentResult.intent === "clarification_request") {
      return {
        clarificationPrompt: "Share the ECG image or open the case here, and tell me what you'd like me to focus on — rhythm, ischaemia, conduction, or QT.",
        educationalMode: false,
        educationalTopic: "none",
        emergencyLevel,
        internalIntent: intentResult.intent,
        knowledgeQuery: input.contextState.resolvedQuestion,
        learningStep: 0,
        mode: "clarification",
        needsClarification: true,
        needsKnowledge: false,
        needsPatientContext: false,
        needsVision: false,
        responseTag: "ECG Interpretation",
      };
    }

    if (intentResult.intent === "conversation_continuation" && intentResult.isLearner) {
      return {
        clarificationPrompt: undefined,
        educationalMode: true,
        educationalTopic: "none",
        emergencyLevel,
        internalIntent: intentResult.intent,
        knowledgeQuery: "",
        learningStep: 0,
        mode: "education",
        needsClarification: false,
        needsKnowledge: false,
        needsPatientContext: false,
        needsVision: false,
        responseTag: "Medical Education",
      };
    }

    const learningStep = tutorMode && educationalTopic === "ecg_basics"
      ? learningStepFor(input.memory, text, input.session)
      : 0;

    return {
      clarificationPrompt: undefined,
      educationalMode: tutorMode || intentResult.isEducational,
      educationalTopic: tutorMode && educationalTopic === "none" && /\b(ecg|ekg)\b/i.test(text) ? "ecg_basics" : educationalTopic,
      emergencyLevel,
      internalIntent: intentResult.intent,
      knowledgeQuery: input.contextState.resolvedQuestion,
      learningStep,
      mode,
      needsClarification: false,
      needsKnowledge: needsKnowledgeForIntent(intentResult.intent, tutorMode),
      needsPatientContext: intentResult.intent === "case_discussion" && Boolean(input.chatInput.patientId || input.chatInput.caseId),
      needsVision: needsVisionForIntent(intentResult.intent, input.attachments, input.memory),
      responseTag: responseTagForIntent(intentResult.intent, tutorMode),
    };
  },
};
