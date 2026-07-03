import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { runDigitizationPipeline } from "../server/src/modules/ecg-digitization/digitizer";
import { measureFromLeads } from "../server/src/modules/ecg-measurement";
import { interpretFromMeasurement } from "../server/src/modules/ecg-interpretation";
import { runEnsembleDiagnosis } from "../server/src/modules/ecg-ai-diagnosis";

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
  const dir = path.resolve(process.cwd(), "uploads", "sprint63-tests");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "synthetic-ecg-ai-diagnosis.png");
  await createSyntheticEcgGridImage(imagePath);

  const file = {
    id: "sprint63-file",
    metadataJson: {},
    mimeType: "image/png",
    originalName: "test-50mm-20mm-ecg.png",
    sizeBytes: (await fs.stat(imagePath)).size,
    storagePath: imagePath,
  };

  const pipeline = await runDigitizationPipeline(file);
  const measurement = measureFromLeads({ calibration: pipeline.calibration, leads: pipeline.leads });
  const interpretation = interpretFromMeasurement(measurement);
  const aiDiagnosis = await runEnsembleDiagnosis({
    imageAvailable: true,
    interpretation,
    leads: pipeline.leads,
    measurement,
    qualityScore: pipeline.quality.score,
  });

  assert(aiDiagnosis.primaryDiagnosis.length > 0, "primary AI diagnosis required");
  assert(aiDiagnosis.topDiagnoses.length >= 1 && aiDiagnosis.topDiagnoses.length <= 5, "top diagnoses must be 1-5");
  assert(aiDiagnosis.confidence > 0 && aiDiagnosis.confidence <= 1, "confidence normalized");
  assert(typeof aiDiagnosis.agreementWithRules === "number", "agreement score required");
  assert(aiDiagnosis.disagreementExplanation.length > 0, "disagreement explanation required");
  assert(aiDiagnosis.clinicalReasoning.length > 0, "clinical reasoning required");
  assert(aiDiagnosis.ensembleSources.includes("rule_engine"), "rule engine source required");
  assert(aiDiagnosis.ensembleSources.includes("deep_learning_model"), "deep learning source required");
  assert(aiDiagnosis.markdownReport.includes("AI ECG Diagnosis Ensemble"), "markdown report required");
  assert(aiDiagnosis.topDiagnoses.every((item) => item.probability >= 0 && item.probability <= 1), "probabilities normalized");

  console.log("ecg-ai-diagnosis-sprint63.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
