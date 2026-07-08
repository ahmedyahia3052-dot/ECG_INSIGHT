/**
 * Sprint 86 — AI Orchestration Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/ai-orchestration-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "types.ts"),
    markers: ["AI_ORCHESTRATION_ENGINE_VERSION", "VALIDATE", "LLM_ENRICHMENT", "COMPLETE"],
  },
  {
    file: resolve(MOD, "pipeline-manager.ts"),
    markers: ["executeOrchestrationPipeline", "runTrackedStage", "withOrchestrationTimeout"],
  },
  {
    file: resolve(MOD, "worker.ts"),
    markers: ["ensureOrchestrationWorkerStarted", "claimNextOrchestrationJob", "scheduleOrchestrationJobRetry"],
  },
  {
    file: resolve(MOD, "recovery.ts"),
    markers: ["computeOrchestrationRetryDelayMs", "OrchestrationTimeoutError", "withOrchestrationTimeout"],
  },
  {
    file: resolve(MOD, "repository.ts"),
    markers: ["createOrchestrationJob", "AiOrchestrationJob", "appendOrchestrationProcessingLog"],
  },
  {
    file: resolve(MOD, "providers/ai-provider.interface.ts"),
    markers: ["IAiOrchestrationProvider", "FutureAiProviderRegistration"],
  },
  {
    file: resolve(MOD, "providers/openai.adapter.ts"),
    markers: ["OpenAiOrchestrationAdapter"],
  },
  {
    file: resolve(MOD, "providers/ollama.adapter.ts"),
    markers: ["OllamaOrchestrationAdapter"],
  },
  {
    file: resolve(MOD, "providers/registry.ts"),
    markers: ["resolveOrchestrationProvider", "registerFutureAiProvider"],
  },
  {
    file: resolve(MOD, "ai-orchestration-engine.routes.ts"),
    markers: ["/jobs", "/jobs/:jobId/logs", "enqueueCaseOrchestration"],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: ["model AiOrchestrationJob", "enum AiOrchestrationStage", "enum AiOrchestrationJobStatus"],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260709020000_sprint86_ai_orchestration_engine/migration.sql"),
    markers: ["AiOrchestrationJob", "AiOrchestrationStage", "AiOrchestrationJobStatus"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/ai-orchestration-engine", "aiOrchestrationEngineRouter"],
  },
  {
    file: resolve(ROOT, "SPRINT86_AI_ORCHESTRATION_REPORT.md"),
    markers: ["Job Queue", "Pipeline Manager", "OpenAI Adapter", "Processing Logs"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 86 AI Orchestration Engine integration markers: PASS");
