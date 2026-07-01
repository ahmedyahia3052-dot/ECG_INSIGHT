import { ResponseGenerator } from "../server/src/modules/copilot/engine/response-generator";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory = { attachments: [], summary: "", turns: [] };

function compose(question: string, intent: Parameters<typeof ResponseGenerator.generate>[0]["communicationIntent"], knowledge: Parameters<typeof ResponseGenerator.generate>[0]["knowledge"] = []) {
  return ResponseGenerator.generate({
    attachments: [],
    clinicalContext: emptyClinicalContext(),
    communicationIntent: intent,
    intent: "general_medical_question",
    knowledge,
    memory: emptyMemory,
    plan: { allowBullets: false, maxParagraphs: 4, style: "conversational", suggestFollowUps: false },
    primarySmartIntent: "general_medical_question",
    question,
    requiresClarification: false,
    topic: null,
  });
}

const greeting = compose("Hello", "Greeting");
assert(/Hello|Good (morning|afternoon|evening)|Welcome back/i.test(greeting.content), "Greeting stays conversational");

const medical = compose(
  "What is hypertension?",
  "MedicalQuestion",
  [{
    category: "MED",
    content: "Hypertension is persistently elevated blood pressure requiring lifestyle and pharmacologic management.",
    id: "htn",
    references: [],
    relevanceScore: 0.8,
    sourceName: "Cardiology KB",
    tags: ["hypertension"],
    topic: "Hypertension",
  }],
);
assert(/hypertension/i.test(medical.content), "Medical answer uses knowledge");
assert(!/Definition:|References:|Confidence Score/i.test(medical.content), "No report formatting");

const ecgUpload = ResponseGenerator.generate({
  attachments: [{
    analysisSummary: null,
    confidence: null,
    documentType: "ECG_PDF",
    extractedText: null,
    kind: "ecg",
    medicalAnalysis: null,
    mimeType: "application/pdf",
    originalName: "tracing.pdf",
    recommendations: [],
    sizeBytes: 1000,
    warnings: [],
  }],
  clinicalContext: emptyClinicalContext(),
  communicationIntent: "ECGUpload",
  intent: "upload_analysis",
  knowledge: [],
  memory: emptyMemory,
  plan: { allowBullets: false, maxParagraphs: 4, style: "clinical_brief", suggestFollowUps: false },
  primarySmartIntent: "uploaded_ecg_analysis",
  question: "Here is my ECG",
  requiresClarification: false,
  topic: null,
});
assert(/ecg|tracing|upload|focus|interpret|findings/i.test(ecgUpload.content), "ECG upload invokes vision review");

console.log("Copilot conversation pipeline integration checks passed.");
