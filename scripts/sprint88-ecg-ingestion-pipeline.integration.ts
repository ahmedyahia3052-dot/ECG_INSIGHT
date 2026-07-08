/**
 * Sprint 88 — ECG Ingestion Pipeline integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/ecg-ingestion-pipeline");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "types.ts"),
    markers: ["ECG_INGESTION_PIPELINE_VERSION", "UPLOAD", "AI_ORCHESTRATION", "NOTIFICATION", "COMPLETE"],
  },
  {
    file: resolve(MOD, "pipeline-manager.ts"),
    markers: ["advanceIngestionPipeline", "computeFileSha256", "findDuplicateIngestionJob", "enqueueCaseProcessing"],
  },
  {
    file: resolve(MOD, "worker.ts"),
    markers: ["claimNextIngestionJob", "scheduleIngestionJobRetry", "markIngestionJobDeadLetter", "registerIngestionWorkerAdapter"],
  },
  {
    file: resolve(MOD, "recovery.ts"),
    markers: ["computeIngestionRetryDelayMs", "IngestionTimeoutError", "withIngestionTimeout", "getDuplicateDetectionWindowMs"],
  },
  {
    file: resolve(MOD, "repository.ts"),
    markers: ["createIngestionJob", "EcgIngestionJob", "appendIngestionPipelineEvent", "claimNextIngestionJob"],
  },
  {
    file: resolve(MOD, "checksum.ts"),
    markers: ["computeFileSha256"],
  },
  {
    file: resolve(MOD, "metrics.ts"),
    markers: ["recordStageDuration", "summarizeIngestionMetrics"],
  },
  {
    file: resolve(MOD, "worker-adapter.ts"),
    markers: ["registerIngestionWorkerAdapter", "IngestionWorkerAdapter"],
  },
  {
    file: resolve(MOD, "ecg-ingestion-pipeline.routes.ts"),
    markers: ["/jobs", "/jobs/:jobId/events", "/jobs/:jobId/resume", "enqueueIngestion"],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: ["model EcgIngestionJob", "model EcgIngestionPipelineEvent", "enum EcgIngestionStage"],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260709030000_sprint88_ecg_ingestion_pipeline/migration.sql"),
    markers: ["EcgIngestionJob", "EcgIngestionPipelineEvent", "DEAD_LETTER"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/ecg-ingestion-pipeline", "ecgIngestionPipelineRouter"],
  },
  {
    file: resolve(ROOT, "server/src/uploads/uploads.routes.ts"),
    markers: ["enqueueIngestionFromUpload"],
  },
  {
    file: resolve(ROOT, "SPRINT88_PIPELINE_REPORT.md"),
    markers: ["Duplicate Detection", "Dead Letter Queue", "Pipeline Events", "Resume Processing"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 88 ECG Ingestion Pipeline integration markers: PASS");
