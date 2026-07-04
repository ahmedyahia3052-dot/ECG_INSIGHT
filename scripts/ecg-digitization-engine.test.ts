import assert from "node:assert/strict";

import { extractEcgMetadataOcr } from "../server/src/modules/ecg-digitization/ocr/ecg-metadata-ocr";
import { detectGrid } from "../server/src/modules/ecg-digitization/grid-detector";
import { buildDigitalSignalObjects, digitalSignalObjectsToLeads } from "../server/src/modules/ecg-digitization/signal-engine";
import { validateDigitizedSignals } from "../server/src/modules/ecg-digitization/validation/signal-validator";
import { evaluateDigitizationBenchmark, summarizeBenchmarkResults } from "../server/src/modules/ecg-digitization/benchmark";
import { buildDigitizedWaveformPath, buildSegmentAlignedDigitizedWaveformLeads } from "../artifacts/ecg-insight/components/ecg/viewer/ecgDigitizedWaveformSync";
import { DEFAULT_SAMPLING_RATE } from "../server/src/modules/ecg-digitization/types";

const ocr = extractEcgMetadataOcr({
  metadata: { gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
  originalName: "patient-jane-25mm-10mm-ecg.png",
});
assert.equal(ocr.speed, "25 mm/s");
assert.equal(ocr.gain, "10 mm/mV");

const width = 400;
const height = 300;
const buffer = new Uint8Array(width * height);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const grid = x % 10 === 0 || y % 10 === 0 ? 220 : 255;
    const trace = y > 40 && y < 60 && Math.sin(x / 12) > 0.2 ? 35 : grid;
    buffer[y * width + x] = trace;
  }
}
const calibration = detectGrid(buffer, width, height, { metadata: {}, originalName: "25mm-10mm-ecg.png" });
assert.ok(calibration.gridDetected);
assert.ok((calibration.pixelsPerMm ?? 0) > 0);
assert.ok((calibration.pixelsPerMv ?? 0) > 0);

const leadSegments = [
  { confidence: 0.82, heightPercent: 28, lead: "II", widthPercent: 22, xPercent: 2, yPercent: 34 },
];
const samples = Array.from({ length: DEFAULT_SAMPLING_RATE * 2 }, (_v, index) => Math.sin(index / 40) * 0.6);
const signalObjects = buildDigitalSignalObjects({
  calibration,
  durationSeconds: 2,
  leadSegments,
  leads: [{ lead: "II", metrics: { artifactRejectedSamples: 0, branchResolved: 0, centerlineConfidence: 0.8, crossingResolved: 0, gapRecovered: 2, subPixelError: 0.2, waveConfidence: 0.82 }, samples }],
});
assert.equal(signalObjects.length, 12);
assert.equal(signalObjects[1]?.points.length, samples.length);

const validation = validateDigitizedSignals({ calibration, leadSegments, signalObjects });
assert.ok(validation.score >= 0);
assert.ok(validation.leadDetectionPercent >= 0);

const leads = digitalSignalObjectsToLeads(signalObjects);
const path = buildDigitizedWaveformPath(leads[1]!, 320, 120);
assert.ok(path.startsWith("M"));
const overlayLeads = buildSegmentAlignedDigitizedWaveformLeads(
  {
    aiDiagnosis: {} as never,
    annotations: [],
    calibration,
    durationSeconds: 2,
    interpretationEngine: {} as never,
    leadSegments,
    leads,
    measurementEngine: {} as never,
    measurements: { heartRate: 72, prIntervalMs: 160, qrsDurationMs: 90, qtIntervalMs: 390, qtcBazettMs: 410, rrIntervalMs: 830 },
    quality: { score: 80, warnings: [] },
  },
  800,
  600,
);
assert.ok(overlayLeads.some((item) => item.path.includes("M")));

const benchmark = evaluateDigitizationBenchmark(
  { expectedLeadCount: 1, expectedMinQuality: 40, expectedMinValidation: 20, id: "synthetic", name: "Synthetic" },
  {
    calibration,
    durationSeconds: 2,
    leadSegments,
    leads,
    preprocessing: { adaptiveThresholdApplied: true, autoRotationDegrees: 0, borderDetected: true, contrastEnhanced: false, croppingOptimization: { heightPercent: 95, widthPercent: 95, xPercent: 2, yPercent: 2 }, deskewDegrees: 0, gridEnhanced: true, noiseReduced: false, perspectiveCorrected: false, shadowRemoved: false },
    quality: { score: 72, warnings: [] },
    validation,
  },
  1200,
);
assert.ok(benchmark.leadCount >= 1, "Benchmark should detect at least one digitized lead.");
assert.ok(benchmark.qualityScore >= 40, "Benchmark quality score should meet minimum.");
const summary = summarizeBenchmarkResults([benchmark]);
assert.equal(summary.total, 1);

console.log("ecg-digitization-engine.test.ts: all unit tests passed");
