import assert from "node:assert/strict";
import { interpretFromMeasurement } from "../server/src/modules/ecg-interpretation";
import { measureFromLeads } from "../server/src/modules/ecg-measurement";
import { runDigitizationPipeline } from "../server/src/modules/ecg-digitization/digitizer";
import { buildEnterpriseInterpretation, createDefaultInterpretationEngineDependencies } from "../server/src/modules/ecg-interpretation-engine";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PERF_BUDGET_MS = 250;
const ITERATIONS = 12;

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
  const dir = path.resolve(process.cwd(), "uploads", "sprint62-perf");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "perf-ecg.png");
  await createSyntheticEcgGridImage(imagePath);
  const file = {
    id: "sprint62-perf",
    metadataJson: {},
    mimeType: "image/png",
    originalName: "perf-ecg.png",
    sizeBytes: (await fs.stat(imagePath)).size,
    storagePath: imagePath,
  };
  const pipeline = await runDigitizationPipeline(file);
  const measurement = measureFromLeads({ calibration: pipeline.calibration, leads: pipeline.leads });
  const deps = createDefaultInterpretationEngineDependencies();
  const legacy = interpretFromMeasurement(measurement);

  const durations: number[] = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    const started = performance.now();
    const result = buildEnterpriseInterpretation(measurement, deps);
    durations.push(performance.now() - started);
    assert.ok(result.rhythm.label);
    assert.ok(result.clinicalImpression.summary);
  }

  const p95 = durations.sort((left, right) => left - right)[Math.floor(durations.length * 0.95)] ?? durations[0];
  assert.ok(p95 <= PERF_BUDGET_MS, `P95 interpretation latency ${p95.toFixed(1)}ms exceeds ${PERF_BUDGET_MS}ms budget`);
  assert.ok(legacy.findings.length > 0, "legacy findings required");

  console.log(`Sprint 62 interpretation engine performance: PASS (p95=${p95.toFixed(1)}ms, iterations=${ITERATIONS})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
