import type { AttachmentForAnalysis, ConversationMemory, MedicalIntent } from "./copilot-types";
import { extractEntities, normalizeUserInput } from "./entity-extractor";
import { conversationTopic, hasUploadedEcgAttachment, isEcgUploadPendingInterpretation } from "./intent-helpers";
import type { ExtractedEntities, IntentClassificationResult, IntentMatch, SmartIntent } from "./smart-intent-types";

const EMERGENCY_TERMS = [
  "chest pain", "syncope", "cardiac arrest", "vf", "vt", "ventricular fibrillation", "ventricular tachycardia",
  "complete heart block", "stemi", "hyperkalemia", "brugada", "long qt", "massive pe", "pulmonary embolism",
  "shortness of breath", "dyspnea", "crushing pain", "facial droop", "stroke", "hemoptysis", "shock",
];

function matchIntent(intent: SmartIntent, confidence: number, reason: string): IntentMatch {
  return { confidence, intent, reason };
}

function detectEmergency(text: string, entities: ExtractedEntities): IntentClassificationResult["emergencyPriority"] {
  if (EMERGENCY_TERMS.some((term) => text.includes(term)) || entities.diseases.some((disease) => /stemi|vf|vt|syncope|pe|hyperkalemia|brugada|long qt/.test(disease))) {
    return "HIGH";
  }
  if (/atrial fibrillation|af|ischemia|nstemi/.test(text)) return "MODERATE";
  return "NONE";
}

function detectSecondaryIntents(text: string): SmartIntent[] {
  const intents: SmartIntent[] = [];
  if (/summarize|summary|tl;dr|brief overview/.test(text)) intents.push("summarize");
  if (/translate|translation|in arabic|in french|in spanish/.test(text)) intents.push("translate");
  if (/rewrite|rephrase|make this clearer/.test(text)) intents.push("rewrite");
  if (/compare|comparison|versus|vs\b|previous ecg|prior ecg/.test(text)) intents.push("ecg_comparison");
  return intents;
}

function classifyPrimaryIntent(text: string, attachments: AttachmentForAnalysis[], memory: ConversationMemory, entities: ExtractedEntities): IntentMatch {
  if (/^(voice mode|hands[- ]free|talk to me|speak with me)\b/.test(text)) return matchIntent("voice_conversation", 0.98, "voice-mode-request");
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|salam|welcome back)\b[!.?\s]*$/i.test(text)) return matchIntent("greeting", 0.99, "greeting-phrase");
  if (/^(goodbye|bye|see you|talk later)\b/.test(text)) return matchIntent("goodbye", 0.97, "goodbye-phrase");
  if (/^(thanks|thank you|ok thanks|appreciate it|nice to meet you)\b/.test(text)) return matchIntent("thanks", 0.96, "thanks-phrase");
  if (/^how are you\b|^who are you\b|^what can you do\b|^(i need your help|need your help|can you help|help me)\b/.test(text)) {
    return matchIntent("small_talk", 0.95, "small-talk-phrase");
  }
  if (/show sources|where did you get|what evidence|which guideline|evidence search/.test(text)) return matchIntent("evidence_search", 0.9, "evidence-request");
  if (/drug interaction|interact with|contraindicated with|can i give.*with/.test(text)) return matchIntent("drug_interaction", 0.92, "drug-interaction");
  if (/is .* safe|side effect|contraindication|dose|dosage|tablet|capsule|prescription|start|stop|increase|decrease/.test(text) && entities.drugs.length) {
    return matchIntent("drug_information", 0.9, "drug-information");
  }
  if (/guideline|esc|aha|acc|nice|protocol|recommendation from/.test(text)) return matchIntent("medical_guidelines", 0.88, "guideline-request");
  if (/generate referral|referral letter|refer to cardiology/.test(text)) return matchIntent("generate_referral", 0.9, "referral-request");
  if (/generate letter|write letter|draft letter/.test(text)) return matchIntent("generate_letter", 0.88, "letter-request");
  if (/generate (?:a )?report|write report|create report|draft report|clinical report|ecg report|generate medical report/.test(text)) {
    return matchIntent("report_generation", 0.9, "report-request");
  }
  if (/compare.*ecg|ecg.*compare|previous ecg|prior ecg|compare this ecg/.test(text)) {
    return matchIntent("ecg_comparison", 0.88, "ecg-comparison");
  }
  if (/return to work|fit for work|fitness for work|can i return to work|work restriction|offshore|driver|safety-sensitive/.test(text)) {
    return matchIntent("fitness_for_work", 0.9, "fitness-for-work");
  }
  if (/occupational|duty restriction|occupational fitness/.test(text)) return matchIntent("occupational_fitness", 0.88, "occupational-fitness");
  if (/open\s+[a-z]+(?:\s+patient)?|open .*record|find patient|look up patient|patient lookup|open .*patient|show .*chart/.test(text) || entities.patientNames.length) {
    return matchIntent("patient_lookup", 0.9, "patient-lookup");
  }
  if (/patient history|medical history|past history|previous admissions/.test(text)) return matchIntent("patient_history", 0.88, "patient-history");
  if (/patient profile|patient information|who is (this|the) patient|show patient|patient demographics|my patient|this patient|the patient/.test(text)) {
    return matchIntent("current_patient_question", 0.86, "current-patient");
  }
  if (/summarize|summary|tl;dr|brief overview/.test(text) && /ecg|ekg|today|findings|report/.test(text) && !/interpret|analyze|analyse|review/.test(text)) {
    return matchIntent("summarize", 0.9, "summarize-ecg-or-report");
  }
  if (/current case|this case|active ecg|open ecg|case summary/.test(text)) return matchIntent("ecg_interpretation", 0.84, "current-case");
  if (/interpret (this|the|my)? ?ecg|analyze (this|the|my)? ?ecg|review (this|the|my)? ?ecg|read (this|the|my)? ?ecg/.test(text)) {
    return matchIntent("ecg_interpretation", 0.93, "ecg-interpretation-request");
  }
  if (/^interpret it\b|^analyze it\b|^review it\b/.test(text) && !hasUploadedEcgAttachment(attachments) && !memory.attachments.some((item) => /ecg|ekg/i.test(item.name))) {
    return matchIntent("ecg_interpretation", 0.72, "ambiguous-ecg-request");
  }
  if (attachments.length && isEcgUploadPendingInterpretation(text, attachments)) return matchIntent("uploaded_ecg_analysis", 0.91, "ecg-upload-pending");
  if (attachments.length || /upload|uploaded|attachment|attached file|review (this|the) (file|image|pdf|ecg)/.test(text)) {
    return matchIntent("uploaded_ecg_analysis", 0.85, "upload-analysis");
  }
  if (/explain (the )?diagnosis|why (this|that) diagnosis|interpret diagnosis/.test(text)) return matchIntent("explain_medical_concept", 0.86, "explain-diagnosis");
  if (/^(how is it treated|how do you treat|what about treatment|what are the options|how should i manage|what treatment would you consider|what would you recommend|what treatment would you recommend)\b/.test(text) && memory.turns.length > 0) {
    return matchIntent("create_follow_up_plan", 0.9, "follow-up-with-memory");
  }
  if (/follow.?up|next step|monitor|repeat|when should|refer|appointment|plan/.test(text)) return matchIntent("create_follow_up_plan", 0.84, "follow-up-plan");
  const educational = /^(explain|what is|tell me about|can you explain|how does|why does|what causes)\b/.test(text);
  if (!educational && EMERGENCY_TERMS.some((term) => text.includes(term))) return matchIntent("emergency_warning", 0.94, "emergency-symptoms");
  if (/medication|medicine|drug|beta blocker|statin|anticoag/.test(text)) return matchIntent("drug_information", 0.82, "medication-topic");
  if (/^(explain|what is|tell me about|can you explain|how does|why does|what causes)\b/.test(text)) {
    return matchIntent("explain_medical_concept", 0.86, "explain-request");
  }
  if (/\becg\b|\bekg\b|qrs|qtc|st elevation|st depression|rhythm|brady|tachy|interval|axis/.test(text)) return matchIntent("ecg_interpretation", 0.8, "ecg-language");
  if (/cardiology|coronary|valve|heart failure|arrhythmia/.test(text)) return matchIntent("cardiology_question", 0.78, "cardiology-topic");
  if (/what causes|causes of|why does|what is|explain|how does|can you explain|tell me about|prolonged qt|stemi|nstemi|hypertension|qt interval/.test(text)) {
    return matchIntent("explain_medical_concept", 0.76, "medical-concept");
  }
  if (/summarize|summary|tl;dr/.test(text)) return matchIntent("summarize", 0.74, "summarize-request");
  if (/translate|translation/.test(text)) return matchIntent("translate", 0.74, "translate-request");
  if (/rewrite|rephrase/.test(text)) return matchIntent("rewrite", 0.74, "rewrite-request");
  if (/billing|appointment booking|schedule|administrative|paperwork/.test(text)) return matchIntent("administrative", 0.7, "administrative");
  if (text.length < 2) return matchIntent("unknown", 0.4, "too-short");
  if (text.split(" ").length <= 4 && !/\?/.test(text)) return matchIntent("conversation", 0.55, "short-conversation");
  return matchIntent("general_medical_question", 0.62, "default-medical");
}

export function mapSmartIntentToMedicalIntent(intent: SmartIntent): MedicalIntent {
  switch (intent) {
    case "greeting": return "greeting";
    case "goodbye":
    case "thanks":
    case "small_talk":
    case "conversation":
    case "translate":
    case "rewrite":
    case "administrative": return "small_talk";
    case "voice_conversation": return "voice_conversation";
    case "evidence_search": return "show_sources";
    case "drug_information":
    case "drug_interaction": return "medication_question";
    case "medical_guidelines":
    case "cardiology_question":
    case "explain_medical_concept":
    case "general_medical_question": return "general_medical_question";
    case "uploaded_ecg_analysis":
    case "summarize": return "upload_analysis";
    case "ecg_interpretation":
    case "ecg_comparison": return "ecg_interpretation";
    case "patient_lookup":
    case "current_patient_question":
    case "patient_history": return "patient_information";
    case "report_generation":
    case "generate_letter":
    case "generate_medical_report":
    case "generate_referral": return "generate_report";
    case "occupational_fitness":
    case "fitness_for_work": return "occupational_fitness";
    case "create_follow_up_plan": return "follow_up_plan";
    case "emergency_warning": return "emergency_triage";
    case "unknown": return "unknown";
    default: return "general_medical_question";
  }
}

export function classifySmartIntent(question: string, attachments: AttachmentForAnalysis[], memory: ConversationMemory): IntentClassificationResult {
  const started = performance.now();
  const normalizedQuestion = normalizeUserInput(question);
  const text = normalizedQuestion.toLowerCase();
  const entities = extractEntities(normalizedQuestion, memory, attachments);
  const primary = classifyPrimaryIntent(text, attachments, memory, entities);
  const secondary = detectSecondaryIntents(text).filter((intent) => intent !== primary.intent);
  if (primary.intent === "uploaded_ecg_analysis" && /interpret|analyze|analyse|review/.test(text) && !secondary.includes("ecg_interpretation")) {
    secondary.unshift("ecg_interpretation");
  }
  const intents = [primary, ...secondary.map((intent) => matchIntent(intent, Math.max(primary.confidence - 0.12, 0.55), "secondary-intent"))];
  const emergencyPriority = detectEmergency(text, entities);
  const ambiguousEcg = (primary.intent === "ecg_interpretation" && primary.reason === "ambiguous-ecg-request")
    || (primary.intent === "ecg_interpretation" && !hasUploadedEcgAttachment(attachments) && !memory.attachments.some((item) => /ecg|ekg/i.test(item.name)) && /interpret|analyze|analyse|review (this|the|my)? ?ecg/.test(text));
  const followUpWithoutPatient = primary.intent === "create_follow_up_plan" && !memory.turns.some((turn) => /\bpatient\b|\d{1,3}\s*y/.test(turn.content)) && !conversationTopic(memory);
  return {
    confidence: primary.confidence,
    emergencyPriority,
    entities,
    executionTimeMs: Math.max(0, Math.round(performance.now() - started)),
    intents,
    normalizedQuestion,
    primaryIntent: primary.intent,
    primaryMedicalIntent: mapSmartIntentToMedicalIntent(primary.intent),
    requiresClarification: ambiguousEcg || followUpWithoutPatient,
    clarificationPrompt: ambiguousEcg
      ? "Could you upload the ECG image you'd like me to interpret?"
      : followUpWithoutPatient
        ? "Which patient are we discussing?"
        : undefined,
  };
}
