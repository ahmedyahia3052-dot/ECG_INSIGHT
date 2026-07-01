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

const STEP_LESSONS: Record<string, string> = {
  "Cardiac anatomy": "Start with the four chambers, atria and ventricles, and the valves that separate them. Knowing which chamber depolarizes when makes every ECG waveform easier to understand.",
  "Conduction system": "Follow the impulse from the SA node through the AV node, bundle of His, and bundle branches. This explains why P waves, the PR interval, and QRS shape matter.",
  "ECG paper": "Standard paper runs at 25 mm/s with 10 mm/mV calibration. Each small square is 1 mm; each large square is 5 mm — so one large square equals 0.2 seconds.",
  "Calibration": "Always confirm the speed and voltage calibration marks on the tracing before measuring anything. A wrong calibration can make a tracing look falsely abnormal.",
  "Lead placement": "Limb leads (I, II, III, aVR, aVL, aVF) and precordial leads (V1–V6) view the heart from different angles. Lead placement errors are a common source of misinterpretation.",
  "Heart rate": "For regular rhythms, divide 300 by the number of large squares between consecutive R waves. For irregular rhythms, count beats in six seconds and multiply by ten.",
  "Rhythm": "Ask three questions: is it regular, where is the P wave, and is every P followed by a QRS? Sinus rhythm has an upright P in lead II with a constant PR interval.",
  "Axis": "Estimate quickly from leads I and aVF: both positive suggests normal axis; I positive and aVF negative suggests left axis deviation.",
};

function polish(content: string) {
  let text = content;
  for (const pattern of ARTIFACT_PATTERNS) text = text.replace(pattern, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function joinSentences(parts: string[]) {
  return parts.filter(Boolean).map((p) => p.trim().replace(/\.$/, "")).join(". ").replace(/\.\./g, ". ").trim() + (parts.length ? "." : "");
}

function ecgPathList() {
  return ECG_LEARNING_PATH.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

function stepLesson(stepIndex: number) {
  const step = ECG_LEARNING_PATH[Math.max(0, Math.min(stepIndex - 1, ECG_LEARNING_PATH.length - 1))];
  return STEP_LESSONS[step] ?? "Let's work through this step carefully.";
}

function composeEducation(question: string, reasoning: ReasoningResult, memory: ConversationMemory) {
  const lowered = question.toLowerCase();
  const combined = memory.turns.filter((t) => t.role === "user").map((t) => t.content).join(" ").toLowerCase();

  if (reasoning.internalIntent === "conversation_continuation" || (reasoning.educationalTopic === "none" && /\bmedical student\b/i.test(combined))) {
    return [
      "Great — I'd be happy to tutor you.",
      "Tell me what you'd like to focus on. If you're starting cardiology, ECG is an excellent place to begin.",
      "Just say something like \"I want to learn ECG\" and we'll build a step-by-step path together.",
    ].join("\n\n");
  }

  if (reasoning.educationalTopic === "ecg_basics") {
    if (/want to learn|learn ecg|study ecg|teach me ecg/i.test(combined) && !/where should i start|what next|next step/i.test(lowered)) {
      return [
        "Perfect — let's learn ECG the way clinicians are taught: foundations first, then systematic interpretation.",
        "We'll never jump to advanced pathology until the basics feel solid.",
        `Here is the path we'll follow:\n${ecgPathList()}`,
        "Say \"where should I start?\" whenever you're ready, and we'll begin with cardiac anatomy.",
      ].join("\n\n");
    }

    if (/where should i start|what should i learn first|how do i start/i.test(lowered)) {
      const first = ECG_LEARNING_PATH[0];
      return [
        "Excellent question — start with fundamentals, not advanced arrhythmia or ischaemia patterns.",
        `Step 1: ${first}. ${stepLesson(1)}`,
        `Full learning path:\n${ecgPathList()}`,
        `When this feels clear, say "next step" and we'll cover ${ECG_LEARNING_PATH[1]}.`,
      ].join("\n\n");
    }

    if (/\b(next|continue|what next|go on|next step|next topic|keep going)\b/i.test(lowered) && reasoning.learningStep > 0) {
      const step = ECG_LEARNING_PATH[Math.min(reasoning.learningStep - 1, ECG_LEARNING_PATH.length - 1)];
      const next = ECG_LEARNING_PATH[Math.min(reasoning.learningStep, ECG_LEARNING_PATH.length - 1)];
      const closing = reasoning.learningStep < ECG_LEARNING_PATH.length
        ? `Say "next step" when you're ready for ${next}.`
        : "You've covered the core foundations — we can practice on example tracings whenever you like.";
      return [`Step ${reasoning.learningStep}: ${step}.`, stepLesson(reasoning.learningStep), closing].join("\n\n");
    }

    return [
      "I'd be glad to tutor you through ECG step by step.",
      `Your learning path:\n${ecgPathList()}`,
      "Where would you like to start, or shall we begin with cardiac anatomy?",
    ].join("\n\n");
  }

  return "Tell me what you're studying and I'll guide you step by step — ECG, cardiology, or another topic.";
}

function synthesizeFromKnowledge(question: string, topic: string | null, knowledge: KnowledgeHit[], memory: ConversationMemory) {
  if (!knowledge.length) {
    if (topic) return `For ${topic}, I'd think through symptoms, timing, examination findings, and targeted testing. What context do you have so far?`;
    return memory.turns.length
      ? "I can help with that. Share symptoms, timing, vitals, or results you already have and I'll be more specific."
      : "I can help with that. What clinical context are you working with?";
  }

  const hit = knowledge.find((entry) => topic && entry.topic.toLowerCase().includes(topic.split(" ")[0])) ?? knowledge[0];
  const excerpt = hit.content.replace(/\s+/g, " ").trim();
  const sentences = excerpt.split(/(?<=[.!?])\s+/).slice(0, 2);
  const topicLabel = topic ?? hit.topic;

  if (/^why does\b/i.test(question.trim()) && topic) {
    return joinSentences([
      `${topicLabel} can lead to the pattern you're asking about through chronic pressure or volume load on the heart`,
      sentences[0] ?? "",
      "I'd correlate this with symptoms, examination, ECG, and imaging before concluding",
    ]);
  }

  if (/^what would you do next\b/i.test(question.trim()) || /what should i do next/i.test(question)) {
    return joinSentences([
      `For ${topicLabel}, sensible next steps depend on severity and the presentation you already have`,
      "I'd clarify vitals, symptom onset, red flags, and any ECG or lab results",
      "Then outline immediate stabilization, targeted testing, and disposition",
    ]);
  }

  const simple = /^(what is|explain|can you explain|how does|why does|what causes|tell me about)\b/i.test(question.trim());
  if (simple) {
    return sentences.join(" ").trim() + (sentences.length ? "." : "");
  }

  return joinSentences([sentences[0] ?? `Regarding ${topicLabel},`, sentences[1] ?? "clinical correlation is important"]);
}

function composeVision(insights: AttachmentInsight[]) {
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

function composePatient(context: ClinicalContext, question: string, memory: ConversationMemory) {
  const patient = context.patient;
  if (/what would you do next|what should i do next/i.test(question) && !patient) {
    const prior = memory.turns.filter((t) => t.role === "user").map((t) => t.content).join(" ");
    if (/chest pain|patient has|this patient/i.test(prior)) {
      return joinSentences([
        "For a patient presenting with chest pain, I'd start with immediate vitals, a 12-lead ECG, and troponin",
        "Assess for red flags — ongoing pain, hypotension, arrhythmia, or ischaemic ECG changes",
        "Then decide on observation, serial troponins, cardiology referral, or emergency transfer based on risk",
      ]);
    }
  }
  if (!patient) return "Tell me which patient you'd like to review, or open a patient chart and ask again.";
  return joinSentences([
    `${patient.fullName} is a ${patient.age}-year-old ${patient.gender.toLowerCase()}`,
    patient.history !== "not documented" ? `Past history includes ${patient.history}` : "",
    patient.medications !== "not documented" ? `Current medications: ${patient.medications}` : "",
  ]);
}

function composeEcgCase(context: ClinicalContext) {
  const ecgCase = context.currentCase;
  if (!ecgCase) return composeVision([]);
  return joinSentences([
    `This tracing shows ${ecgCase.rhythm ?? "an unclassified rhythm"} at about ${ecgCase.heartRate ?? "an unknown"} bpm`,
    ecgCase.intervals,
    ecgCase.diagnosis ? `The working diagnosis on file is ${ecgCase.diagnosis}` : "",
    "Tell me if you want a deeper read on rhythm, ischaemia, QT, or next steps",
  ]);
}

function composeEmergency() {
  return joinSentences([
    "This could be urgent — if symptoms are active or worsening, arrange immediate clinical assessment now",
    "Share age, onset, associated features, vitals, ECG findings, and current medications and I'll help you think through immediate priorities",
  ]);
}

function composeFollowUp(topic: string | null, question: string, knowledge: KnowledgeHit[]) {
  const label = topic ?? "this topic";
  return synthesizeFromKnowledge(question, label, knowledge, { attachments: [], summary: "", turns: [] });
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
        content = composeEducation(input.question, reasoning, input.memory);
        break;
      case "emergency":
        content = composeEmergency();
        break;
      case "patient_context":
        content = composePatient(input.clinicalContext, input.question, input.memory);
        break;
      case "vision_review":
        content = input.clinicalContext.currentCase
          ? composeEcgCase(input.clinicalContext)
          : composeVision(input.insights);
        break;
      case "follow_up":
        content = composeFollowUp(input.contextState.activeTopic?.label ?? null, input.question, input.knowledge);
        break;
      default:
        content = synthesizeFromKnowledge(
          input.question,
          input.contextState.activeTopic?.slug ?? null,
          input.knowledge,
          input.memory,
        );
    }

    return polish(content);
  },
};
