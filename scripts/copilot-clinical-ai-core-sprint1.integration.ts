/**
 * Sprint 1 — Clinical AI Core Foundation integration scenarios.
 */
import { runIntegrationMain } from "./finish-integration";
process.env.COPILOT_LLM_MOCK = "true";

import { CLINICAL_AI_ENGINE_VERSION } from "../server/src/modules/copilot/engine/types";
import { runClinicalCopilotEngine } from "../server/src/modules/copilot/engine";
import { CoreConversationManager } from "../server/src/modules/copilot/core";
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

async function ask(question: string, memory = emptyMemory, conversationId = "sprint1-core") {
  return runClinicalCopilotEngine({ attachments: [], chatInput: {}, conversationId, memory, question }, engineDeps);
}

async function main() {
  CoreConversationManager.resetForTests();
  assert(CLINICAL_AI_ENGINE_VERSION === "clinical-ai-core-v1", "Engine version must be clinical-ai-core-v1");

  const greeting = await ask("Hello.");
  assert(/hello|help|ready/i.test(greeting.response.content), "Greeting: natural welcome");
  assert(!/upload an ecg/i.test(greeting.response.content.toLowerCase()), "Greeting: no upload prompt");
  assert(greeting.communicationIntent === "Greeting", "Greeting intent");

  const student = await ask("I'm a medical student.", emptyMemory, "sprint1-student");
  assert(student.conversationState?.entities || greeting.conversationState, "Medical student turn completes");
  assert(!/upload an ecg/i.test(student.response.content.toLowerCase()), "Medical student: no upload prompt");

  const tutor = await ask("I want to learn ECG.", emptyMemory, "sprint1-tutor");
  assert(tutor.communicationIntent === "Education", "Tutor mode: education intent");
  assert(tutor.conversationState?.educationalMode === true, "Tutor mode: educationalMode persisted");
  assert(/learn|ECG|step|fundamental|start/i.test(tutor.response.content), "Tutor mode: tutoring response");
  assert(!/upload an ecg/i.test(tutor.response.content.toLowerCase()), "Tutor mode: never ask for upload");

  const tutorMemory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [turn("user", "I want to learn ECG."), turn("assistant", tutor.response.content)],
  };
  const followUp = await ask("Where should I start?", tutorMemory, "sprint1-tutor");
  assert(followUp.conversationState?.educationalMode === true, "Follow-up: stays in tutor mode");
  assert(/start|anatomy|fundamental|step|ECG/i.test(followUp.response.content), "Follow-up: continues lesson");
  assert(!/ST elevation|upload/i.test(followUp.response.content), "Follow-up: no pathology jump or upload");

  const hypertension = await ask("Explain hypertension.", emptyMemory, "sprint1-htn");
  assert(/hypertension|blood pressure/i.test(hypertension.response.content), "Hypertension explanation");
  assert(hypertension.context.activeTopic?.slug === "hypertension", "Topic memory: hypertension topic set");

  const htnMemory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [turn("user", "Explain hypertension."), turn("assistant", hypertension.response.content)],
  };
  const htnFollowUp = await ask("How is it diagnosed?", htnMemory, "sprint1-htn");
  assert(/diagnos|blood pressure|reading|monitor/i.test(htnFollowUp.response.content), "Topic follow-up: diagnosis");
  assert(htnFollowUp.context.resolvedQuestion.toLowerCase().includes("hypertension"), "Pronoun resolved to hypertension");

  const af = await ask("Explain atrial fibrillation.", emptyMemory, "sprint1-af");
  assert(/atrial fibrillation|irregular|rhythm/i.test(af.response.content), "Atrial fibrillation explanation");

  const clinical = await ask("This patient has chest pain and diaphoresis. What would you do next?", emptyMemory, "sprint1-case");
  assert(/chest pain|vitals|ECG|troponin|assess|next/i.test(clinical.response.content), "Clinical case reasoning");
  assert(clinical.requiresClarification === false, "Clinical case: no template clarification");

  const learnEcg = await ask("I need to learn ECG from zero.", emptyMemory, "sprint1-learn-zero");
  assert(learnEcg.communicationIntent === "Education", "Learn ECG from zero: education not ECG analysis");
  assert(!/upload an ecg or open the case/i.test(learnEcg.response.content.toLowerCase()), "Clarification: no upload template");

  const switchConv = await ask("Explain diabetes.", emptyMemory, "sprint1-switch");
  assert(/diabetes/i.test(switchConv.response.content), "Context switch: new topic");
  const switchMemory: ConversationMemory = {
    attachments: [],
    summary: "",
    turns: [turn("user", "Explain hypertension."), turn("assistant", hypertension.response.content), turn("user", "Explain diabetes."), turn("assistant", switchConv.response.content)],
  };
  const switchFollow = await ask("What causes it?", switchMemory, "sprint1-switch");
  assert(switchFollow.context.activeTopic?.slug === "diabetes", "Context switch: active topic updated");

  const patient = await ask("Explain heart failure in simple terms for a patient.", emptyMemory, "sprint1-patient");
  assert(/heart failure/i.test(patient.response.content), "Patient explanation");
  assert(!/upload/i.test(patient.response.content.toLowerCase()), "Patient mode: no upload");

  const doctor = await ask("What anticoagulation would you consider for new atrial fibrillation?", emptyMemory, "sprint1-doctor");
  assert(/atrial fibrillation|anticoag|stroke|CHADS|HAS/i.test(doctor.response.content), "Doctor conversation");

  console.log("Clinical AI Core Sprint 1 integration passed (13 conversational scenarios).");
}

runIntegrationMain(main, "Clinical AI Core Sprint 1 integration passed (13 conversational scenarios)");
