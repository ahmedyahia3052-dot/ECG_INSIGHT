process.env.COPILOT_LLM_MOCK = "true";

import {
  ClinicalKnowledgeRouter,
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
  return { content, role };
}

async function askInConversation(question: string, memory: ConversationMemory, conversationId: string) {
  return runClinicalCopilotEngine({ attachments: [], chatInput: {}, conversationId, memory, question }, engineDeps);
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
}

async function testMedicalStudentEcgLearningPath() {
  const conversationId = "edu-ecg-conversation";
  const first = await askInConversation("I am a medical student. Can you help me learn ECG?", emptyMemory, conversationId);
  assert(first.response.content.trim().length > 20, "turn 1 returns natural LLM tutoring prose");
  assert(/learn|ECG|step|student/i.test(first.response.content), "turn 1 addresses learning");

  const memoryAfterFirst: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [turn("user", "I am a medical student. Can you help me learn ECG?"), turn("assistant", first.response.content)],
  };

  const second = await askInConversation("Where should I start?", memoryAfterFirst, conversationId);
  assert(/start|ECG|fundamental|anatomy|step/i.test(second.response.content), "turn 2 continues tutoring with memory");
}

async function testClinicalEcgStillAnswersClinically() {
  const result = await askInConversation("Please interpret this ECG tracing for ischaemia", emptyMemory, "clinical-ecg-conv");
  assert(/ECG|ischaemia|ischemia|tracing|rhythm|ST/i.test(result.response.content), "clinical ECG question answered clinically");
}

async function main() {
  await testRouterClassifiesEducationWithoutKeywordsOnly();
  await testMedicalStudentEcgLearningPath();
  await testClinicalEcgStillAnswersClinically();
  console.log("copilot-clinical-education.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
