import assert from "node:assert/strict";

import { runRenderEngine2Benchmark } from "../artifacts/ecg-insight/components/ecg/viewer/render-engine-2/benchmark";
import { dynamicTraceStrokeWidth, subPixelAlign } from "../artifacts/ecg-insight/components/ecg/viewer/render-engine-2/hospitalRenderer";
import { computeMedicalGridMetrics } from "../artifacts/ecg-insight/components/ecg/viewer/render-engine-2/medicalGrid";
import { CircularScrollBuffer } from "../artifacts/ecg-insight/components/ecg/viewer/render-engine-2/realtimeEngine";
import { TARGET_FPS } from "../artifacts/ecg-insight/components/ecg/viewer/render-engine-2/types";
import { processWaveformSamples, resampleSubPixel } from "../artifacts/ecg-insight/components/ecg/viewer/render-engine-2/waveformProcessor";

assert.equal(subPixelAlign(10), 10.5);

const grid25 = computeMedicalGridMetrics(920, 25, 10);
assert.ok(grid25.minorPx > 4);
assert.ok(Math.abs(grid25.majorPx - grid25.minorPx * 5) < 0.01);
assert.equal(grid25.paperSpeed, 25);
assert.equal(grid25.gain, 10);

const grid50 = computeMedicalGridMetrics(920, 50, 20);
assert.equal(grid50.paperSpeed, 50);
assert.equal(grid50.gain, 20);

const resampled = resampleSubPixel([0, 0.5, 1, 0.5, 0], 20);
assert.equal(resampled.length, 20);

const filtered = processWaveformSamples([0, 1, -1, 1, -1, 0], { artifacts: {}, clinicalSmoothing: true, filterEnabled: true }, 0);
assert.equal(filtered.length, 6);

assert.ok(dynamicTraceStrokeWidth(12, 1, 2) < dynamicTraceStrokeWidth(3, 1, 2));

const buffer = new CircularScrollBuffer(128);
for (let i = 0; i < 200; i += 1) buffer.push(i);
assert.ok(buffer.read(0) >= 0);
assert.ok(buffer.read(0) < 128);

const benchmark = await runRenderEngine2Benchmark(() => undefined, 60);
assert.equal(benchmark.frameCount, 60);
assert.ok(benchmark.avgFps >= TARGET_FPS - 5);
assert.equal(benchmark.passed, true);

console.log("render-engine-2.test.ts: all Render Engine 2.0 unit tests passed");
