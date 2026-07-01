import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory } from "../../copilot-types";
import type { ContextState } from "../types";
import type { SessionRecord } from "../conversation-manager";
import type { EducationalTopic, EmergencyLevel, ReasoningResult } from "./types";
import { ECG_LEARNING_PATH } from "./types";

const VISION_DOC_TYPES = /ecg|ekg|lab|laboratory|echo|echocardiogram|x-?ray|radiology|ct|mri|cxr|imaging/i;

const ACUTE_EMERGENCY = [
  "cardiac arrest", "ventricular fibrillation", "ventricular tachycardia",
  "not breathing", "unresponsive", "collapsed", "anaphylaxis", "active bleeding",
];

type ReasonInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  contextState: ContextState;
  isFollowUp: boolean;
  memory: ConversationMemory;
  question: string;
  session?: SessionRecord;
};

function conversationText(memory: ConversationMemory) {
  return memory.turns.map((turn) => turn.content).join(" ").toLowerCase();
}

function asksToLearnEcg(text: string) {
  return /\b(learn|learning|study|studying|teach me|help me (learn|understand|read)|how (?:do|can) i (?:learn|read|interpret)|want to learn|learning path|ecg basics|read an ecg|ecg fundamentals)\b/.test(text)
    && /\b(ecg|ekg|electrocardiogram)\b/.test(text);
}

function isLearnerPersona(text: string) {
  return /\b(medical student|student doctor|resident|trainee|junior doctor|new to cardiology|just starting)\b/.test(text);
}

function isEducationalFollowUp(text: string, memory: ConversationMemory) {
  if (/^(where should i start|what should i learn first|what next|what's next|continue|go on|next step|next topic|keep going)\b/i.test(text.trim())) {
    return /\b(learn|learning|study|medical student|tutor|tutorial|ecg basics|learning path|step by step)\b/.test(conversationText(memory));
  }
  return /\b(where (?:do|should) i start|what order|step by step|walk me through|guide me)\b/i.test(text);
}

function educationalContextActive(memory: ConversationMemory, session?: SessionRecord) {
  if (session?.educationalMode) return true;
  const combined = conversationText(memory);
  if (!combined.trim()) return false;
  return /\b(medical student|learn|learning|study|studying|tutor|tutorial|teach me|learning path|step by step|ecg basics|fundamentals|where should i start)\b/.test(combined);
}

function detectEducationalTopic(memory: ConversationMemory, text: string, session?: SessionRecord): EducationalTopic {
  if (session?.educationalTopic && session.educationalTopic !== "none") return session.educationalTopic;
  const combined = `${conversationText(memory)} ${text}`;
  if (/\b(ecg|ekg|electrocardiogram)\b/.test(combined) && /\b(learn|study|basics|fundamentals|read|interpret)\b/.test(combined)) {
    return "ecg_basics";
  }
  if (/\b(learn|study|basics|fundamentals)\b/.test(combined)) return "general_medicine";
  return "none";
}

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

function referencesPatient(text: string, contextState: ContextState) {
  if (contextState.entityMemory.patientNames.length) return true;
  return /\b(this patient|my patient|the patient|patient chart|patient record|patient profile|open .*patient|patient named)\b/i.test(text);
}

function referencesCase(text: string) {
  return /\b(this case|the case|active case|current case|this tracing|this ecg|the tracing|uploaded|attached|the file|the image|the report)\b/i.test(text);
}

function isGreeting(text: string, memory: ConversationMemory) {
  const trimmed = text.trim();
  return /^(hi|hello|hey|good morning|good afternoon|good evening|salam)\b[!.?\s]*$/i.test(trimmed)
    || (memory.turns.length === 0 && /^(hi|hello|hey)\b/i.test(trimmed));
}

function isFarewell(text: string) {
  return /^(goodbye|bye|see you|talk later)\b/i.test(text.trim());
}

function isSmallTalk(text: string) {
  return /^(how are you|who are you|what can you do|thanks|thank you)\b/i.test(text.trim());
}

function detectEmergency(text: string): EmergencyLevel {
  const lowered = text.toLowerCase();
  if (ACUTE_EMERGENCY.some((term) => lowered.includes(term))) return "HIGH";
  if (/\b(chest pain|syncope|crushing pain|stemi|shortness of breath|dyspnea)\b/.test(lowered)) return "MODERATE";
  return "NONE";
}

function hasVisionAttachments(attachments: AttachmentForAnalysis[], memory: ConversationMemory) {
  const allNames = attachments.map((item) => `${item.documentType ?? ""} ${item.kind} ${item.originalName}`)
    .concat(memory.attachments.map((item) => `${item.documentType ?? ""} ${item.name}`));
  return allNames.some((label) => VISION_DOC_TYPES.test(label)) || attachments.length > 0 || memory.attachments.length > 0;
}

function needsEcgClarification(text: string, attachments: AttachmentForAnalysis[], memory: ConversationMemory, educational: boolean) {
  if (educational) return false;
  const hasEcg = attachments.some((a) => /ecg|ekg/i.test(`${a.documentType ?? ""} ${a.kind} ${a.originalName}`))
    || memory.attachments.some((a) => /ecg|ekg/i.test(a.name));
  if (hasEcg) return false;
  return /\b(interpret|analyze|analyse|review|read)\b/i.test(text) && /\b(ecg|ekg|tracing|strip)\b/i.test(text);
}

export const MedicalReasoning = {
  analyze(input: ReasonInput): ReasoningResult {
    const text = input.contextState.resolvedQuestion.toLowerCase();
    const raw = input.question.toLowerCase();
    const eduActive = educationalContextActive(input.memory, input.session);
    const eduTopic = detectEducationalTopic(input.memory, text, input.session);
    const educationalMode = eduActive
      || asksToLearnEcg(text)
      || asksToLearnEcg(raw)
      || (isLearnerPersona(text) && /\b(ecg|ekg|help|learn)\b/.test(text))
      || isEducationalFollowUp(input.question, input.memory);
    const emergencyLevel = detectEmergency(text);

    if (emergencyLevel === "HIGH") {
      return {
        clarificationPrompt: undefined,
        educationalMode: false,
        educationalTopic: "none",
        emergencyLevel,
        knowledgeQuery: input.contextState.resolvedQuestion,
        learningStep: 0,
        mode: "emergency",
        needsClarification: false,
        needsKnowledge: true,
        needsPatientContext: Boolean(input.chatInput.patientId || input.chatInput.caseId),
        needsVision: hasVisionAttachments(input.attachments, input.memory),
        responseTag: "Follow-up",
      };
    }

    if (needsEcgClarification(text, input.attachments, input.memory, educationalMode)) {
      return {
        clarificationPrompt: "Share the ECG image or open the case here, and tell me what you'd like me to focus on — rhythm, ischaemia, conduction, or QT.",
        educationalMode: false,
        educationalTopic: "none",
        emergencyLevel,
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

    if (educationalMode) {
      return {
        clarificationPrompt: undefined,
        educationalMode: true,
        educationalTopic: eduTopic === "none" && /\b(ecg|ekg)\b/.test(text) ? "ecg_basics" : eduTopic,
        emergencyLevel,
        knowledgeQuery: input.contextState.resolvedQuestion,
        learningStep: eduTopic === "ecg_basics" || /\b(ecg|ekg)\b/.test(text)
          ? learningStepFor(input.memory, text, input.session)
          : 0,
        mode: "education",
        needsClarification: false,
        needsKnowledge: true,
        needsPatientContext: false,
        needsVision: false,
        responseTag: "Medical Education",
      };
    }

    if (isGreeting(text, input.memory)) {
      return baseResult("greeting", input, emergencyLevel, false, false, false, "Clinical Summary");
    }

    if (isFarewell(text)) {
      return baseResult("farewell", input, emergencyLevel, false, false, false, "Clinical Summary");
    }

    if (isSmallTalk(text)) {
      return baseResult("small_talk", input, emergencyLevel, false, false, false, "Clinical Summary");
    }

    const visionAttachments = input.attachments.length > 0
      || (input.memory.attachments.length > 0 && (referencesCase(text) || referencesPatient(text, input.contextState)));
    if (visionAttachments && hasVisionAttachments(input.attachments, input.memory)) {
      return {
        clarificationPrompt: undefined,
        educationalMode: false,
        educationalTopic: "none",
        emergencyLevel,
        knowledgeQuery: input.contextState.resolvedQuestion,
        learningStep: 0,
        mode: "vision_review",
        needsClarification: false,
        needsKnowledge: /explain|why|what does|interpret|review|findings|abnormal/i.test(text),
        needsPatientContext: referencesPatient(text, input.contextState) && Boolean(input.chatInput.patientId),
        needsVision: true,
        responseTag: "ECG Interpretation",
      };
    }

    const wantsPatient = referencesPatient(text, input.contextState)
      && (Boolean(input.chatInput.patientId) || Boolean(input.chatInput.caseId) || input.contextState.entityMemory.patientNames.length > 0);
    if (wantsPatient) {
      return {
        clarificationPrompt: undefined,
        educationalMode: false,
        educationalTopic: "none",
        emergencyLevel,
        knowledgeQuery: input.contextState.resolvedQuestion,
        learningStep: 0,
        mode: "patient_context",
        needsClarification: false,
        needsKnowledge: false,
        needsPatientContext: true,
        needsVision: false,
        responseTag: "Clinical Summary",
      };
    }

    if (input.isFollowUp && input.contextState.activeTopic) {
      return {
        clarificationPrompt: undefined,
        educationalMode: false,
        educationalTopic: "none",
        emergencyLevel,
        knowledgeQuery: input.contextState.resolvedQuestion,
        learningStep: 0,
        mode: "follow_up",
        needsClarification: false,
        needsKnowledge: true,
        needsPatientContext: Boolean(input.chatInput.patientId) && referencesPatient(text, input.contextState),
        needsVision: false,
        responseTag: "Clinical Summary",
      };
    }

    if (emergencyLevel === "MODERATE") {
      return {
        clarificationPrompt: undefined,
        educationalMode: false,
        educationalTopic: "none",
        emergencyLevel,
        knowledgeQuery: input.contextState.resolvedQuestion,
        learningStep: 0,
        mode: "emergency",
        needsClarification: false,
        needsKnowledge: true,
        needsPatientContext: Boolean(input.chatInput.patientId),
        needsVision: hasVisionAttachments(input.attachments, input.memory),
        responseTag: "Follow-up",
      };
    }

    return {
      clarificationPrompt: undefined,
      educationalMode: false,
      educationalTopic: "none",
      emergencyLevel,
      knowledgeQuery: input.contextState.resolvedQuestion,
      learningStep: 0,
      mode: "clinical_question",
      needsClarification: false,
      needsKnowledge: true,
      needsPatientContext: false,
      needsVision: input.attachments.length > 0,
      responseTag: input.contextState.activeTopic?.slug === "stemi" ? "ECG Interpretation" : "Clinical Summary",
    };
  },
};

function baseResult(
  mode: ReasoningResult["mode"],
  input: ReasonInput,
  emergencyLevel: EmergencyLevel,
  needsKnowledge: boolean,
  needsPatientContext: boolean,
  needsVision: boolean,
  tag: string,
): ReasoningResult {
  return {
    clarificationPrompt: undefined,
    educationalMode: false,
    educationalTopic: "none",
    emergencyLevel,
    knowledgeQuery: input.contextState.resolvedQuestion,
    learningStep: 0,
    mode,
    needsClarification: false,
    needsKnowledge,
    needsPatientContext,
    needsVision,
    responseTag: tag,
  };
}
