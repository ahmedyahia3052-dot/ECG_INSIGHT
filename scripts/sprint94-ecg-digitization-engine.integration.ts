/**
 * Sprint 94 — ECG Digitization Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/ecg-digitization-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "types.ts"),
    markers: ["ECG_DIGITIZATION_ENGINE_VERSION", "TWELVE_LEAD_DETECT", "WAVEFORM_EXTRACT"],
  },
  {
    file: resolve(MOD, "interfaces.ts"),
    markers: ["WaveformExtractionEngine", "LeadSegmentationEngine"],
  },
  {
    file: resolve(MOD, "stages.ts"),
    markers: ["runPaperDetectionStage", "runGridDetectionStage", "runTwelveLeadDetectionStage"],
  },
  {
    file: resolve(MOD, "waveform-engine.ts"),
    markers: ["defaultWaveformExtractionEngine", "defaultLeadSegmentationEngine"],
  },
  {
    file: resolve(MOD, "orchestrator.ts"),
    markers: ["executeDigitizationPipeline", "PERSIST", "COMPLETE"],
  },
  {
    file: resolve(MOD, "pipeline.ts"),
    markers: ["runDigitizationPipelineForFile", "sprint94-inline"],
  },
  {
    file: resolve(MOD, "repository.ts"),
    markers: ["createDigitizationJob", "claimNextDigitizationJob", "EcgDigitizationJob"],
  },
  {
    file: resolve(MOD, "worker.ts"),
    markers: ["ensureDigitizationWorkerStarted", "claimNextDigitizationJob"],
  },
  {
    file: resolve(MOD, "ecg-digitization-engine.routes.ts"),
    markers: ["/jobs", "/cases/:caseId/jobs", "enqueueCaseDigitization"],
  },
  {
    file: resolve(ROOT, "server/src/modules/ecg-processing-engine/orchestrator.ts"),
    markers: ["runDigitizationPipelineForFile"],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: ["model EcgDigitizationJob", "enum EcgDigitizationStage", "enum EcgDigitizationJobStatus"],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260709050000_sprint94_ecg_digitization_engine/migration.sql"),
    markers: ["EcgDigitizationJob", "TWELVE_LEAD_DETECT", "WAVEFORM_EXTRACT"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/ecg-digitization-engine", "ecgDigitizationEngineRouter"],
  },
  {
    file: resolve(ROOT, "SPRINT94_DIGITIZATION_REPORT.md"),
    markers: ["Digitization Pipeline", "Waveform Extraction", "Sprint 82", "Sprint 85"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 94 ECG Digitization Engine integration markers: PASS");
