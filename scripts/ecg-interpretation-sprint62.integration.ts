import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { runDigitizationPipeline } from "../server/src/modules/ecg-digitization/digitizer";
import { measureFromLeads } from "../server/src/modules/ecg-measurement";
import { interpretFromMeasurement } from "../server/src/modules/ecg-interpretation";

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
  const dir = path.resolve(process.cwd(), "uploads", "sprint62-tests");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "synthetic-ecg-interpret.png");
  await createSyntheticEcgGridImage(imagePath);

  const file = {
    id: "sprint62-file",
    metadataJson: {},
    mimeType: "image/png",
    originalName: "test-50mm-20mm-ecg.png",
    sizeBytes: (await fs.stat(imagePath)).size,
    storagePath: imagePath,
  };

  const pipeline = await runDigitizationPipeline(file);
  const measurement = measureFromLeads({ calibration: pipeline.calibration, leads: pipeline.leads });
  const interpretation = interpretFromMeasurement(measurement);

  assert(interpretation.primaryDiagnosis.length > 0, "primary diagnosis required");
  assert(interpretation.findings.length > 0, "findings required");
  assert(interpretation.report.summary.length > 0, "summary required");
  assert(interpretation.report.findings.length > 0, "report findings required");
  assert(interpretation.recommendations.length > 0, "recommendations required");
  assert(interpretation.markdownReport.includes("# ECG Clinical Interpretation Report"), "markdown report required");
  assert(["normal", "minor", "abnormal", "urgent", "critical"].includes(interpretation.severity), "severity required");
  assert(interpretation.findings.every((item) => item.evidence.length > 0), "every finding must include explainability evidence");
  assert(interpretation.findings.some((item) => item.category === "rhythm"), "rhythm interpretation required");
  assert(interpretation.findings.some((item) => item.category === "axis"), "axis interpretation required");
  assert(Object.keys(interpretation.measurementsUsed).length >= 5, "measurements used bundle required");

  const categories = new Set(interpretation.findings.map((item) => item.category));
  assert(categories.size >= 2, "interpretation should span multiple clinical categories");

  console.log("ecg-interpretation-sprint62.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
