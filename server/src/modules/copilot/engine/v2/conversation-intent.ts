import type { AttachmentForAnalysis, ConversationMemory } from "../../copilot-types";
import type { SessionRecord } from "../conversation-manager";
import type { ContextState } from "../types";
import type { EducationalTopic } from "./types";

export type ConversationIntent =
  | "case_discussion"
  | "clarification_request"
  | "clinical_reasoning"
  | "conversation_continuation"
  | "differential_diagnosis"
  | "drug_question"
  | "ecg_interpretation"
  | "emergency_advice"
  | "follow_up"
  | "general_conversation"
  | "greeting"
  | "image_discussion"
  | "laboratory_interpretation"
  | "medical_education"
  | "medical_explanation"
  | "radiology_interpretation";

export type ConversationIntentResult = {
  educationalTopic: EducationalTopic;
  intent: ConversationIntent;
  isEducational: boolean;
  isFollowUp: boolean;
  isLearner: boolean;
  isTutorMode: boolean;
  reason: string;
};

type IntentInput = {
  attachments: AttachmentForAnalysis[];
  contextState: ContextState;
  memory: ConversationMemory;
  question: string;
  session?: SessionRecord;
};

function conversationText(memory: ConversationMemory) {
  return memory.turns.map((turn) => turn.content).join(" ").toLowerCase();
}

function userText(memory: ConversationMemory) {
  return memory.turns.filter((turn) => turn.role === "user").map((turn) => turn.content).join(" ").toLowerCase();
}

function mentionsEcg(text: string) {
  return /\b(ecg|ekg|electrocardiogram|electrocardiography)\b/i.test(text);
}

function wantsToLearn(text: string) {
  return /\b(learn|learning|study|studying|teach me|tutor|tutorial|learning path|want to learn|help me learn|how do i learn|how can i learn|basics|fundamentals)\b/i.test(text);
}

function isLearnerPersona(text: string) {
  return /\b(medical student|student doctor|resident|trainee|junior doctor|new to cardiology|just starting)\b/i.test(text);
}

function educationalFollowUp(text: string, memory: ConversationMemory, session?: SessionRecord) {
  if (session?.educationalMode) return true;
  const combined = `${userText(memory)} ${text}`.toLowerCase();
  const eduSignals = isLearnerPersona(combined) || wantsToLearn(combined) || mentionsEcg(combined) && wantsToLearn(combined);
  if (!eduSignals) return false;
  return /^(where should i start|what should i learn first|what next|what's next|continue|go on|next step|next topic|keep going|how do i start)\b/i.test(text.trim())
    || /\b(where (?:do|should) i start|what order|step by step|walk me through|guide me)\b/i.test(text);
}

function tutorModeActive(input: IntentInput) {
  if (input.session?.educationalMode) return true;
  const combined = `${userText(input.memory)} ${input.question}`.toLowerCase();
  if (wantsToLearn(combined) && mentionsEcg(combined)) return true;
  if (isLearnerPersona(combined) && (wantsToLearn(combined) || mentionsEcg(combined))) return true;
  if (educationalFollowUp(input.question, input.memory, input.session)) return true;
  return false;
}

function detectEducationalTopic(input: IntentInput): EducationalTopic {
  if (input.session?.educationalTopic && input.session.educationalTopic !== "none") {
    return input.session.educationalTopic;
  }
  const combined = `${userText(input.memory)} ${input.question}`.toLowerCase();
  if (mentionsEcg(combined) && (wantsToLearn(combined) || isLearnerPersona(combined))) return "ecg_basics";
  if (wantsToLearn(combined)) return "general_medicine";
  return "none";
}

function caseDiscussionActive(memory: ConversationMemory) {
  return /\b(this patient|the patient|my patient|patient has|patient with|year-old patient|\d{1,3}\s*year.old)\b/i.test(conversationText(memory));
}

function referencesPatient(text: string, contextState: ContextState) {
  return /\b(this patient|my patient|the patient|patient chart|patient record)\b/i.test(text)
    || contextState.entityMemory.patientNames.length > 0;
}

function hasVisionAttachments(attachments: AttachmentForAnalysis[], memory: ConversationMemory) {
  const labels = attachments.map((a) => `${a.documentType ?? ""} ${a.kind} ${a.originalName}`)
    .concat(memory.attachments.map((a) => `${a.documentType ?? ""} ${a.name}`));
  return labels.some((label) => /ecg|ekg|lab|laboratory|echo|x-?ray|radiology|ct|mri|cxr|imaging/i.test(label))
    || attachments.length > 0
    || memory.attachments.length > 0;
}

export const ConversationIntentEngine = {
  classify(input: IntentInput): ConversationIntentResult {
    const text = input.contextState.resolvedQuestion.toLowerCase();
    const raw = input.question.toLowerCase();
    const combined = `${userText(input.memory)} ${raw}`.toLowerCase();
    const isLearner = isLearnerPersona(combined);
    const isTutorMode = tutorModeActive(input);
    const eduTopic = detectEducationalTopic(input);
    const followUp = input.contextState.activeTopic !== null && input.memory.turns.length >= 2
      && (/\b(it|this|that|those findings|the ecg|the report|the patient|the medication)\b/i.test(raw)
        || /^(how|what about|why|tell me more|also|what would you|what should i|what next)/i.test(raw.trim())
        || /^(how is it|why does it|what causes it)\b/i.test(raw.trim()));

    if (/\b(cardiac arrest|not breathing|unresponsive|collapsed|anaphylaxis|active bleeding|ventricular fibrillation|\bvf\b|ventricular tachycardia|\bvt\b|syncope)\b/i.test(text)) {
      return { educationalTopic: "none", intent: "emergency_advice", isEducational: false, isFollowUp: followUp, isLearner, isTutorMode: false, reason: "acute-emergency" };
    }

    if (isTutorMode || educationalFollowUp(raw, input.memory, input.session)) {
      return {
        educationalTopic: eduTopic === "none" && mentionsEcg(combined) ? "ecg_basics" : eduTopic,
        intent: "medical_education",
        isEducational: true,
        isFollowUp: followUp,
        isLearner,
        isTutorMode: true,
        reason: "tutor-mode",
      };
    }

    if (/^(hi|hello|hey|good morning|good afternoon|good evening|salam)\b[!.?\s]*$/i.test(raw.trim())) {
      return { educationalTopic: "none", intent: "greeting", isEducational: false, isFollowUp: false, isLearner, isTutorMode: false, reason: "greeting" };
    }

    if (/^(goodbye|bye|see you|talk later)\b/i.test(raw.trim())) {
      return { educationalTopic: "none", intent: "general_conversation", isEducational: false, isFollowUp: false, isLearner, isTutorMode: false, reason: "farewell" };
    }

    if (/^(thanks|thank you|ok thanks|appreciate it)\b/i.test(raw.trim())) {
      return { educationalTopic: "none", intent: "general_conversation", isEducational: false, isFollowUp: false, isLearner, isTutorMode: false, reason: "thanks" };
    }

    if (/^(how are you|who are you|what can you do)\b/i.test(raw.trim())) {
      return { educationalTopic: "none", intent: "general_conversation", isEducational: false, isFollowUp: false, isLearner, isTutorMode: false, reason: "small-talk" };
    }

    if (isLearner && !mentionsEcg(combined) && !wantsToLearn(raw) && !input.contextState.activeTopic) {
      return {
        educationalTopic: "none",
        intent: "conversation_continuation",
        isEducational: true,
        isFollowUp: false,
        isLearner: true,
        isTutorMode: false,
        reason: "learner-intro",
      };
    }

    if (hasVisionAttachments(input.attachments, input.memory)
      && (input.attachments.length > 0 || /\b(this|the|uploaded|attached|interpret|review|findings|report|image|tracing)\b/i.test(raw))) {
      const intent: ConversationIntent = /lab|troponin|cbc|bmp|cmp/i.test(combined)
        ? "laboratory_interpretation"
        : /x-?ray|ct|mri|radiology|cxr/i.test(combined)
          ? "radiology_interpretation"
          : /ecg|ekg/i.test(combined)
            ? "ecg_interpretation"
            : "image_discussion";
      return { educationalTopic: "none", intent, isEducational: false, isFollowUp: followUp, isLearner, isTutorMode: false, reason: "upload-context" };
    }

    if (/\b(interpret|analyze|analyse|review|read)\b/i.test(raw) && mentionsEcg(raw) && !hasVisionAttachments(input.attachments, input.memory)) {
      return { educationalTopic: "none", intent: "clarification_request", isEducational: false, isFollowUp: false, isLearner, isTutorMode: false, reason: "ecg-clarification" };
    }

    if (referencesPatient(raw, input.contextState) || (caseDiscussionActive(input.memory) && followUp)) {
      return { educationalTopic: "none", intent: "case_discussion", isEducational: false, isFollowUp: followUp, isLearner, isTutorMode: false, reason: "patient-case" };
    }

    if (/\b(drug|medication|dose|interaction|warfarin|amiodarone|statin|tablet|prescription)\b/i.test(text)) {
      return { educationalTopic: "none", intent: "drug_question", isEducational: false, isFollowUp: followUp, isLearner, isTutorMode: false, reason: "medication" };
    }

    if (/\b(differential|ddx|rule out|what else could)\b/i.test(text)) {
      return { educationalTopic: "none", intent: "differential_diagnosis", isEducational: false, isFollowUp: followUp, isLearner, isTutorMode: false, reason: "differential" };
    }

    if (followUp && input.contextState.activeTopic) {
      return { educationalTopic: "none", intent: "follow_up", isEducational: false, isFollowUp: true, isLearner, isTutorMode: false, reason: "topic-follow-up" };
    }

    if (/^(what is|explain|can you explain|tell me about|how does|why does|what causes)\b/i.test(raw.trim())) {
      return { educationalTopic: "none", intent: "medical_explanation", isEducational: false, isFollowUp: followUp, isLearner, isTutorMode: false, reason: "explain-request" };
    }

    if (/\b(chest pain|syncope|work up|approach to|what would you do|clinical reasoning)\b/i.test(text)) {
      return { educationalTopic: "none", intent: "clinical_reasoning", isEducational: false, isFollowUp: followUp, isLearner, isTutorMode: false, reason: "clinical-reasoning" };
    }

    return { educationalTopic: "none", intent: "medical_explanation", isEducational: false, isFollowUp: followUp, isLearner, isTutorMode: false, reason: "default-clinical" };
  },
};
