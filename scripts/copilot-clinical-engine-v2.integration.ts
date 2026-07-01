import {
  ConversationManager,
  KnowledgeRouter,
  Planner,
  ResponseGenerator,
  StreamingRenderer,
  VoiceEngine,
  runClinicalCopilotEngine,
} from "../server/src/modules/copilot/engine";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory = { attachments: [], summary: "", turns: [] };
const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };

async function engine(question: string, memory = emptyMemory, conversationId = "test-conv", attachments: Parameters<typeof runClinicalCopilotEngine>[0]["attachments"] = []) {
  ConversationManager.resetForTests();
  return runClinicalCopilotEngine({ attachments, chatInput: {}, conversationId, memory, question }, engineDeps);
}

async function main() {
  for (const greeting of ["Hi", "Hello", "How are you?", "Who are you?", "Thank you"]) {
    const result = await engine(greeting);
    assert(
      result.communicationIntent === "Greeting" || result.communicationIntent === "SmallTalk" || result.communicationIntent === "SystemQuestion",
      `${greeting} conversational intent`,
    );
    assert(!result.toolPlan.runKnowledge, `${greeting} must not search knowledge`);
  }

  const hypertension = await engine("What is hypertension?");
  assert(hypertension.communicationIntent === "MedicalQuestion", "Medical education intent");
  assert(hypertension.knowledgeRoute.sources.includes("cardiology_kb"), "Medical question routes to cardiology KB");

  const stemi = await engine("Explain STEMI");
  assert(stemi.toolPlan.runKnowledge, "STEMI requires knowledge");

  const ecg = await engine("Interpret this ECG");
  assert(ecg.requiresClarification || ecg.communicationIntent === "ECGAnalysis", "ECG without upload clarifies or plans ECG analysis");

  const patient = await engine("Open Ahmed patient record");
  assert(patient.communicationIntent === "PatientLookup", "Patient lookup intent");

  const guideline = await engine("What does ESC recommend for AF?");
  assert(guideline.communicationIntent === "GuidelineSearch" || guideline.knowledgeRoute.sources.includes("esc_guidelines"), "Guideline routing");

  const drug = await engine("Is amiodarone safe with warfarin?");
  assert(drug.communicationIntent === "DrugInformation" || drug.toolPlan.runKnowledge, "Drug question routing");

  const emergency = await engine("Patient has VF and syncope");
  assert(emergency.communicationIntent === "EmergencyAdvice" || emergency.classification.emergencyPriority === "HIGH", "Emergency escalation");

  const topicMemory = {
    attachments: [],
    summary: "",
    turns: [
      { role: "user", content: "Explain hypertension" },
      { role: "assistant", content: "Hypertension is persistently elevated blood pressure." },
    ],
  };
  ConversationManager.resetForTests();
  const followUp = await runClinicalCopilotEngine(
    {
      attachments: [],
      chatInput: {},
      conversationId: "follow-up-conv",
      memory: topicMemory,
      question: "How is it diagnosed?",
    },
    engineDeps,
  );
  assert(/hypertension/i.test(followUp.context.resolvedQuestion), `Follow-up should resolve pronoun: ${followUp.context.resolvedQuestion}`);
  assert(followUp.communicationIntent === "FollowUpQuestion" || followUp.communicationIntent === "MedicalQuestion", "Follow-up intent");

  const generated = ResponseGenerator.generate({
    attachments: [],
    clinicalContext: emptyClinicalContext(),
    communicationIntent: "MedicalQuestion",
    intent: "general_medical_question",
    knowledge: [{
      category: "MED",
      content: "Hypertension is a chronic condition where blood pressure remains persistently elevated.",
      id: "htn",
      references: [],
      relevanceScore: 0.8,
      sourceName: "Cardiology KB",
      tags: ["hypertension"],
      topic: "Hypertension",
    }],
    memory: emptyMemory,
    plan: Planner.buildResponsePlan("MedicalQuestion", false),
    primarySmartIntent: "general_medical_question",
    question: "What is hypertension?",
    requiresClarification: false,
    topic: { label: "hypertension", slug: "hypertension" },
  });
  assert(!/^Definition:/m.test(generated.content), "Response generator avoids report formatting");
  assert(/Hypertension is a chronic condition/.test(generated.content), "Preserves clinical prose");

  const voice = VoiceEngine.capabilities;
  assert(voice.streamingSttReady && voice.interruptSupported, "Voice architecture readiness");

  const chunks = StreamingRenderer.chunkContent("Hello Dr Ahmed.");
  assert(chunks.join("") === "Hello Dr Ahmed.", "Streaming chunk merge");

  const route = KnowledgeRouter.route(
    "GuidelineSearch",
    {
      activeTopic: null,
      entityMemory: { ages: [], diseases: [], drugs: [], patientNames: [] },
      hasActiveCase: false,
      hasActivePatient: false,
      hasUploadedEcg: false,
      hasUploadedFiles: false,
      hasUploadedImages: false,
      resolvedQuestion: "ESC AF",
      topicStack: [],
    },
    {
      runClinicalContext: false,
      runDrugDatabase: false,
      runEcgEngine: false,
      runKnowledge: true,
      runOcr: false,
      runPatientDatabase: false,
      runReportGenerator: false,
      tools: ["guidelines", "knowledge_search", "conversation"],
    },
    "ESC AF",
  );
  assert(route.sources.includes("esc_guidelines"), "Pre-retrieval guideline routing");

  const unknown = await engine("???");
  assert(unknown.intentConfidence >= 0, "Unknown still returns confidence");

  console.log("Clinical AI Copilot Engine V2 integration checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
