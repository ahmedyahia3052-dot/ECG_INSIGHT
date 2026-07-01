import { composeConversationalResponse } from "../server/src/modules/copilot/conversational-engine";
import {
  KnowledgeRouter,
  NaturalResponseFormatter,
  ResponsePlanner,
  SessionManager,
  StreamingResponder,
  TopicTracker,
  runCommunicationLayerV1,
} from "../server/src/modules/copilot/communication";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory = { attachments: [], summary: "", turns: [] };

function layer(question: string, memory = emptyMemory, conversationId = "test-conv", attachments: Parameters<typeof runCommunicationLayerV1>[0]["attachments"] = []) {
  SessionManager.resetForTests();
  return runCommunicationLayerV1({ attachments, chatInput: {}, conversationId, memory, question });
}

for (const greeting of ["Hi", "Hello", "How are you?", "Who are you?", "Thank you"]) {
  const comm = layer(greeting);
  assert(comm.communicationIntent === "Greeting" || comm.communicationIntent === "SmallTalk" || comm.communicationIntent === "SystemQuestion", `${greeting} conversational intent`);
  assert(!comm.brain.decision.runKnowledgeSearch, `${greeting} must not search knowledge`);
}

const hypertension = layer("What is hypertension?");
assert(hypertension.communicationIntent === "MedicalQuestion", "Medical education intent");
assert(hypertension.knowledgeRoute.sources.includes("cardiology_kb"), "Medical question routes to cardiology KB");

const stemi = layer("Explain STEMI");
assert(stemi.brain.decision.runKnowledgeSearch, "STEMI requires knowledge");

const ecg = layer("Interpret this ECG");
assert(ecg.requiresClarification || ecg.communicationIntent === "ECGAnalysis", "ECG without upload clarifies or plans ECG analysis");

const patient = layer("Open Ahmed patient record");
assert(patient.communicationIntent === "PatientLookup", "Patient lookup intent");

const guideline = layer("What does ESC recommend for AF?");
assert(guideline.communicationIntent === "GuidelineSearch" || guideline.knowledgeRoute.sources.includes("esc_guidelines"), "Guideline routing");

const drug = layer("Is amiodarone safe with warfarin?");
assert(drug.communicationIntent === "DrugInformation" || drug.brain.decision.runKnowledgeSearch, "Drug question routing");

const emergency = layer("Patient has VF and syncope");
assert(emergency.communicationIntent === "EmergencyAdvice" || emergency.brain.decision.emergencyEscalation, "Emergency escalation");

const topicMemory = {
  attachments: [],
  summary: "",
  turns: [
    { role: "user", content: "Explain hypertension" },
    { role: "assistant", content: "Hypertension is persistently elevated blood pressure." },
  ],
};
SessionManager.resetForTests();
const followUp = runCommunicationLayerV1({
  attachments: [],
  chatInput: {},
  conversationId: "follow-up-conv",
  memory: topicMemory,
  question: "How is it diagnosed?",
});
assert(/hypertension/i.test(followUp.resolvedQuestion), `Follow-up should resolve pronoun: ${followUp.resolvedQuestion}`);
assert(followUp.communicationIntent === "FollowUpQuestion" || followUp.communicationIntent === "MedicalQuestion", "Follow-up intent");

const formatted = NaturalResponseFormatter.format("Definition:\nHypertension is elevated blood pressure.\n\nReferences: ESC", ResponsePlanner.plan("MedicalQuestion", false), "hypertension");
assert(!/Definition:|References:/i.test(formatted), "Natural formatter strips report labels");
assert(/Hypertension is elevated blood pressure/.test(formatted), "Preserves clinical prose");

const voice = StreamingResponder.voiceReady;
assert(voice.streamingSttReady && voice.interruptSupported, "Voice architecture readiness");

const chunks = StreamingResponder.chunkContent("Hello Dr Ahmed.");
assert(chunks.join("") === "Hello Dr Ahmed.", "Streaming chunk merge");

const multi = layer(
  "Interpret this ECG and summarize the findings.",
  emptyMemory,
  "multi-conv",
  [{ analysisSummary: null, confidence: null, documentType: "ECG_PDF", extractedText: null, kind: "ecg", medicalAnalysis: null, mimeType: "application/pdf", originalName: "tracing.pdf", recommendations: [], sizeBytes: 1000, warnings: [] }],
);
assert(multi.brain.clinicalPlan.steps.length >= 2, "Multi-intent clinical plan");

const unknown = layer("???");
assert(unknown.intentConfidence >= 0, "Unknown still returns confidence");

const filtered = KnowledgeRouter.filterHits(
  [{ category: "ECG", content: "ESC guideline for AF anticoagulation", id: "1", references: [], relevanceScore: 0.8, sourceName: "ESC", tags: ["af"], topic: "AF" }],
  KnowledgeRouter.route("GuidelineSearch", "ESC AF"),
);
assert(filtered.length > 0, "Knowledge router filters hits");

const composed = composeConversationalResponse({
  attachments: [],
  context: { criticalAlerts: [], documents: [], previousEcgs: [], reports: [], sources: [] },
  intent: "general_medical_question",
  knowledge: [{ category: "MED", content: "Hypertension is a chronic condition where blood pressure remains persistently elevated.", id: "htn", references: [], relevanceScore: 0.8, sourceName: "Cardiology KB", tags: ["hypertension"], topic: "Hypertension" }],
  memory: emptyMemory,
  question: "What is hypertension?",
});
const natural = NaturalResponseFormatter.format(composed.content, ResponsePlanner.plan("MedicalQuestion", false), "hypertension");
assert(!/^Definition:/m.test(natural), "Composed medical answer avoids report formatting");

console.log("AI Communication Layer V1 integration checks passed.");
