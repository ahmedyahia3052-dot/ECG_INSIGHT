process.env.COPILOT_LLM_MOCK = "true";

import {
  KnowledgeRouter,
  StreamingRenderer,
  VoiceEngine,
  runClinicalCopilotEngine,
} from "../server/src/modules/copilot/engine";
import { CLINICAL_AI_ENGINE_VERSION } from "../server/src/modules/copilot/engine/types";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory = { attachments: [], summary: "", turns: [] };
const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };

async function engine(question: string, memory = emptyMemory) {
  return runClinicalCopilotEngine({ attachments: [], chatInput: {}, conversationId: "test-conv", memory, question }, engineDeps);
}

async function main() {
  assert(CLINICAL_AI_ENGINE_VERSION === "v3", "Active engine must be V3");

  for (const greeting of ["Hi", "Hello", "How are you?", "Who are you?", "Thank you"]) {
    const result = await engine(greeting);
    assert(result.response.content.trim().length > 10, `${greeting} returns LLM prose`);
    assert(!/^Definition:/m.test(result.response.content), `${greeting} avoids template headers`);
  }

  const hypertension = await engine("What is hypertension?");
  assert(/hypertension|blood pressure/i.test(hypertension.response.content), "Hypertension answered in natural language");

  const followUp = await engine("How is it diagnosed?", {
    attachments: [],
    summary: "",
    turns: [
      { role: "user", content: "What is hypertension?" },
      { role: "assistant", content: "Hypertension is sustained elevation of blood pressure." },
    ],
  });
  assert(/diagnos|measure|reading|blood pressure|hypertension/i.test(followUp.response.content), "Follow-up uses conversation memory");

  const voice = VoiceEngine.capabilities;
  assert(voice.streamingSttReady && voice.interruptSupported && voice.whisperFallbackReady, "Voice architecture readiness");

  const chunks = StreamingRenderer.chunkContent("Hello Dr Ahmed.");
  assert(chunks.join("") === "Hello Dr Ahmed.", "Legacy streaming utility still available for non-chat use");

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
  assert(route.sources.includes("esc_guidelines"), "Knowledge router remains available as LLM tool backend");

  console.log("Clinical AI Copilot Engine integration checks passed (V3).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
