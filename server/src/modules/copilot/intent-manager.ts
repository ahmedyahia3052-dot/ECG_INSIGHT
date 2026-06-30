import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory, MedicalIntent } from "./copilot-types";

export type { MedicalIntent };

export type ConversationPatientHint = {
  age?: number;
  gender?: string;
  topic?: string;
};

export function emptyClinicalContext() {
  return { criticalAlerts: [], documents: [], previousEcgs: [], reports: [], sources: [] };
}

export function conversationTopic(memory: ConversationMemory) {
  const combined = memory.turns.map((turn) => turn.content).join(" ").toLowerCase();
  if (/atrial fibrillation|\baf\b/.test(combined)) return "atrial fibrillation";
  if (/hypertension|blood pressure/.test(combined)) return "hypertension";
  if (/heart failure|\bhf\b/.test(combined)) return "heart failure";
  if (/stemi|st elevation/.test(combined)) return "stemi";
  if (/long qt|prolonged qt|qtc/.test(combined)) return "prolonged QT";
  if (/prolonged qt|qt prolongation/.test(combined)) return "prolonged QT";
  return "";
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
  const text = question.toLowerCase().trim();
  if (/^(voice mode|hands[- ]free|talk to me|speak with me)\b/.test(text)) return "voice_conversation";
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|salam|السلام)\b[!.?\s]*$/i.test(text)) return "greeting";
  if (/^how are you\b/.test(text)) return "small_talk";
  if (/^(i need your help|need your help|can you help|help me)\b/.test(text)) return "small_talk";
  if (/^(thanks|thank you|ok thanks|appreciate it)\b/.test(text)) return "small_talk";
  if (/^who are you\b|^what can you do\b/.test(text)) return "small_talk";
  if (/show sources|where did you get|what evidence|which guideline/.test(text)) return "show_sources";
  if (attachments.length && isEcgUploadPendingInterpretation(question, attachments)) return "upload_analysis";
  if (attachments.length || /upload|uploaded|attachment|attached file|review (this|the) (file|image|pdf|ecg)/.test(text)) return "upload_analysis";
  if (/patient profile|patient information|who is (this|the) patient|show patient|medical history|patient demographics|look up patient|find patient|my patient|this patient|the patient/.test(text)) return "patient_information";
  if (/generate report|write report|create report|draft report|clinical report|ecg report/.test(text)) return "generate_report";
  if (/drug interaction|interact with|contraindicated with|can i give.*with/.test(text)) return "medication_question";
  if (/guideline|esc|aha|acc|nice|protocol|recommendation from/.test(text)) return "general_medical_question";
  if (/current case|this case|active ecg|open ecg|case summary/.test(text)) return "current_ecg_case";
  if (/explain (the )?diagnosis|why (this|that) diagnosis|interpret diagnosis/.test(text)) return "explain_diagnosis";
  if (/^(how is it treated|how do you treat|what about treatment|what are the options|how should i manage|what treatment would you consider|what would you recommend)\b/.test(text) && memory.turns.length > 0) return "follow_up_plan";
  if (/chest pain|severe pain|shortness of breath|dyspnea|faint|syncope|stroke|weakness|facial droop|crushing|sweating|hemoptysis|suicidal|shock/.test(text)) return "emergency_triage";
  if (/medication|medicine|drug|dose|dosage|tablet|capsule|prescription|side effect|contraindication|start|stop|increase|decrease|beta blocker|statin|anticoag/.test(text)) return "medication_question";
  if (/occupational|fit for work|work restriction|return to work|offshore|driver|safety-sensitive|duty/.test(text)) return "occupational_fitness";
  if (/follow.?up|next step|monitor|repeat|when should|refer|appointment|plan/.test(text)) return "follow_up_plan";
  if (/\becg\b|\bekg\b|interpret (this|the) ecg|review (this|the) ecg|qrs|qtc|st elevation|st depression|rhythm|brady|tachy|interval|axis/.test(text)) return "ecg_interpretation";
  if (/what causes|causes of|why does|what is|explain|how does|can you explain|tell me about|prolonged qt|stemi|nstemi/.test(text)) return "general_medical_question";
  if (text.length < 2) return "unknown";
  return "general_medical_question";
}

export function isEcgUploadPendingInterpretation(question: string, attachments: AttachmentForAnalysis[]) {
  const hasEcg = attachments.some((attachment) => attachment.kind === "ecg" || /ecg|ekg/i.test(`${attachment.documentType ?? ""} ${attachment.originalName}`));
  if (!hasEcg) return false;
  return !/(interpret|review|analyze|analyse|read|explain|findings|diagnosis|what do you see|look at|summarize|summary)/i.test(question);
}

export function shouldRetrieveClinicalContext(intent: MedicalIntent, input: ChatContextInput) {
  if (["greeting", "general_medical_question", "medication_question", "small_talk", "unknown", "voice_conversation"].includes(intent)) {
    return false;
  }
  if (["patient_information", "current_ecg_case", "ecg_interpretation", "generate_report", "explain_diagnosis", "follow_up_plan", "upload_analysis", "emergency_triage", "occupational_fitness"].includes(intent)) {
    return Boolean(input.caseId || input.patientId);
  }
  return false;
}

export function shouldRetrieveKnowledge(input: { attachments: AttachmentForAnalysis[]; intent: MedicalIntent; question: string }) {
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
  return "Happy to help. Ask me about ECGs, cardiology, reports, or any clinical question on your mind.";
}

export function isFastPathIntent(intent: MedicalIntent) {
  return ["greeting", "small_talk", "unknown", "voice_conversation"].includes(intent);
}
