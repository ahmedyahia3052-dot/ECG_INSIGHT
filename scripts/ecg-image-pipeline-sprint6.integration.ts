import fs from "node:fs/promises";
import { runIntegrationMain } from "./finish-integration";
import path from "node:path";
import sharp from "sharp";
import { runDigitizationPipeline } from "../server/src/modules/ecg-digitization/digitizer";
import { detectGridCalibration } from "../server/src/modules/ecg-processing/ecg-digitization.service";

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
  const dir = path.resolve(process.cwd(), "uploads", "sprint6-tests");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "synthetic-ecg-50mm-20mm.png");
  await createSyntheticEcgGridImage(imagePath);

  const file = {
    id: "sprint6-file",
    metadataJson: {},
    mimeType: "image/png",
    originalName: "test-50mm-20mm-ecg.png",
    sizeBytes: (await fs.stat(imagePath)).size,
    storagePath: imagePath,
  };

  const calibration = detectGridCalibration(file);
  assert(calibration.paperSpeedMmPerSec === 50, "filename should infer 50 mm/s");
  assert(calibration.gainMmPerMv === 20, "filename should infer 20 mm/mV");

  const pipeline = await runDigitizationPipeline(file);
  assert(pipeline.leads.length === 12, "12 leads digitized");
  assert(pipeline.leadSegments.length === 12, "12 lead segments detected");
  assert(pipeline.quality.score >= 0 && pipeline.quality.score <= 100, "quality score normalized");
  assert(pipeline.preprocessing.contrastEnhanced || pipeline.preprocessing.borderDetected, "preprocessing metadata present");
  assert(pipeline.calibration.gridDetected, "grid should be detected on synthetic image");
  assert(pipeline.leads.every((lead) => lead.samples.length > 0), "waveform JSON samples extracted");

  console.log("ecg-image-pipeline-sprint6.integration.ts: all tests passed");
}

runIntegrationMain(main, "ecg-image-pipeline-sprint6.integration.ts: all tests passed");
