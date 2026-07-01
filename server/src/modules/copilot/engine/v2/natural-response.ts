import type { AttachmentInsight, ClinicalContext, ConversationMemory, KnowledgeHit } from "../../copilot-types";
import {
  casualResponse,
  greetingResponse,
  helpRequestResponse,
} from "../../intent-manager";
import type { ContextState } from "../types";
import type { ReasoningResult } from "./types";
import { ECG_LEARNING_PATH } from "./types";

const ARTIFACT_PATTERNS = [
  /^#{1,3}\s.+$/gm,
  /^Short Answer\s*$/gim,
  /^Definition:\s*/gim,
  /^Causes:\s*/gim,
  /^Recommendation:\s*/gim,
  /^References:\s*/gim,
  /^Differential diagnosis:\s*/gim,
  /\nConfidence Score:\s*\d+%/gi,
  /\bCitations:\s*.+$/gim,
  /Risk tier:/gi,
  /Intent:\s*.+$/gim,
  /Knowledge route:\s*.+$/gim,
];

function polish(content: string) {
  let text = content;
  for (const pattern of ARTIFACT_PATTERNS) text = text.replace(pattern, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function joinSentences(parts: string[]) {
  return parts.filter(Boolean).map((p) => p.trim().replace(/\.$/, "")).join(". ").replace(/\.\./g, ". ").trim() + (parts.length ? "." : "");
}

function knowledgeProse(hit: KnowledgeHit | undefined, fallback: string) {
  if (!hit) return fallback;
  const content = hit.content.replace(/\s+/g, " ").trim();
  const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 3);
  return sentences.join(" ").trim();
}

function ecgPathList() {
  return ECG_LEARNING_PATH.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

function stepLesson(stepIndex: number, knowledge: KnowledgeHit[]) {
  const step = ECG_LEARNING_PATH[Math.max(0, Math.min(stepIndex - 1, ECG_LEARNING_PATH.length - 1))];
  const hit = knowledge.find((entry) => entry.topic.toLowerCase().includes(step.split(" ")[0].toLowerCase()));
  const lessons: Record<string, string> = {
    "ECG paper and calibration": "On standard paper at 25 mm/s and 10 mm/mV, each large square is 0.2 seconds and 0.5 mV. Confirm speed and calibration marks before measuring anything.",
    "Heart rate": "For regular rhythms, divide 300 by large squares between R waves. For irregular rhythms, count beats in six seconds and multiply by ten.",
    "Rhythm": "Ask whether the rhythm is regular, whether P waves are visible, and whether every P is followed by a QRS.",
    "Axis": "Look at leads I and aVF: both positive suggests normal axis; I positive and aVF negative suggests left axis deviation.",
    "Intervals (PR, QRS, QT)": "Measure PR, QRS, and QT in the same lead. Normal PR is about 120–200 ms, QRS under 120 ms, and QT should be interpreted with rate correction.",
    "Waveforms (P, QRS, ST, T)": "Inspect P morphology, QRS shape, ST position, and T-wave symmetry only after rate, rhythm, axis, and intervals are established.",
  };
  return hit ? knowledgeProse(hit, lessons[step] ?? "") : (lessons[step] ?? "Let's work through this step carefully.");
}

function composeEducation(question: string, reasoning: ReasoningResult, knowledge: KnowledgeHit[]) {
  const lowered = question.toLowerCase();
  if (reasoning.educationalTopic === "ecg_basics") {
    if (/where should i start|what should i learn first|how do i start/i.test(lowered)) {
      return [
        "Great question — build ECG foundations before pattern-spotting.",
        `Start with ${ECG_LEARNING_PATH[0]}: ${stepLesson(1, knowledge)}`,
        `Here is the path we'll follow:\n${ecgPathList()}`,
        `When you're ready, say "next step" and we'll move to ${ECG_LEARNING_PATH[1]}.`,
      ].join("\n\n");
    }
    if (/\b(next|continue|what next|go on|next step)\b/i.test(lowered) && reasoning.learningStep > 0) {
      const step = ECG_LEARNING_PATH[Math.min(reasoning.learningStep - 1, ECG_LEARNING_PATH.length - 1)];
      const next = ECG_LEARNING_PATH[Math.min(reasoning.learningStep, ECG_LEARNING_PATH.length - 1)];
      const closing = reasoning.learningStep < ECG_LEARNING_PATH.length
        ? `Say "next step" when you're ready for ${next}.`
        : "You've covered the core systematic read — we can practice on example tracings whenever you like.";
      return [`Step ${reasoning.learningStep}: ${step}.`, stepLesson(reasoning.learningStep, knowledge), closing].join("\n\n");
    }
    return [
      "I'd be glad to tutor you through ECG step by step.",
      "We'll build fundamentals first, then systematic interpretation.",
      `Your learning path:\n${ecgPathList()}`,
      "You don't need to upload an ECG to begin — we'll start with the framework, then practice on tracings when you're ready.",
      "Where would you like to start, or shall we begin with ECG paper and calibration?",
    ].join("\n\n");
  }
  return knowledgeProse(knowledge[0], "Tell me what you're studying and I'll guide you step by step.");
}

function composeVision(insights: AttachmentInsight[], question: string) {
  if (!insights.length) {
    return "Attach an ECG, lab, imaging report, or clinical image and tell me what you'd like me to focus on.";
  }
  return insights.map((item) => {
    const name = item.name.replace(/\.[^.]+$/, "");
    const type = item.documentType?.replace(/_/g, " ").toLowerCase() ?? "medical document";
    const findings = item.findings.length
      ? item.findings.join("; ").replace(/\.$/, "")
      : item.interpretation.replace(/\.$/, "");
    if (/lab|cbc|chemistry|troponin/.test(`${type} ${name}`)) {
      return `From the ${name} lab report, I see ${findings}. I'd correlate this with symptoms, medications, renal function, and prior trends before acting on extracted text alone.`;
    }
    if (/echo|echocardiogram/.test(`${type} ${name}`)) {
      return `On the ${name} echo report, the key points appear to be ${findings}. I'd confirm chamber size, valve disease, and systolic function against the source document.`;
    }
    if (/x-?ray|radiology|ct|mri|cxr/.test(`${type} ${name}`)) {
      return `The ${name} imaging report highlights ${findings}. I'd review the full report and clinical context before relying on extracted text alone.`;
    }
    if (/ecg|ekg/.test(`${type} ${name}`)) {
      return `From the uploaded ECG (${name}), I note ${findings}. Tell me if you want a rhythm-focused read, ischaemia review, or a full interpretation.`;
    }
    return `In ${name}, the main findings read as ${findings}. What aspect would you like to explore?`;
  }).join("\n\n");
}

function composePatient(context: ClinicalContext) {
  const patient = context.patient;
  if (!patient) return "Tell me which patient you'd like to review, or open a patient chart and ask again.";
  return joinSentences([
    `${patient.fullName} is a ${patient.age}-year-old ${patient.gender.toLowerCase()}`,
    patient.history !== "not documented" ? `Past history includes ${patient.history}` : "",
    patient.medications !== "not documented" ? `Current medications: ${patient.medications}` : "",
  ]);
}

function composeEcgCase(context: ClinicalContext, question: string, knowledge: KnowledgeHit[]) {
  const ecgCase = context.currentCase;
  if (!ecgCase) return composeVision([], question);
  const hit = knowledge[0];
  return joinSentences([
    `This tracing shows ${ecgCase.rhythm ?? "an unclassified rhythm"} at about ${ecgCase.heartRate ?? "an unknown"} bpm`,
    ecgCase.intervals,
    ecgCase.diagnosis ? `The working diagnosis on file is ${ecgCase.diagnosis}` : "",
    hit ? knowledgeProse(hit, "") : "",
    "Tell me if you want a deeper read on rhythm, ischaemia, QT, or next steps",
  ]);
}

function composeClinical(question: string, topic: string | null, knowledge: KnowledgeHit[], memory: ConversationMemory) {
  const hit = knowledge[0];
  const simple = /^(what is|explain|can you explain|how does|why does|what causes|tell me about)\b/i.test(question.trim());
  if (topic && /treat|management|options|plan|drugs|medication/.test(question.toLowerCase())) {
    return knowledgeProse(hit, `For ${topic}, treatment depends on symptoms, comorbidities, and local guidelines. Share more context and I can narrow the options.`);
  }
  if (hit) {
    const answer = knowledgeProse(hit, "");
    if (simple && answer.length < 480) return answer;
    if (simple) return answer.split(".").slice(0, 3).join(". ").trim() + ".";
    return answer;
  }
  if (memory.turns.length) {
    return "I can help with that. Share symptoms, timing, vitals, or results you already have and I'll be more specific.";
  }
  return "I can help with that. What clinical context are you working with?";
}

function composeEmergency(question: string) {
  return joinSentences([
    "This could be urgent — if symptoms are active or worsening, arrange immediate clinical assessment now",
    "Share age, onset, associated features, vitals, ECG findings, and current medications and I'll help you think through immediate priorities",
  ]);
}

function composeFollowUp(topic: string | null, knowledge: KnowledgeHit[]) {
  const label = topic ?? "this topic";
  const hit = knowledge[0];
  return [
    hit ? knowledgeProse(hit, "") : `For ${label}, sensible next steps depend on severity, comorbidities, and local pathways.`,
    `Would you like to go deeper on diagnosis, treatment, or when urgent evaluation is needed for ${label}?`,
  ].filter(Boolean).join("\n\n");
}

export type ResponseInput = {
  clinicianName?: string | null;
  clinicalContext: ClinicalContext;
  contextState: ContextState;
  insights: AttachmentInsight[];
  knowledge: KnowledgeHit[];
  memory: ConversationMemory;
  question: string;
  reasoning: ReasoningResult;
};

export const NaturalResponse = {
  generate(input: ResponseInput): string {
    const { reasoning } = input;
    if (reasoning.needsClarification && reasoning.clarificationPrompt) {
      return polish(reasoning.clarificationPrompt);
    }

    let content: string;
    switch (reasoning.mode) {
      case "greeting":
        content = greetingResponse(input.clinicianName, input.question.length + input.memory.turns.length * 17);
        break;
      case "farewell":
        content = "Goodbye — I'm here whenever you need to think through a case.";
        break;
      case "small_talk":
        content = /help/i.test(input.question) ? helpRequestResponse() : casualResponse(input.question);
        break;
      case "education":
        content = composeEducation(input.question, reasoning, input.knowledge);
        break;
      case "emergency":
        content = composeEmergency(input.question);
        break;
      case "patient_context":
        content = composePatient(input.clinicalContext);
        break;
      case "vision_review":
        content = input.clinicalContext.currentCase
          ? composeEcgCase(input.clinicalContext, input.question, input.knowledge)
          : composeVision(input.insights, input.question);
        break;
      case "follow_up":
        content = composeFollowUp(input.contextState.activeTopic?.label ?? null, input.knowledge);
        break;
      default:
        content = composeClinical(
          input.question,
          input.contextState.activeTopic?.slug ?? null,
          input.knowledge,
          input.memory,
        );
    }

    return polish(content);
  },
};
