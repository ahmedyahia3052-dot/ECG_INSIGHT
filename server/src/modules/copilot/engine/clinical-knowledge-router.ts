import type { AttachmentForAnalysis, ConversationMemory } from "../copilot-types";
import { hasUploadedEcgAttachment } from "../intent-helpers";
import type { IntentClassificationResult } from "../smart-intent-types";
import type { SessionRecord } from "./conversation-manager";

export type ClinicalKnowledgeDomain =
  | "clinical_reasoning"
  | "differential_diagnosis"
  | "drug_information"
  | "ecg_interpretation"
  | "education"
  | "emergency_assessment"
  | "general_conversation"
  | "guidelines"
  | "laboratory_interpretation"
  | "radiology_interpretation";

export type EducationalTopic = "ecg_basics" | "general_medicine" | "none";

export type ClinicalKnowledgeRouteResult = {
  confidence: number;
  domain: ClinicalKnowledgeDomain;
  educationalMode: boolean;
  educationalTopic: EducationalTopic;
  learningStep: number;
  reason: string;
};

const ECG_BASICS_STEPS = [
  "ECG paper and calibration",
  "Heart rate",
  "Rhythm",
  "Axis",
  "Intervals (PR, QRS, QT)",
  "Waveforms (P, QRS, ST, T)",
] as const;

export const ECG_LEARNING_PATH = [...ECG_BASICS_STEPS];

type RouteInput = {
  attachments: AttachmentForAnalysis[];
  classification: IntentClassificationResult;
  memory: ConversationMemory;
  previousSession?: SessionRecord;
  question: string;
  resolvedQuestion: string;
};

type DomainScore = { domain: ClinicalKnowledgeDomain; reason: string; score: number };

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

function isEducationalFollowUp(text: string) {
  return /^(where should i start|what should i learn first|what next|what's next|continue|go on|next step|next topic|keep going|tell me more about that)\b/i.test(text.trim())
    || /\b(where (?:do|should) i start|what order|step by step|walk me through|guide me)\b/i.test(text);
}

function isClinicalEcgInterpretation(text: string, attachments: AttachmentForAnalysis[], memory: ConversationMemory) {
  if (hasUploadedEcgAttachment(attachments) || memory.attachments.some((item) => /ecg|ekg/i.test(item.name))) {
    return /interpret|analyze|analyse|review|read|findings|diagnosis/i.test(text);
  }
  return /interpret (?:this|the|my) ?ecg|analyze (?:this|the|my) ?ecg|review (?:this|the|my) (?:ecg|tracing)|read (?:this|the|my) (?:ecg|tracing)/i.test(text);
}

function educationalContextActive(memory: ConversationMemory, previousSession?: SessionRecord) {
  if (previousSession?.educationalMode) return true;
  const combined = conversationText(memory);
  if (!combined.trim()) return false;
  const learnerSignals = /\b(medical student|learn|learning|study|studying|tutor|tutorial|teach me|learning path|step by step|ecg basics|fundamentals|where should i start)\b/.test(combined);
  const clinicalUploadSignals = /\b(upload|interpret this|analyze this tracing|attached ecg|review this file)\b/.test(combined);
  return learnerSignals && !clinicalUploadSignals;
}

function detectEducationalTopic(memory: ConversationMemory, text: string, previousSession?: SessionRecord): EducationalTopic {
  if (previousSession?.educationalTopic && previousSession.educationalTopic !== "none") {
    return previousSession.educationalTopic;
  }
  const combined = `${conversationText(memory)} ${text}`;
  if (/\b(ecg|ekg|electrocardiogram)\b/.test(combined) && /\b(learn|study|basics|fundamentals|read|interpret)\b/.test(combined)) {
    return "ecg_basics";
  }
  if (/\b(learn|study|basics|fundamentals)\b/.test(combined)) return "general_medicine";
  return "none";
}

function scoreDomains(input: RouteInput): DomainScore[] {
  const text = input.resolvedQuestion.toLowerCase();
  const raw = input.question.toLowerCase();
  const combined = `${conversationText(input.memory)} ${text}`;
  const eduActive = educationalContextActive(input.memory, input.previousSession);
  const eduTopic = detectEducationalTopic(input.memory, text, input.previousSession);
  const scores: DomainScore[] = [];

  const educationScore = (() => {
    let score = 0;
    if (asksToLearnEcg(text) || asksToLearnEcg(raw)) score += 0.95;
    if (isLearnerPersona(text) && /\b(ecg|ekg|help|learn)\b/.test(text)) score += 0.9;
    if (eduActive && isEducationalFollowUp(text)) score += 0.92;
    if (eduActive) score += 0.75;
    if (/\b(teach me|tutorial|learning path|study plan|how do i get better at)\b/.test(text)) score += 0.85;
    if (/\b(explain like|for beginners|from scratch|basics of)\b/.test(text)) score += 0.8;
    if (score > 0 && isClinicalEcgInterpretation(text, input.attachments, input.memory)) score -= 0.5;
    return score;
  })();
  scores.push({ domain: "education", reason: eduTopic === "ecg_basics" ? "ecg-learning-context" : "educational-context", score: educationScore });

  const ecgScore = (() => {
    if (educationScore >= 0.7) return 0;
    let score = 0;
    if (isClinicalEcgInterpretation(text, input.attachments, input.memory)) score += 0.9;
    if (input.classification.primaryIntent === "ecg_interpretation") score += 0.7;
    if (/\b(st elevation|st depression|qtc|qrs|rhythm strip|12[- ]lead)\b/.test(text) && !asksToLearnEcg(text)) score += 0.55;
    return score;
  })();
  scores.push({ domain: "ecg_interpretation", reason: "clinical-ecg-request", score: ecgScore });

  if (input.classification.emergencyPriority !== "NONE" || input.classification.primaryIntent === "emergency_warning") {
    scores.push({ domain: "emergency_assessment", reason: "emergency-signals", score: 0.94 });
  }

  if (input.classification.primaryIntent === "drug_information" || input.classification.primaryIntent === "drug_interaction") {
    scores.push({ domain: "drug_information", reason: "medication-focus", score: 0.88 });
  }

  if (input.classification.primaryIntent === "medical_guidelines" || input.classification.primaryIntent === "evidence_search") {
    scores.push({ domain: "guidelines", reason: "guideline-request", score: 0.86 });
  }

  if (/\b(cbc|bmp|cmp|troponin|hemoglobin|lab report|laboratory)\b/.test(text)) {
    scores.push({ domain: "laboratory_interpretation", reason: "lab-focus", score: 0.84 });
  }

  if (/\b(x-?ray|radiology|ct scan|mri|cxr|imaging report|echo report)\b/.test(text)) {
    scores.push({ domain: "radiology_interpretation", reason: "imaging-focus", score: 0.84 });
  }

  if (/\b(differential|ddx|rule out|what else could|could this be)\b/.test(text)) {
    scores.push({ domain: "differential_diagnosis", reason: "differential-reasoning", score: 0.82 });
  }

  if (/\b(work up|approach to|how should i think|clinical reasoning|assessment of)\b/.test(text)) {
    scores.push({ domain: "clinical_reasoning", reason: "reasoning-request", score: 0.78 });
  }

  if (["greeting", "goodbye", "thanks", "small_talk", "conversation"].includes(input.classification.primaryIntent)) {
    scores.push({ domain: "general_conversation", reason: "conversational", score: 0.9 });
  }

  scores.push({ domain: "clinical_reasoning", reason: "default-clinical", score: 0.35 });
  return scores;
}

function learningStepFor(memory: ConversationMemory, text: string, previousSession?: SessionRecord) {
  const current = previousSession?.learningStep ?? 0;
  if (/^(where should i start|what should i learn first|how do i start)\b/i.test(text.trim()) || /\bwhere (?:do|should) i start\b/i.test(text)) {
    return 1;
  }
  if (/\b(next|continue|what next|go on|next step|next topic|keep going)\b/i.test(text)) {
    return Math.min(Math.max(current, 1) + 1, ECG_BASICS_STEPS.length);
  }
  if (current > 0) return current;
  const assistantTurns = memory.turns.filter((turn) => turn.role === "assistant");
  for (const step of ECG_BASICS_STEPS) {
    if (assistantTurns.some((turn) => turn.content.toLowerCase().includes(step.toLowerCase().slice(0, 12)))) {
      return ECG_BASICS_STEPS.indexOf(step as typeof ECG_BASICS_STEPS[number]) + 1;
    }
  }
  return 0;
}

export const ClinicalKnowledgeRouter = {
  route(input: RouteInput): ClinicalKnowledgeRouteResult {
    const scores = scoreDomains(input);
    const best = scores.sort((left, right) => right.score - left.score)[0];
    const educationalMode = best.domain === "education" || educationalContextActive(input.memory, input.previousSession);
    const educationalTopic = educationalMode ? detectEducationalTopic(input.memory, input.resolvedQuestion.toLowerCase(), input.previousSession) : "none";
    const learningStep = educationalMode && educationalTopic === "ecg_basics"
      ? learningStepFor(input.memory, input.resolvedQuestion.toLowerCase(), input.previousSession)
      : 0;

    return {
      confidence: Math.min(0.99, Math.max(0.45, best.score)),
      domain: best.score < 0.45 ? "clinical_reasoning" : best.domain,
      educationalMode,
      educationalTopic,
      learningStep,
      reason: best.reason,
    };
  },
};
