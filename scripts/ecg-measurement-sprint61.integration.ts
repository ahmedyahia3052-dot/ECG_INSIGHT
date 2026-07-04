import fs from "node:fs/promises";
import { runIntegrationMain } from "./finish-integration";
import path from "node:path";
import sharp from "sharp";
import { measureFromLeads } from "../server/src/modules/ecg-measurement";
import { runDigitizationPipeline } from "../server/src/modules/ecg-digitization/digitizer";

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
  const dir = path.resolve(process.cwd(), "uploads", "sprint61-tests");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "synthetic-ecg-measure.png");
  await createSyntheticEcgGridImage(imagePath);

  const file = {
    id: "sprint61-file",
    metadataJson: {},
    mimeType: "image/png",
    originalName: "test-50mm-20mm-ecg.png",
    sizeBytes: (await fs.stat(imagePath)).size,
    storagePath: imagePath,
  };

  const pipeline = await runDigitizationPipeline(file);
  const clinical = measureFromLeads({ calibration: pipeline.calibration, leads: pipeline.leads });

  assert(clinical.heartRate > 0, "heart rate should be computed");
  assert(clinical.intervals.prIntervalMs > 0, "PR interval should be computed");
  assert(clinical.intervals.qrsDurationMs > 0, "QRS duration should be computed");
  assert(clinical.intervals.qtIntervalMs > 0, "QT interval should be computed");
  assert(clinical.intervals.qtcBazettMs > 0, "QTc Bazett should be computed");
  assert(clinical.intervals.qtcFridericiaMs > 0, "QTc Fridericia should be computed");
  assert(clinical.intervals.rrIntervalMs > 0, "RR interval should be computed");
  assert(clinical.intervals.pWaveDurationMs > 0, "P wave duration should be computed");
  assert(clinical.amplitudes.pWaveAmplitudeMv >= 0, "P wave amplitude should be present");
  assert(clinical.amplitudes.qrsAmplitudeMv >= 0, "QRS amplitude should be present");
  assert(clinical.amplitudes.tWaveAmplitudeMv >= 0, "T wave amplitude should be present");
  assert(typeof clinical.axis.electricalAxisDeg === "number", "electrical axis should be computed");
  assert(typeof clinical.axis.frontalPlaneAxisDeg === "number", "frontal plane axis should be computed");
  assert(typeof clinical.axis.meanQrsAxisDeg === "number", "mean QRS axis should be computed");
  assert(typeof clinical.stDeviation === "number", "ST deviation should be computed");
  assert(clinical.measurements.length >= 10, "structured measurement list should be populated");
  assert(clinical.measurements.some((item) => item.highlight), "at least one measurement should include waveform highlight metadata");
  assert(clinical.confidence > 0 && clinical.confidence <= 1, "confidence should be normalized");
  assert(["regular", "irregular", "sinus_rhythm", "sinus_tachycardia", "sinus_bradycardia"].includes(clinical.rhythm), "rhythm classification should be valid");
  assert(clinical.morphology.includes("narrow_qrs") || clinical.morphology.includes("wide_qrs"), "QRS morphology should be classified");

  const payload = {
    amplitudes: clinical.amplitudes,
    axis: clinical.axis,
    confidence: clinical.confidence,
    heartRate: clinical.heartRate,
    intervals: clinical.intervals,
    measurements: clinical.measurements,
    rhythm: clinical.rhythm,
    stDeviation: clinical.stDeviation,
  };
  assert(JSON.stringify(payload).includes("qtcBazettMs"), "serialized payload should include interval bundle");

  console.log("ecg-measurement-sprint61.integration.ts: all tests passed");
}

runIntegrationMain(main, "ecg-measurement-sprint61.integration.ts: all tests passed");
