import {
  ClinicalKnowledgeRouter,
  ConversationManager,
  ECG_LEARNING_PATH,
  runClinicalCopilotEngine,
} from "../server/src/modules/copilot/engine";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";
import type { ConversationMemory } from "../server/src/modules/copilot/copilot-types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };
const emptyMemory: ConversationMemory = { attachments: [], summary: "", turns: [] };

function turn(role: "user" | "assistant", content: string) {
  return { content, role, timestamp: new Date().toISOString() };
}

async function askInConversation(
  question: string,
  memory: ConversationMemory,
  conversationId: string,
) {
  return runClinicalCopilotEngine(
    { attachments: [], chatInput: {}, conversationId, memory, question },
    engineDeps,
  );
}

async function testRouterClassifiesEducationWithoutKeywordsOnly() {
  const route = ClinicalKnowledgeRouter.route({
    attachments: [],
    classification: {
      confidence: 0.62,
      emergencyPriority: "NONE",
      entities: { ages: [], dates: [], diseases: [], drugs: [], ecgFindings: [], genders: [], heartRates: [], occupations: [], patientNames: [], prIntervals: [], qrsDurations: [], qtValues: [], reportTypes: [], rhythms: [], riskFactors: [] },
      executionTimeMs: 1,
      intents: [],
      normalizedQuestion: "Where should I start?",
      primaryIntent: "conversation",
      primaryMedicalIntent: "small_talk",
      requiresClarification: false,
    },
    memory: {
      attachments: [],
      summary: "",
      turns: [
        turn("user", "I am a medical student. Can you help me learn ECG?"),
        turn("assistant", "Your learning path: ECG paper and calibration, then heart rate, rhythm, axis, intervals, and waveforms."),
      ],
    },
    question: "Where should I start?",
    resolvedQuestion: "Where should I start?",
  });

  assert(route.domain === "education", `expected education domain, got ${route.domain}`);
  assert(route.educationalMode, "educational mode should stay active on follow-up");
  assert(route.educationalTopic === "ecg_basics", `expected ecg_basics topic, got ${route.educationalTopic}`);
}

async function testMedicalStudentEcgLearningPath() {
  ConversationManager.resetForTests();
  const conversationId = "edu-ecg-conversation";

  const first = await askInConversation(
    "I am a medical student. Can you help me learn ECG?",
    emptyMemory,
    conversationId,
  );

  assert(first.communicationIntent === "Education", `turn 1 intent: ${first.communicationIntent}`);
  assert(first.knowledgeDomain.domain === "education", `turn 1 domain: ${first.knowledgeDomain.domain}`);
  assert(!first.requiresClarification, "education should not ask for ECG upload clarification");
  assert(/learning path|tutor|step by step/i.test(first.response.content), "turn 1 should offer a learning path");
  assert(/learning path|cardiac anatomy|ECG paper|calibration|heart rate|rhythm|axis|lead placement|conduction/i.test(first.response.content), "turn 1 should list ECG basics");
  assert(!/please upload an ecg/i.test(first.response.content), "turn 1 should not demand ECG upload");
  assert(first.conversationState?.educationalMode, "session should record educational mode");

  const memoryAfterFirst: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [
      turn("user", "I am a medical student. Can you help me learn ECG?"),
      turn("assistant", first.response.content),
    ],
  };

  const second = await askInConversation("Where should I start?", memoryAfterFirst, conversationId);

  assert(second.communicationIntent === "Education", `turn 2 intent: ${second.communicationIntent}`);
  assert(second.knowledgeDomain.educationalMode, "turn 2 should remain in educational mode");
  assert(/cardiac anatomy|ECG paper|calibration|fundamentals/i.test(second.response.content), "turn 2 should start with ECG fundamentals");
  assert(!/\bst elevation should be interpreted\b/i.test(second.response.content), "turn 2 should not dump ST elevation article");

  const memoryAfterSecond: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [
      ...memoryAfterFirst.turns,
      turn("user", "Where should I start?"),
      turn("assistant", second.response.content),
    ],
  };

  const third = await askInConversation("What next?", memoryAfterSecond, conversationId);

  assert(third.communicationIntent === "Education", `turn 3 intent: ${third.communicationIntent}`);
  assert(third.knowledgeDomain.educationalMode, "turn 3 should remain in educational mode");
  assert(/heart rate|rhythm|axis|cardiac anatomy|ECG paper|calibration|conduction/i.test(third.response.content), "turn 3 should continue tutoring");
  assert(!/please upload/i.test(third.response.content), "turn 3 should not revert to upload prompt");
}

async function testClinicalEcgStillRoutesToInterpretation() {
  ConversationManager.resetForTests();
  const result = await askInConversation(
    "Please interpret this ECG tracing for ischaemia",
    emptyMemory,
    "clinical-ecg-conv",
  );

  assert(result.knowledgeDomain.domain === "ecg_interpretation" || result.communicationIntent === "ECGAnalysis",
    `clinical ECG request should not be education: ${result.knowledgeDomain.domain}/${result.communicationIntent}`);
  assert(result.communicationIntent !== "Education", "clinical interpretation must not be misrouted as education");
}

async function main() {
  await testRouterClassifiesEducationWithoutKeywordsOnly();
  await testMedicalStudentEcgLearningPath();
  await testClinicalEcgStillRoutesToInterpretation();
  console.log("copilot-clinical-education.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
