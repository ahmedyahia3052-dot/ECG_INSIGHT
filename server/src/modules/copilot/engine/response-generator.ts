import type {
  AttachmentForAnalysis,
  AttachmentInsight,
  ClinicalContext,
  ConversationMemory,
  KnowledgeHit,
} from "../copilot-types";
import {
  analyticalIntent,
  casualResponse,
  conversationPatientHint,
  greetingResponse,
  helpRequestResponse,
  isEcgUploadPendingInterpretation,
} from "../intent-manager";
import { mapSmartIntentToMedicalIntent } from "../intent-classifier";
import type { SmartIntent } from "../smart-intent-types";
import { attachmentInsights } from "./attachment-analysis";
import type { CommunicationIntent, GenerateInput, ResponsePlan } from "./types";

const REPORT_PATTERNS = [
  /^#{1,3}\s.+$/gm,
  /^Short Answer\s*$/gim,
  /^Definition:\s*/gim,
  /^ECG Criteria:\s*/gim,
  /^ECG criteria:\s*/gim,
  /ECG criteria:\s*/gi,
  /^Criteria:\s*/gim,
  /^References:\s*/gim,
  /^References:[\s\S]*$/im,
  /^Differential diagnosis:\s*/gim,
  /^Knowledge Base\s*/gim,
  /^Retrieved Medical Knowledge\s*/gim,
  /\nConfidence Score:\s*\d+%/gi,
  /\nCitations:\s*.+$/gim,
  /Risk tier:\s*(HIGH|MODERATE|LOW)/gi,
  /Uploaded Document Review/gi,
  /AI assistance only\. Clinical decisions remain the responsibility of the physician\./gi,
];

function polish(content: string, plan: ResponsePlan) {
  let formatted = content;
  for (const pattern of REPORT_PATTERNS) formatted = formatted.replace(pattern, "");
  formatted = formatted.replace(/\n{3,}/g, "\n\n").trim();
  const parts = formatted.split(/\n\n+/).filter(Boolean);
  if (parts.length > plan.maxParagraphs) formatted = parts.slice(0, plan.maxParagraphs).join("\n\n").trim();
  return formatted.trim();
}

function joinSentences(parts: string[]) {
  return parts.filter(Boolean).map((part) => part.trim().replace(/\.$/, "")).join(". ").replace(/\.\./g, ".").trim() + (parts.length ? "." : "");
}

function proseList(items: string[], conjunction = "and") {
  const cleaned = items.filter(Boolean);
  if (!cleaned.length) return "";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} ${conjunction} ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, ${conjunction} ${cleaned[cleaned.length - 1]}`;
}

function knowledgeParagraph(hit: KnowledgeHit | undefined, fallback: string) {
  if (!hit) return fallback;
  return hit.content.replace(/\s+/g, " ").trim();
}

function riskStratification(context: ClinicalContext, question: string) {
  const text = `${question} ${context.currentCase?.diagnosis ?? ""} ${context.currentCase?.doctorDiagnosis ?? ""} ${context.currentCase?.rhythm ?? ""} ${context.criticalAlerts.join(" ")}`.toLowerCase();
  if (context.criticalAlerts.length || /stemi|ventricular tachycardia|vf|complete heart block|high-grade|extreme bradycardia/.test(text)) {
    return { level: "HIGH" as const, reason: "Critical alert or potentially life-threatening ECG pattern is present or suspected." };
  }
  if (/nstemi|ischemia|atrial fibrillation|af|long qt|qtc|bundle branch|av block/.test(text)) {
    return { level: "MODERATE" as const, reason: "Clinically significant abnormality requires physician review and correlation." };
  }
  if (context.currentCase?.severity === "CRITICAL" || context.currentCase?.severity === "ABNORMAL") {
    return { level: context.currentCase.severity === "CRITICAL" ? ("HIGH" as const) : ("MODERATE" as const), reason: `Case severity is classified as ${context.currentCase.severity}.` };
  }
  return { level: "LOW" as const, reason: "No high-risk feature was retrieved from the current context." };
}

function differentialDiagnosis(question: string, context: ClinicalContext, knowledge: KnowledgeHit[]) {
  const text = `${question} ${context.currentCase?.diagnosis ?? ""} ${context.currentCase?.rhythm ?? ""} ${knowledge.map((entry) => entry.topic).join(" ")}`.toLowerCase();
  if (/stemi|st elevation|inferior|anterior|lateral/.test(text)) return ["acute STEMI", "early repolarization", "pericarditis", "LVH or bundle-branch repolarization change"];
  if (/af|atrial fibrillation|irregular/.test(text)) return ["atrial fibrillation", "atrial flutter with variable block", "frequent PACs", "artefact mimicking irregular rhythm"];
  if (/qt|qtc|torsades/.test(text)) return ["acquired long QT", "congenital long QT", "electrolyte disturbance", "medication-related QT prolongation"];
  if (/brady|block|av/.test(text)) return ["sinus bradycardia", "AV block", "medication effect", "ischaemia or electrolyte disturbance"];
  if (/tachy|pvc|ventricular/.test(text)) return ["sinus tachycardia", "PVCs", "supraventricular tachycardia", "ventricular tachycardia if wide-complex and sustained"];
  return knowledge.slice(0, 4).map((entry) => entry.topic.toLowerCase()).concat(["clinical correlation required"]).slice(0, 4);
}

function recommendationsFor(risk: { level: string }, context: ClinicalContext, knowledge: KnowledgeHit[]) {
  const recommendations = new Set<string>();
  if (risk.level === "HIGH") {
    recommendations.add("urgent cardiology or emergency evaluation according to local protocol");
    recommendations.add("repeat the ECG and compare with prior tracings immediately");
  }
  if (risk.level === "MODERATE") recommendations.add("physician review with clinical correlation, vitals, symptoms, and medication or electrolyte assessment");
  if (context.currentCase) recommendations.add("verify rhythm, rate, PR, QRS, QT/QTc, axis, and ST-T changes manually");
  if (context.previousEcgs.length) recommendations.add("document interval changes compared with previous ECGs");
  if (knowledge.some((entry) => entry.tags.includes("qt"))) recommendations.add("check potassium, magnesium, calcium, renal function, and QT-prolonging medications");
  recommendations.add("record your final physician impression in the report workflow");
  return Array.from(recommendations);
}

function followUpFor(risk: { level: string }, context: ClinicalContext) {
  if (risk.level === "HIGH") return ["same-day physician or cardiology review", "restrict safety-sensitive duties until acute risk is excluded or treated"];
  if (risk.level === "MODERATE") return ["cardiology or occupational medicine follow-up", "repeat ECG or targeted testing based on symptoms"];
  return context.currentCase ? ["routine follow-up if symptomatic or if occupational policy requires surveillance"] : ["open the relevant patient or ECG case if you need patient-specific follow-up"];
}

function topicTreatment(topic: string, knowledge: KnowledgeHit[]) {
  const hit = knowledge.find((entry) => entry.topic.toLowerCase().includes(topic.split(" ")[0])) ?? knowledge[0];
  if (topic === "atrial fibrillation") {
    return joinSentences([
      hit ? knowledgeParagraph(hit, "") : "In atrial fibrillation, treatment depends on symptoms, haemodynamic stability, and stroke risk",
      "Rate control is often first line in stable patients, while rhythm control may suit symptomatic or younger patients",
      "Anticoagulation should follow stroke and bleeding-risk assessment, and reversible triggers should be addressed",
    ]);
  }
  if (topic === "hypertension") {
    return joinSentences([
      "Hypertension management combines lifestyle measures with pharmacotherapy guided by comorbidities and target organ risk",
      hit ? knowledgeParagraph(hit, "") : "Choice of agent depends on age, renal function, heart failure, diabetes, and local formulary",
    ]);
  }
  if (hit) return knowledgeParagraph(hit, "Treatment should be individualized to the patient context and local guidelines.");
  return "Tell me a little more about the clinical context and I can narrow the management options.";
}

function composeEcgUploadAcknowledgment(attachments: AttachmentForAnalysis[]) {
  const ecgNames = attachments
    .filter((attachment) => attachment.kind === "ecg" || /ecg|ekg/i.test(`${attachment.documentType ?? ""} ${attachment.originalName}`))
    .map((attachment) => attachment.originalName.replace(/\.[^.]+$/, ""));
  const label = ecgNames.length === 1 ? ecgNames[0] : "your ECG files";
  return [
    `I've received ${label === "your ECG files" ? "the ECG" : `the ECG (${label})`}.`,
    "I'm analyzing it now.",
    "This may take a few seconds.",
    "When you're ready, ask me to interpret it or tell me what you'd like me to focus on.",
  ].join("\n\n");
}

function composePatient(context: ClinicalContext) {
  const patient = context.patient;
  if (!patient) return "Tell me which patient you'd like to review, or open a patient chart and ask again.";
  const history = patient.history !== "No significant history recorded." ? patient.history : "no major past history recorded";
  const medications = patient.medications !== "No active medications recorded." ? patient.medications : "no active medications recorded";
  return joinSentences([
    `${patient.fullName} is a ${patient.age}-year-old ${patient.gender.toLowerCase()}`,
    `Past history includes ${history}`,
    `Current medications: ${medications}`,
    patient.allergies !== "No known allergies." ? `Allergies: ${patient.allergies}` : "",
  ]);
}

function composeCurrentCase(context: ClinicalContext) {
  const ecgCase = context.currentCase;
  if (!ecgCase) return "Open an ECG case or upload a tracing, then ask me to review it with you.";
  return joinSentences([
    `The active tracing shows ${ecgCase.rhythm ?? "an unclassified rhythm"} at about ${ecgCase.heartRate ?? "an unknown"} bpm`,
    ecgCase.intervals,
    ecgCase.diagnosis ? `The working diagnosis on file is ${ecgCase.diagnosis}` : "No final diagnosis has been recorded yet",
    "Tell me if you want a deeper read on rhythm, ischaemia, QT, or next steps",
  ]);
}

function composeEcgInterpretation(context: ClinicalContext, question: string, knowledge: KnowledgeHit[], attachments: AttachmentForAnalysis[]) {
  const hasEcgAttachment = attachments.some((attachment) => attachment.kind === "ecg" || /ecg|ekg/i.test(`${attachment.documentType ?? ""} ${attachment.originalName}`));
  if (!context.currentCase && !hasEcgAttachment) {
    if (/interpret|analyze|analyse|review|read/.test(question.toLowerCase())) {
      return "Please upload an ECG image first, or open the relevant case, and tell me what you'd like me to focus on.";
    }
    return "Upload an ECG or open the case here, and tell me what you're most concerned about — rhythm, ischaemia, conduction, or QT prolongation.";
  }
  if (!context.currentCase && hasEcgAttachment) {
    return "I can see an uploaded ECG. Tell me what you'd like me to focus on — rhythm, ischaemia, conduction, QT prolongation, or a full interpretation.";
  }
  const ecgCase = context.currentCase;
  if (!ecgCase) {
    return "Upload an ECG or open the case here, and tell me what you're most concerned about — rhythm, ischaemia, conduction, or QT prolongation.";
  }
  const risk = riskStratification(context, question);
  const differentials = differentialDiagnosis(question, context, knowledge);
  const recs = recommendationsFor(risk, context, knowledge).slice(0, 3);
  const opening = joinSentences([
    `Looking at this tracing, the rhythm appears to be ${ecgCase.rhythm ?? "indeterminate"} with a rate around ${ecgCase.heartRate ?? "an unspecified"} bpm`,
    ecgCase.intervals,
    ecgCase.diagnosis ? `The case currently carries a working diagnosis of ${ecgCase.diagnosis}` : "",
  ]);
  const differential = differentials.length
    ? `I'd also keep ${proseList(differentials.slice(0, 3))} in mind depending on symptoms and prior tracings.`
    : "";
  const plan = recs.length ? `Practically, I'd ${recs[0]}, ${recs.slice(1).join(", ")}.` : "";
  const urgency = risk.level === "HIGH" ? "Given the pattern, I'd prioritize urgent clinical review." : "";
  return [opening, differential, plan, urgency].filter(Boolean).join("\n\n");
}

function composeUploadReview(insights: AttachmentInsight[], remembered: AttachmentInsight[]) {
  const all = insights.concat(remembered);
  if (!all.length) return "Attach an ECG, lab, image, or report and tell me what you'd like me to focus on.";
  const summaries = all.map((item) => {
    const focus = item.findings.length ? item.findings.join("; ").replace(/\.$/, "") : item.interpretation.replace(/\.$/, "");
    return `${item.name.replace(/\.[^.]+$/, "")}: ${focus}`;
  });
  return joinSentences([
    `I've reviewed the material you shared`,
    summaries.join(". "),
    "I'd correlate each item with the full chart and your own read of the source documents before acting on extracted text",
  ]);
}

function composeMedicalAnswer(question: string, knowledge: KnowledgeHit[], topic: string) {
  const primary = knowledge[0];
  const simple = /^(what is|explain|can you explain|how does|why does|what causes|tell me about)\b/i.test(question.trim());
  if (topic && /treat|management|options|plan|follow|drugs|medication/.test(question.toLowerCase())) {
    return topicTreatment(topic, knowledge);
  }
  if (topic && /diagnos|detect|screen|workup/.test(question.toLowerCase())) {
    const hit = knowledge.find((entry) => /diagnos|screen|measure|reading|workup|criteria|office|ambulatory/i.test(`${entry.topic} ${entry.content}`.toLowerCase())
      && `${entry.topic} ${entry.tags.join(" ")}`.toLowerCase().includes(topic.split(" ")[0]));
    if (hit) return knowledgeParagraph(hit, "");
    return `Diagnosis of ${topic} usually combines repeated blood pressure readings, clinical history, examination, and any indicated laboratory or imaging tests.`;
  }
  if (primary) {
    const answer = knowledgeParagraph(primary, "");
    if (simple && answer.length < 420) return answer;
    if (simple) return `${answer.split(".").slice(0, 2).join(". ").trim()}. Ask if you'd like mechanisms, treatment, or red flags.`;
    return answer;
  }
  if (topic) return topicTreatment(topic, knowledge);
  return "I can help with that. Share a little more context — symptoms, ECG findings, or the decision you're weighing — and I'll be more specific.";
}

function composeReport(context: ClinicalContext) {
  if (!context.currentCase && !context.patient) {
    return "Open a patient or ECG case first, or upload the relevant material, and I'll draft something you can edit before signing.";
  }
  const parts = ["Here's a draft you can adapt before signing:"];
  if (context.patient) parts.push(`${context.patient.fullName}, ${context.patient.age} years old.`);
  if (context.currentCase) {
    parts.push(`ECG: ${context.currentCase.rhythm ?? "Rhythm pending"} at ${context.currentCase.heartRate ?? "unknown"} bpm. ${context.currentCase.intervals}`);
    parts.push(context.currentCase.diagnosis ? `Impression: ${context.currentCase.diagnosis}.` : "Impression: pending physician review.");
  }
  parts.push("Plan: correlate clinically, document the final physician impression, and arrange follow-up as indicated.");
  return parts.join("\n\n");
}

function composeEmergency(question: string, context: ClinicalContext) {
  const risk = riskStratification(context, question);
  return joinSentences([
    "This could be urgent — if symptoms are active or worsening, arrange immediate clinical or emergency assessment now",
    risk.level === "HIGH" ? "The pattern or presentation raises concern for a high-risk situation" : "I need age, onset, associated features, vitals, ECG findings, and current medications to triage safely",
    "If you can, share those details and I'll help you think through immediate priorities",
  ]);
}

function composeOccupational(context: ClinicalContext, question: string, knowledge: KnowledgeHit[]) {
  const risk = riskStratification(context, question);
  const safetySensitive = /offshore|driver|height|confined|safety|fitness|occupational/.test(`${question} ${context.patient?.occupation ?? ""}`.toLowerCase());
  let opinion = "On the information available, I wouldn't restrict duties solely on this exchange, but the final fitness decision remains with the occupational physician.";
  if (risk.level === "HIGH") opinion = safetySensitive ? "I'd consider the worker temporarily unfit for safety-sensitive duties until urgent physician or cardiology review clears them." : "I'd avoid safety-sensitive duties until physician assessment is completed.";
  else if (risk.level === "MODERATE") opinion = safetySensitive ? "Fit status may need restriction or deferral pending physician review and any indicated investigations." : "Clinical review is prudent before unrestricted duties.";
  const rec = recommendationsFor(risk, context, knowledge).slice(0, 2).join("; ");
  return joinSentences([opinion, rec]);
}

function composeFollowUp(topic: string, context: ClinicalContext, question: string, knowledge: KnowledgeHit[], memory: ConversationMemory) {
  const risk = riskStratification(context, question);
  const steps = followUpFor(risk, context);
  const hint = conversationPatientHint(memory);
  const patientLead = hint.age ? `For your ${hint.age}-year-old patient` : hint.topic ? `For ${topic}` : "";
  const lead = patientLead
    ? `${patientLead}, sensible next steps would include ${proseList(steps)}.`
    : topic
      ? `For ${topic}, sensible next steps would include ${proseList(steps)}.`
      : `Sensible next steps would include ${proseList(steps)}.`;
  const extra = knowledge[0] && (topic || hint.topic) ? knowledgeParagraph(knowledge[0], "") : "";
  return [lead, extra].filter(Boolean).join("\n\n");
}

function medicalIntentForCommunication(_intent: CommunicationIntent, primarySmartIntent: SmartIntent) {
  return mapSmartIntentToMedicalIntent(primarySmartIntent);
}

export const ResponseGenerator = {
  generate(input: GenerateInput & { primarySmartIntent: SmartIntent }): { content: string } {
    if (input.requiresClarification && input.clarificationPrompt) {
      return { content: polish(input.clarificationPrompt, input.plan) };
    }

    const topic = input.topic?.slug ?? "";
    const insights = attachmentInsights(input.attachments);
    const rememberedFiles = input.memory.attachments.filter((attachment) => !insights.some((current) => current.name === attachment.name));
    const medicalIntent = medicalIntentForCommunication(input.communicationIntent, input.primarySmartIntent);
    const risk = riskStratification(input.clinicalContext, input.question);
    let content: string;

    switch (input.communicationIntent) {
      case "Greeting":
        content = greetingResponse(input.clinicianName, input.question.length + (input.memory.turns.length * 17));
        break;
      case "SmallTalk":
        content = /^(i need your help|need your help|can you help|help me)\b/i.test(input.question.trim())
          ? helpRequestResponse()
          : casualResponse(input.question);
        break;
      case "SystemQuestion":
        content = "Voice mode is ready — speak naturally and I'll reply conversationally. You can interrupt playback whenever you need to.";
        break;
      case "PatientLookup":
        content = composePatient(input.clinicalContext);
        break;
      case "ECGAnalysis":
      case "Comparison":
        content = composeEcgInterpretation(input.clinicalContext, input.question, input.knowledge, input.attachments);
        break;
      case "ECGUpload":
      case "FileAnalysis":
      case "DocumentReview":
      case "ImageInterpretation":
        if (isEcgUploadPendingInterpretation(input.question, input.attachments)) {
          content = composeEcgUploadAcknowledgment(input.attachments);
        } else {
          content = composeUploadReview(insights, rememberedFiles);
        }
        break;
      case "DrugInformation":
      case "MedicalQuestion":
      case "GuidelineSearch":
      case "Unknown":
        content = composeMedicalAnswer(input.question, input.knowledge, topic);
        break;
      case "ReportGeneration":
        content = composeReport(input.clinicalContext);
        break;
      case "FollowUpQuestion":
        content = /diagnos|treat|drug|medication|causes|management|screen|workup/i.test(input.question) && topic
          ? composeMedicalAnswer(input.question, input.knowledge, topic)
          : composeFollowUp(topic, input.clinicalContext, input.question, input.knowledge, input.memory);
        break;
      case "EmergencyAdvice":
        content = composeEmergency(input.question, input.clinicalContext);
        break;
      case "OccupationalFitness":
      case "RiskAssessment":
        content = composeOccupational(input.clinicalContext, input.question, input.knowledge);
        break;
      default:
        content = composeMedicalAnswer(input.question, input.knowledge, topic);
    }

    if (input.communicationIntent !== "EmergencyAdvice" && risk.level === "HIGH" && analyticalIntent(medicalIntent)) {
      content = `${content}\n\nOne caution: there may be high-risk features here — please prioritize urgent physician review if the patient is symptomatic.`;
    }

    return { content: polish(content, input.plan) };
  },
};

export function buildInternalClinicalBrief(question: string, context: ClinicalContext, knowledge: KnowledgeHit[], memory: ConversationMemory) {
  return [
    `Question: ${question}`,
    context.patient ? `Patient: ${context.patient.fullName}; ${context.patient.age}y; ${context.patient.history}` : "",
    context.currentCase ? `ECG: ${context.currentCase.rhythm}; ${context.currentCase.intervals}; ${context.currentCase.diagnosis ?? "pending"}` : "",
    knowledge.length ? `Knowledge: ${knowledge.map((entry) => entry.topic).join(", ")}` : "",
    memory.turns.length ? `Turns: ${memory.turns.length}` : "",
  ].filter(Boolean).join("\n");
}
