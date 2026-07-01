/**
 * Clinical AI Assistant V3 — architecture and conversational validation examples.
 */
import fs from "node:fs";
import path from "node:path";

process.env.COPILOT_LLM_MOCK = "true";

import { CLINICAL_AI_ENGINE_VERSION } from "../server/src/modules/copilot/engine/types";
import { runClinicalCopilotEngine } from "../server/src/modules/copilot/engine";
import { executeCopilotTool } from "../server/src/modules/copilot/v3/tools/executor";
import { analyzeAttachmentStructured } from "../server/src/modules/copilot/v3/tools/document-analyzer";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";
import { MEDICAL_ASSISTANT_V3_SYSTEM_PROMPT } from "../server/src/modules/copilot/v3/system-prompt";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };
const emptyMemory = { attachments: [], summary: "", turns: [] };

async function ask(question: string, memory = emptyMemory, conversationId = "v3-conv") {
  return runClinicalCopilotEngine({ attachments: [], chatInput: {}, conversationId, memory, question }, engineDeps);
}

async function main() {
  assert(CLINICAL_AI_ENGINE_VERSION === "v3", "Engine version must be v3");
  assert(MEDICAL_ASSISTANT_V3_SYSTEM_PROMPT.includes("never expose chain-of-thought"), "System prompt safety rules");

  const v2NaturalResponse = fs.readFileSync(
    path.join("server", "src", "modules", "copilot", "engine", "v2", "natural-response.ts"),
    "utf8",
  );
  const engineSource = fs.readFileSync(path.join("server", "src", "modules", "copilot", "engine", "clinical-ai-engine.ts"), "utf8");
  assert(!engineSource.includes("runClinicalAiCoreV2"), "V2 pipeline must not be active");
  assert(!engineSource.includes("NaturalResponse.generate"), "Template generator must not be wired");
  assert(engineSource.includes("runClinicalAiV3"), "V3 pipeline must be active");

  const routesSource = fs.readFileSync(path.join("server", "src", "modules", "copilot", "copilot.routes.ts"), "utf8");
  assert(!routesSource.includes("streamAssistantContent"), "Fake chunk streaming must be removed");
  assert(!routesSource.includes("StreamingRenderer"), "StreamingRenderer must not be used for chat");

  const toolJson = await executeCopilotTool("medical_knowledge_search", JSON.stringify({ query: "hypertension" }), {
    attachments: [],
    chatInput: {},
    retrieveClinicalContext: async () => emptyClinicalContext(),
  });
  assert(typeof toolJson === "object" && toolJson !== null, "Tool must return JSON object");
  assert("hits" in (toolJson as Record<string, unknown>) || "guidelines" in (toolJson as Record<string, unknown>), "Knowledge tool returns structured hits");

  const ecgJson = analyzeAttachmentStructured({
    analysisSummary: "ECG uploaded",
    attachmentId: "ecg-1",
    confidence: 0.8,
    documentType: "ECG_IMAGE",
    extractedText: "sinus rhythm rate 72 pr 160 qrs 90 qtc 420",
    kind: "ecg",
    medicalAnalysis: null,
    mimeType: "image/png",
    originalName: "tracing.png",
    recommendations: [],
    sizeBytes: 1000,
    warnings: [],
  });
  assert(ecgJson.pipeline === "ecg", "ECG pipeline classification");
  assert(ecgJson.intervals?.heartRateBpm === 72, "ECG interval extraction");

  const scenarios = [
    "Hello",
    "How are you?",
    "I'm a medical student",
    "Teach me ECG",
    "Where should I start?",
    "What is hypertension?",
    "How is it diagnosed?",
    "What causes LVH?",
    "Explain atrial fibrillation",
    "AF",
    "What drugs treat hypertension?",
    "Is amiodarone safe with warfarin?",
    "Patient has chest pain and diaphoresis",
    "This patient has hypertension",
    "Why is his LVH happening?",
    "What would you do next?",
    "Interpret this ECG",
    "Review the lab I uploaded",
    "What does ESC recommend for AF anticoagulation?",
    "Generate a differential for syncope",
    "Thank you",
    "Continue",
    "Tell me more",
    "What about the QT interval?",
    "Explain STEMI",
    "How do you manage hyperkalemia on ECG?",
    "Summarize our conversation",
    "Who are you?",
    "I need your help",
    "Goodbye",
  ] as const;

  for (const question of scenarios) {
    const memory = question === "How is it diagnosed?"
      ? {
          attachments: [],
          summary: "user: What is hypertension?",
          turns: [
            { role: "user" as const, content: "What is hypertension?" },
            { role: "assistant" as const, content: "Hypertension is sustained high blood pressure." },
          ],
        }
      : emptyMemory;
    const result = await ask(question, memory);
    assert(result.response.content.trim().length > 20, `Response required for: ${question}`);
    assert(!/^Definition:/im.test(result.response.content), `No template headers for: ${question}`);
    assert(!/Confidence Score:/i.test(result.response.content), `No confidence artifacts for: ${question}`);
    assert(!/Knowledge route:/i.test(result.response.content), `No routing artifacts for: ${question}`);
  }

  console.log(`Clinical AI V3 integration passed (${scenarios.length} conversational scenarios).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
