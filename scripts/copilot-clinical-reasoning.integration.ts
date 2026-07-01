import {
  ConversationManager,
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

async function testFragmentedMedicalStudentEcgPath() {
  ConversationManager.resetForTests();
  const conversationId = "fragmented-edu-conv";

  const first = await askInConversation("I am a medical student.", emptyMemory, conversationId);
  assert(first.communicationIntent === "Education", `turn 1: ${first.communicationIntent}`);
  assert(!first.toolPlan.runKnowledge, "turn 1 must not retrieve knowledge");
  assert(/tutor|learn|ECG|focus/i.test(first.response.content), "turn 1 invites learning");

  const memory1: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [turn("user", "I am a medical student."), turn("assistant", first.response.content)],
  };

  const second = await askInConversation("I want to learn ECG.", memory1, conversationId);
  assert(second.communicationIntent === "Education", `turn 2: ${second.communicationIntent}`);
  assert(!second.toolPlan.runKnowledge, "turn 2 must not retrieve knowledge");
  assert(/learning path|cardiac anatomy|step/i.test(second.response.content), "turn 2 offers structured path");
  assert(!/\bst elevation should be interpreted\b/i.test(second.response.content), "turn 2 must not dump ST elevation article");

  const memory2: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [...memory1.turns, turn("user", "I want to learn ECG."), turn("assistant", second.response.content)],
  };

  const third = await askInConversation("Where should I start?", memory2, conversationId);
  assert(third.communicationIntent === "Education", `turn 3: ${third.communicationIntent}`);
  assert(!third.toolPlan.runKnowledge, "turn 3 must not retrieve knowledge before reasoning");
  assert(third.knowledgeHits.length === 0, "turn 3 must skip knowledge retrieval");
  assert(/cardiac anatomy|fundamentals|conduction|ECG paper|calibration|lead placement/i.test(third.response.content),
    `turn 3 starts with fundamentals: ${third.response.content.slice(0, 200)}`);
  assert(!/\bst elevation should be interpreted\b/i.test(third.response.content), "turn 3 must not dump ST elevation article");
}

async function testHypertensionFollowUp() {
  ConversationManager.resetForTests();
  const convId = "htn-follow-up";
  await askInConversation("Explain hypertension.", emptyMemory, convId);
  const memory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [
      turn("user", "Explain hypertension."),
      turn("assistant", "Hypertension is persistently elevated blood pressure."),
    ],
  };
  const followUp = await askInConversation("Why does it cause LVH?", memory, convId);
  assert(/hypertension/i.test(followUp.context.resolvedQuestion), `resolved: ${followUp.context.resolvedQuestion}`);
  assert(!followUp.requiresClarification, "should not ask for clarification");
}

async function testPatientCaseFollowUp() {
  ConversationManager.resetForTests();
  const convId = "case-follow-up";
  await askInConversation("This patient has chest pain.", emptyMemory, convId);
  const memory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [
      turn("user", "This patient has chest pain."),
      turn("assistant", "Tell me more about onset, vitals, and ECG findings."),
    ],
  };
  const followUp = await askInConversation("What would you do next?", memory, convId);
  assert(/chest pain|ECG|troponin|vitals/i.test(followUp.response.content), "case follow-up stays clinical");
}

async function testGreetingSkipsKnowledge() {
  ConversationManager.resetForTests();
  const result = await askInConversation("Hello", emptyMemory, "greeting-conv");
  assert(!result.toolPlan.runKnowledge, "greeting skips knowledge");
  assert(result.knowledgeHits.length === 0, "greeting has no knowledge hits");
}

async function main() {
  await testFragmentedMedicalStudentEcgPath();
  await testHypertensionFollowUp();
  await testPatientCaseFollowUp();
  await testGreetingSkipsKnowledge();
  console.log("copilot-clinical-reasoning.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
