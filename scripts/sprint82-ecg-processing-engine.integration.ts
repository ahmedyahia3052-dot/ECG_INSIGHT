/**
 * Sprint 82 — ECG Processing Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/ecg-processing-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "types.ts"),
    markers: ["ECG_PROCESSING_ENGINE_VERSION", "UPLOAD_INGEST", "WAVEFORM_EXTRACT", "QUALITY_SCORE"],
  },
  {
    file: resolve(MOD, "interfaces.ts"),
    markers: ["WaveformExtractionEngine", "MeasurementEngineAdapter", "LeadMappingEngine"],
  },
  {
    file: resolve(MOD, "orchestrator.ts"),
    markers: ["executeProcessingPipeline", "runTrackedStage", "PERSIST"],
  },
  {
    file: resolve(MOD, "worker.ts"),
    markers: ["ensureProcessingWorkerStarted", "claimNextQueuedJob", "scheduleProcessingJobRetry"],
  },
  {
    file: resolve(MOD, "recovery.ts"),
    markers: ["computeRetryDelayMs", "isRecoverableProcessingError"],
  },
  {
    file: resolve(MOD, "repository.ts"),
    markers: ["createProcessingJob", "EcgProcessingJob", "claimNextQueuedJob"],
  },
  {
    file: resolve(MOD, "ecg-processing-engine.routes.ts"),
    markers: ["/jobs", "/cases/:caseId/jobs", "enqueueCaseProcessing"],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: ["model EcgProcessingJob", "enum EcgProcessingStage", "enum EcgProcessingJobStatus"],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260709010000_sprint82_ecg_processing_engine/migration.sql"),
    markers: ["EcgProcessingJob", "EcgProcessingStage", "EcgProcessingJobStatus"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/ecg-processing-engine", "ecgProcessingEngineRouter"],
  },
  {
    file: resolve(ROOT, "SPRINT82_ECG_ENGINE.md"),
    markers: ["Processing Architecture", "Background Workers", "Waveform Extraction Interface"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 82 ECG Processing Engine integration markers: PASS");
