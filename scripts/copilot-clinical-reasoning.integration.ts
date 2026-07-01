process.env.COPILOT_LLM_MOCK = "true";

import { runClinicalCopilotEngine } from "../server/src/modules/copilot/engine";
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

async function testFragmentedMedicalStudentEcgPath() {
  const conversationId = "fragmented-edu-conv";
  const first = await askInConversation("I am a medical student.", emptyMemory, conversationId);
  assert(/student|learn|ECG|help/i.test(first.response.content), "turn 1 invites learning");

  const memory1: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [turn("user", "I am a medical student."), turn("assistant", first.response.content)],
  };

  const second = await askInConversation("I want to learn ECG.", memory1, conversationId);
  assert(/ECG|learn|step/i.test(second.response.content), "turn 2 offers structured learning");

  const memory2: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [...memory1.turns, turn("user", "I want to learn ECG."), turn("assistant", second.response.content)],
  };

  const third = await askInConversation("Where should I start?", memory2, conversationId);
  assert(/start|ECG|fundamental|anatomy|step/i.test(third.response.content), "turn 3 starts fundamentals with memory");
}

async function testHypertensionFollowUp() {
  const memory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [
      turn("user", "Explain hypertension."),
      turn("assistant", "Hypertension is persistently elevated blood pressure."),
    ],
  };
  const followUp = await askInConversation("Why does it cause LVH?", memory, "htn-follow-up");
  assert(/LVH|hypertrophy|pressure|hypertension/i.test(followUp.response.content), "follow-up uses memory");
}

async function testPatientCaseFollowUp() {
  const memory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [
      turn("user", "This patient has chest pain."),
      turn("assistant", "Tell me more about onset, vitals, and ECG findings."),
    ],
  };
  const followUp = await askInConversation("What would you do next?", memory, "case-follow-up");
  assert(/chest pain|ECG|troponin|vitals|next/i.test(followUp.response.content), "case follow-up stays clinical");
}

async function testGreetingReturnsNaturalReply() {
  const result = await askInConversation("Hello", emptyMemory, "greeting-conv");
  assert(result.response.content.trim().length > 10, "greeting returns natural LLM prose");
}

async function main() {
  await testFragmentedMedicalStudentEcgPath();
  await testHypertensionFollowUp();
  await testPatientCaseFollowUp();
  await testGreetingReturnsNaturalReply();
  console.log("copilot-clinical-reasoning.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
