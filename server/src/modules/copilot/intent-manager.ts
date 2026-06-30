import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory, MedicalIntent } from "./copilot-types";
import { runIntentPipeline } from "./intent-pipeline";
import { conversationTopic, isEcgUploadPendingInterpretation } from "./intent-helpers";
import { isFastPathFromPlan, shouldRetrieveClinicalContextFromPlan, shouldRetrieveKnowledgeFromPlan } from "./tool-router";
import type { CopilotTool, IntentPipelineResult } from "./smart-intent-types";

export type { MedicalIntent };
export { conversationTopic, isEcgUploadPendingInterpretation };

export type ConversationPatientHint = {
  age?: number;
  gender?: string;
  topic?: string;
};

export function emptyClinicalContext() {
  return { criticalAlerts: [], documents: [], previousEcgs: [], reports: [], sources: [] };
}

export function conversationPatientHint(memory: ConversationMemory): ConversationPatientHint {
  const userText = memory.turns.filter((turn) => turn.role === "user").map((turn) => turn.content).join(" ");
  const ageMatch = userText.match(/\b(?:patient\s+is\s+|he\s+is\s+|she\s+is\s+|they\s+are\s+)?(\d{1,3})\s*(?:years?\s*old|year-old|y\/o|yo\b)/i);
  const genderMatch = userText.match(/\b(male|female|man|woman)\b/i);
  return {
    age: ageMatch ? Number(ageMatch[1]) : undefined,
    gender: genderMatch?.[1]?.toLowerCase(),
    topic: conversationTopic(memory),
  };
}

export function classifyMedicalIntent(question: string, attachments: AttachmentForAnalysis[], memory: ConversationMemory): MedicalIntent {
  return runIntentPipeline({ attachments, chatInput: {}, memory, question }).classification.primaryMedicalIntent;
}

export function classifyWithPipeline(question: string, attachments: AttachmentForAnalysis[], memory: ConversationMemory, chatInput: ChatContextInput = {}): IntentPipelineResult {
  return runIntentPipeline({ attachments, chatInput, memory, question });
}

export function shouldRetrieveClinicalContext(intent: MedicalIntent, input: ChatContextInput, tools?: CopilotTool[]) {
  if (tools) return shouldRetrieveClinicalContextFromPlan(tools, input);
  if (["greeting", "general_medical_question", "medication_question", "small_talk", "unknown", "voice_conversation"].includes(intent)) {
    return false;
  }
  if (["patient_information", "current_ecg_case", "ecg_interpretation", "generate_report", "explain_diagnosis", "follow_up_plan", "upload_analysis", "emergency_triage", "occupational_fitness"].includes(intent)) {
    return Boolean(input.caseId || input.patientId);
  }
  return false;
}

export function shouldRetrieveKnowledge(input: { attachments: AttachmentForAnalysis[]; intent: MedicalIntent; question: string; tools?: CopilotTool[]; smartIntent?: string }) {
  if (input.tools) {
    return shouldRetrieveKnowledgeFromPlan(input.tools, input.question, (input.smartIntent ?? "general_medical_question") as never);
  }
  if (["greeting", "small_talk", "unknown", "voice_conversation", "show_sources", "current_ecg_case", "patient_information", "generate_report"].includes(input.intent)) {
    return false;
  }
  if (input.intent === "upload_analysis") {
    return /interpret|review|explain|diagnosis|findings|abnormal|rhythm|stemi|qt|af|analyze|analyse|look at|what do you see/i.test(input.question);
  }
  return ["general_medical_question", "medication_question", "ecg_interpretation", "explain_diagnosis", "follow_up_plan", "emergency_triage", "occupational_fitness"].includes(input.intent);
}

export function analyticalIntent(intent: MedicalIntent) {
  return ["ecg_interpretation", "upload_analysis", "generate_report", "explain_diagnosis", "emergency_triage", "occupational_fitness", "follow_up_plan", "medication_question", "general_medical_question", "current_ecg_case", "patient_information"].includes(intent);
}

export function tagForIntent(intent: MedicalIntent, fallback: string) {
  if (intent === "occupational_fitness") return "Occupational Fitness";
  if (intent === "follow_up_plan" || intent === "emergency_triage") return "Follow-up";
  if (intent === "ecg_interpretation" || intent === "current_ecg_case" || intent === "upload_analysis") return "ECG Interpretation";
  if (intent === "generate_report" || intent === "explain_diagnosis" || intent === "general_medical_question" || intent === "medication_question" || intent === "patient_information") return "Clinical Summary";
  return fallback ?? "Clinical Summary";
}

function clinicianFirstName(name?: string | null) {
  const normalized = name?.replace(/^dr\.?\s+/i, "").trim();
  return normalized?.split(/\s+/)[0] || "Doctor";
}

export function greetingResponse(clinicianName?: string | null, seed = Date.now()) {
  const clinician = clinicianFirstName(clinicianName);
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const variants = [
    `${salutation} Dr ${clinician}.\n\nWelcome back.\n\nHow can I help you today?`,
    `Hello!\n\nIt's great to see you again.\n\nWhat would you like to work on today?`,
    `Hello Dr ${clinician}.\n\nHow can I help you today?`,
  ];
  return variants[seed % variants.length];
}

export function helpRequestResponse() {
  return [
    "Of course.",
    "I'm here to help.",
    "Tell me what you need.",
    "You can ask me about ECG interpretation, cardiology, uploaded ECGs, medical questions, reports, or patient cases.",
  ].join("\n\n");
}

export function casualResponse(question: string) {
  if (/^how are you\b/i.test(question.trim())) {
    return "I'm ready when you are. What would you like to work on?";
  }
  if (/^who are you\b/i.test(question.trim())) {
    return "I'm ECG Insight AI — your clinical copilot for ECG interpretation, cardiology questions, reports, and patient workflows.";
  }
  if (/^what can you do\b/i.test(question.trim())) {
    return "I can help with ECG interpretation, medical questions, uploaded files, patient context, reports, and follow-up planning.";
  }
  if (/^(thanks|thank you|ok thanks|appreciate it|nice to meet you)\b/i.test(question.trim())) {
    return "You're welcome. Let me know whenever you'd like to continue.";
  }
  if (/^(goodbye|bye|see you|talk later)\b/i.test(question.trim())) {
    return "Goodbye for now. I'll be here when you need me.";
  }
  return "Happy to help. Ask me about ECGs, cardiology, reports, or any clinical question on your mind.";
}

export function isFastPathIntent(intent: MedicalIntent, tools?: CopilotTool[]) {
  if (tools) return isFastPathFromPlan(tools);
  return ["greeting", "small_talk", "unknown", "voice_conversation"].includes(intent);
}
