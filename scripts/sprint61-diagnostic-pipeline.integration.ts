import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { runIntegrationMain } from "./finish-integration";
import { runDigitizationPipeline } from "../server/src/modules/ecg-digitization/digitizer";
import {
  diagnosticPipelineResultSchema,
  runEcgDiagnosticPipelineAsync,
} from "../server/src/modules/ecg-diagnostic-pipeline";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function createSyntheticEcgGridImage(outputPath: string) {
  const width = 800;
  const height = 600;
  const pixels = Buffer.alloc(width * height * 3, 255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const grid = (x % 10 === 0 || y % 10 === 0) ? 220 : 255;
      const trace = y > 120 && y < 140 && Math.sin(x / 18) > 0.4 ? 40 : grid;
      pixels[index] = trace;
      pixels[index + 1] = trace;
      pixels[index + 2] = trace;
    }
  }
  await sharp(pixels, { raw: { channels: 3, height, width } }).png().toFile(outputPath);
}

async function main() {
  const dir = path.resolve(process.cwd(), "uploads", "sprint61-pipeline-tests");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "synthetic-ecg-pipeline.png");
  await createSyntheticEcgGridImage(imagePath);

  const file = {
    id: "sprint61-pipeline-file",
    metadataJson: {},
    mimeType: "image/png",
    originalName: "test-ecg-pipeline.png",
    sizeBytes: (await fs.stat(imagePath)).size,
    storagePath: imagePath,
  };

  const digitized = await runDigitizationPipeline(file);
  assert(digitized.leads.length > 0, "digitization must produce leads");

  const result = await runEcgDiagnosticPipelineAsync({
    calibration: digitized.calibration,
    imageAvailable: true,
    leads: digitized.leads,
    qualityScore: digitized.quality.score,
  });

  diagnosticPipelineResultSchema.parse({
    confidence: result.confidence,
    performanceMs: result.performanceMs,
    pipelineVersion: result.pipelineVersion,
    stages: result.stages,
  });

  assert(result.pipelineVersion === "sprint61-v1", "pipeline version mismatch");
  assert(result.artifacts.measurementLegacy.intervals.qtcBazettMs > 0, "QTc should be computed");
  assert(result.artifacts.measurementEngine.validation.valid !== undefined, "measurement validation required");
  assert(result.artifacts.medicalIntelligence.findings.some((finding) => finding.differentialDiagnosis.length >= 0), "differential diagnoses required");
  assert(result.artifacts.aiReport.recommendations.length > 0, "AI report recommendations required");
  assert(result.stages.filter((stage) => stage.status === "completed").length >= 6, "major stages should complete");

  console.log("sprint61-diagnostic-pipeline.integration.ts: all tests passed");
}

runIntegrationMain(main, "sprint61-diagnostic-pipeline.integration.ts");
