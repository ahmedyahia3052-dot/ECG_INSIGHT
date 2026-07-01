import {
  CLINICAL_AI_ENGINE_VERSION,
  ConversationManager,
  ECG_LEARNING_PATH,
  ResponseGenerator,
  Planner,
  StreamingRenderer,
  runClinicalCopilotEngine,
} from "../server/src/modules/copilot/engine";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";
import type { ConversationMemory } from "../server/src/modules/copilot/copilot-types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const FORBIDDEN = [
  /^Definition:/m,
  /^Causes:/m,
  /^Recommendation:/m,
  /^Short Answer$/m,
  /Confidence Score/i,
  /\bCitations:/i,
  /Knowledge Base/i,
  /Retrieved Medical Knowledge/i,
  /Risk tier:/i,
  /Intent:/i,
  /Knowledge route:/i,
];

function assertNatural(content: string, label: string) {
  assert(content.trim().length > 20, `${label}: response too short`);
  for (const pattern of FORBIDDEN) {
    assert(!pattern.test(content), `${label}: forbidden artifact ${pattern}`);
  }
}

const emptyMemory: ConversationMemory = { attachments: [], summary: "", turns: [] };
const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };

async function ask(
  question: string,
  memory: ConversationMemory = emptyMemory,
  conversationId = `v2-${Math.random().toString(36).slice(2, 8)}`,
  attachments: Parameters<typeof runClinicalCopilotEngine>[0]["attachments"] = [],
) {
  const result = await runClinicalCopilotEngine(
    { attachments, chatInput: {}, conversationId, memory, question },
    engineDeps,
  );
  assertNatural(result.response.content, question);
  return result;
}

async function testPipelineVersion() {
  assert(CLINICAL_AI_ENGINE_VERSION === "v2", `engine version must be v2, got ${CLINICAL_AI_ENGINE_VERSION}`);
}

async function testGreetings() {
  for (const greeting of ["Hi", "Hello", "How are you?", "Thank you"]) {
    ConversationManager.resetForTests();
    const result = await ask(greeting);
    assert(
      ["Greeting", "SmallTalk"].includes(result.communicationIntent),
      `${greeting} should be conversational, got ${result.communicationIntent}`,
    );
    assert(!result.toolPlan.runReportGenerator, "V2 must not run report generator");
  }
}

async function testMedicalReasoning() {
  ConversationManager.resetForTests();
  const hypertension = await ask("What is hypertension?");
  assert(hypertension.toolPlan.runKnowledge, "Clinical questions retrieve knowledge");
  assert(hypertension.response.content.toLowerCase().includes("hypertension") || hypertension.response.content.length > 40, "Hypertension answer");

  ConversationManager.resetForTests();
  const stemi = await ask("Explain STEMI");
  assert(stemi.toolPlan.runKnowledge, "STEMI retrieves knowledge");
}

async function testFollowUpContext() {
  ConversationManager.resetForTests();
  const convId = "v2-follow-up";
  await ask("Explain hypertension", emptyMemory, convId);
  const memory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [
      { role: "user", content: "Explain hypertension" },
      { role: "assistant", content: "Hypertension is persistently elevated blood pressure." },
    ],
  };
  const followUp = await ask("How is it diagnosed?", memory, convId);
  assert(/hypertension/i.test(followUp.context.resolvedQuestion), `Follow-up resolves topic: ${followUp.context.resolvedQuestion}`);
  assert(followUp.communicationIntent === "FollowUpQuestion" || followUp.toolPlan.runKnowledge, "Follow-up continues clinically");
}

async function testEducationPersistence() {
  ConversationManager.resetForTests();
  const convId = "v2-education";
  const first = await ask("I am a medical student. Can you help me learn ECG?", emptyMemory, convId);
  assert(first.communicationIntent === "Education", "Student ECG request is educational");
  assert(!/please upload an ecg/i.test(first.response.content), "Education should not demand upload");

  const memory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [
      { role: "user", content: "I am a medical student. Can you help me learn ECG?" },
      { role: "assistant", content: first.response.content },
    ],
  };
  const second = await ask("Where should I start?", memory, convId);
  assert(second.communicationIntent === "Education", "Educational follow-up stays educational");
  assert(/ECG paper|calibration/i.test(second.response.content), "Starts with ECG basics");
  assert(ECG_LEARNING_PATH.length === 6, "ECG learning path has six steps");
}

async function testVisionAutoInvoke() {
  ConversationManager.resetForTests();
  const result = await ask(
    "What do you see here?",
    emptyMemory,
    "v2-vision",
    [{
      analysisSummary: "ECG with ST elevation language detected.",
      confidence: 0.8,
      documentType: "ECG_IMAGE",
      extractedText: "ST elevation in leads II III aVF",
      kind: "ecg",
      medicalAnalysis: { findings: ["Possible inferior ST elevation"] },
      originalName: "tracing.png",
      recommendations: [],
      warnings: [],
    }],
  );
  assert(result.toolPlan.runOcr || result.toolPlan.tools.includes("image_analysis"), "Uploads invoke vision pipeline");
  assert(/ecg|tracing|ST|elevation|uploaded/i.test(result.response.content), "Vision response references upload");
}

async function testEmergencySafety() {
  ConversationManager.resetForTests();
  const result = await ask("Patient collapsed and is unresponsive");
  assert(
    result.communicationIntent === "EmergencyAdvice" || result.classification.emergencyPriority === "HIGH",
    "Emergency presentation escalates",
  );
}

async function testClarification() {
  ConversationManager.resetForTests();
  const result = await ask("Interpret this ECG for ischaemia");
  assert(result.requiresClarification || /upload|share|open/i.test(result.response.content), "ECG without upload clarifies");
}

async function testResponseGeneratorShim() {
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
  assert(!/^Definition:/m.test(generated.content), "No report formatting");
}

async function testStreaming() {
  const chunks = StreamingRenderer.chunkContent("Hello colleague.");
  assert(chunks.join("") === "Hello colleague.", "Streaming preserves content");
}

async function main() {
  await testPipelineVersion();
  await testGreetings();
  await testMedicalReasoning();
  await testFollowUpContext();
  await testEducationPersistence();
  await testVisionAutoInvoke();
  await testEmergencySafety();
  await testClarification();
  await testResponseGeneratorShim();
  await testStreaming();
  console.log("copilot-clinical-ai-core-v2.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
