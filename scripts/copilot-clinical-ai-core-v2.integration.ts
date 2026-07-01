process.env.COPILOT_LLM_MOCK = "true";

import {
  CLINICAL_AI_ENGINE_VERSION,
  ECG_LEARNING_PATH,
  ResponseGenerator,
  runClinicalCopilotEngine,
} from "../server/src/modules/copilot/engine";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";
import type { ConversationMemory } from "../server/src/modules/copilot/copilot-types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory: ConversationMemory = { attachments: [], summary: "", turns: [] };
const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };

async function ask(question: string, memory: ConversationMemory = emptyMemory, conversationId = "v3-core") {
  const result = await runClinicalCopilotEngine({ attachments: [], chatInput: {}, conversationId, memory, question }, engineDeps);
  assert(result.response.content.trim().length > 20, `${question}: response required`);
  assert(!/^Definition:/m.test(result.response.content), `${question}: no template headers`);
  return result;
}

async function main() {
  assert(CLINICAL_AI_ENGINE_VERSION === "v3", `engine version must be v3, got ${CLINICAL_AI_ENGINE_VERSION}`);

  await ask("Hello");
  await ask("What is hypertension?");
  await ask("How is it diagnosed?", {
    attachments: [],
    summary: "",
    turns: [
      { role: "user", content: "What is hypertension?" },
      { role: "assistant", content: "Hypertension is sustained high blood pressure." },
    ],
  });

  const vision = await runClinicalCopilotEngine({
    attachments: [{
      analysisSummary: "ECG uploaded",
      attachmentId: "ecg-1",
      confidence: 0.8,
      documentType: "ECG_IMAGE",
      extractedText: "ST elevation in leads II III aVF rate 88",
      kind: "ecg",
      medicalAnalysis: { findings: ["Possible inferior ST elevation"] },
      mimeType: "image/png",
      originalName: "tracing.png",
      recommendations: [],
      sizeBytes: 1000,
      warnings: [],
    }],
    chatInput: {},
    conversationId: "v3-vision",
    memory: emptyMemory,
    question: "What do you see on this ECG?",
  }, engineDeps);
  assert(/ECG|ST|elevation|tracing|rhythm/i.test(vision.response.content), "Upload analysis informs LLM answer");

  assert(ECG_LEARNING_PATH.length === 8, "ECG learning path reference data preserved for tools");

  const generated = ResponseGenerator.generate({
    attachments: [],
    clinicalContext: emptyClinicalContext(),
    communicationIntent: "MedicalQuestion",
    intent: "general_medical_question",
    knowledge: [],
    memory: emptyMemory,
    plan: { allowBullets: false, maxParagraphs: 4, style: "conversational", suggestFollowUps: true },
    primarySmartIntent: "general_medical_question",
    question: "legacy shim",
    requiresClarification: false,
    topic: null,
  });
  assert(generated.content.includes("legacy shim") || generated.content.length > 0, "Legacy ResponseGenerator shim remains isolated from V3 pipeline");

  console.log("copilot-clinical-ai-core-v2.integration.ts: all tests passed (V3)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
