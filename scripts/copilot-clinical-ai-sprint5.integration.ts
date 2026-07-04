process.env.COPILOT_LLM_MOCK = "true";

import { runIntegrationMain } from "./finish-integration";
import { runClinicalCopilotEngine } from "../server/src/modules/copilot/engine";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";
import type { ConversationMemory } from "../server/src/modules/copilot/copilot-types";
import { parseSlashCommand, resolveTutorStepFromText } from "../server/src/modules/copilot/core/slash-commands";
import { ECG_TUTOR_CURRICULUM } from "../server/src/modules/knowledge-engine/knowledge/cardiology/ecg-education-tree";
import { CoreConversationManager } from "../server/src/modules/copilot/core/conversation-manager";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };
const emptyMemory: ConversationMemory = { attachments: [], summary: "", turns: [] };

function turn(role: "user" | "assistant", content: string) {
  return { content, role };
}

async function ask(question: string, memory: ConversationMemory, conversationId: string) {
  return runClinicalCopilotEngine({ attachments: [], chatInput: {}, conversationId, memory, question }, engineDeps);
}

async function testSlashCommandsParse() {
  assert(parseSlashCommand("/teach cardiac anatomy").command === "teach", "teach command");
  assert(parseSlashCommand("/quiz").command === "quiz", "quiz command");
  assert(parseSlashCommand("/case chest pain").command === "case", "case command");
  assert(parseSlashCommand("/explain axis").command === "explain", "explain command");
  assert(parseSlashCommand("/summarize").command === "summarize", "summarize command");
}

async function testTutorCurriculum() {
  assert(ECG_TUTOR_CURRICULUM.length === 13, "13 tutor lessons");
  assert(resolveTutorStepFromText("bundle branch block", ECG_TUTOR_CURRICULUM) === 9, "BBB step");
  assert(resolveTutorStepFromText("stemi", ECG_TUTOR_CURRICULUM) === 11, "STEMI step");
}

async function testTeachCommandStructuredResponse() {
  CoreConversationManager.resetForTests();
  const result = await ask("/teach cardiac anatomy", emptyMemory, "sprint5-teach");
  assert(/## Title|## Explanation|Clinical Pearl|## Key Points|## Next Lesson/i.test(result.response.content), "structured tutor markdown");
  assert(result.tag === "Medical Education", "medical education tag");
}

async function testRepeatedQuestionNotRefused() {
  CoreConversationManager.resetForTests();
  const conversationId = "sprint5-repeat";
  const question = "What is the PR interval?";
  const first = await ask(question, emptyMemory, conversationId);
  const memory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [turn("user", question), turn("assistant", first.response.content)],
  };
  const second = await ask(question, memory, conversationId);
  assert(second.response.content.trim().length > 20, "repeated question answered");
  assert(!/already answered|i already|won't repeat|cannot repeat|asked that/i.test(second.response.content), "no duplicate refusal");
}

async function testConversationMemoryContext() {
  CoreConversationManager.resetForTests();
  const conversationId = "sprint5-memory";
  const first = await ask("I am a medical student learning ECG", emptyMemory, conversationId);
  const memory: ConversationMemory = {
    attachments: [],
    summary: "user: learning ECG",
    turns: [
      turn("user", "I am a medical student learning ECG"),
      turn("assistant", first.response.content),
    ],
  };
  const second = await ask("Where should I start?", memory, conversationId);
  assert(/start|anatomy|fundamental|step|ECG/i.test(second.response.content), "follow-up uses memory");
}

async function testQuizCommand() {
  CoreConversationManager.resetForTests();
  const result = await ask("/quiz", emptyMemory, "sprint5-quiz");
  assert(/quiz|question|##/i.test(result.response.content), "quiz response");
}

async function main() {
  await testSlashCommandsParse();
  await testTutorCurriculum();
  await testTeachCommandStructuredResponse();
  await testRepeatedQuestionNotRefused();
  await testConversationMemoryContext();
  await testQuizCommand();
  console.log("copilot-clinical-ai-sprint5.integration.ts: all tests passed");
}

runIntegrationMain(main, "copilot-clinical-ai-sprint5.integration.ts: all tests passed");
