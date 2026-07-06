import assert from "node:assert/strict";

import { runRenderBenchmark, syntheticHugeModel } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/benchmark";
import { DirtyRectManager } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/dirtyRect";
import { hitTestLead, toggleLeadSelection } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/interaction";
import { createRenderPipeline, defaultViewport, runPipelineBenchmark } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/pipeline";
import { buildTwelveLeadRegions, sharedTimelineMs } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/twelveLeadLayout";
import { sampleToVectorPoints, vectorPointsToSmoothPath } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/vectorModel";
import { clampRenderZoom, visibleSampleRange, zoomAt } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/viewport";

assert.equal(clampRenderZoom(512), 256);
assert.equal(clampRenderZoom(0.001), 0.01);

const viewport = defaultViewport(1920, 1080);
assert.equal(viewport.containerWidth, 1920);
assert.equal(viewport.zoom, 1);

const zoomed = zoomAt(viewport, 2, 960, 540);
assert.ok(zoomed.zoom >= 2);

const range = visibleSampleRange(10_000, { ...viewport, zoom: 4, signalWidth: 5000 });
assert.ok(range.end > range.start);
assert.ok(range.end <= 10_000);

const regions = buildTwelveLeadRegions(1200, 900);
assert.equal(regions.length, 12);
assert.equal(regions[0]!.lead, "I");

const lead = hitTestLead(regions[0]!.x + 10, regions[0]!.y + 10, regions);
assert.equal(lead, "I");

const selected = toggleLeadSelection({ beatCursorMs: null, crosshair: null, highlightedLead: null, hoverLead: null, rubberBand: null, selectedLeads: [] }, "II");
assert.deepEqual(selected.selectedLeads, ["II"]);

const samples = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 20));
const points = sampleToVectorPoints(
  { durationSeconds: 2, lead: "II", samples, samplingRate: 500 },
  800,
  200,
  1,
  0,
  500,
);
assert.ok(points.length >= 2);
assert.ok(vectorPointsToSmoothPath(points).startsWith("M"));

assert.equal(sharedTimelineMs(500, 500), 1000);

const dirty = new DirtyRectManager();
dirty.markFull("grid");
assert.equal(dirty.isDirty("grid"), true);
dirty.clear("grid");
assert.equal(dirty.isDirty("grid"), false);

const pipeline = createRenderPipeline({ grid: { gain: 10, opacity: 0.75, speed: 25, visible: true }, viewport });
assert.equal(pipeline.backend, "canvas2d");

const huge = syntheticHugeModel(50_000);
assert.equal(huge.leads.length, 12);

const bench = runPipelineBenchmark("canvas2d");
assert.ok(bench.sampleCount > 0);
assert.equal(bench.backend, "canvas2d");

const micro = runRenderBenchmark(() => undefined, 10);
assert.ok(micro.fps >= 0);

console.log("ecg-rendering-engine.test.ts: all Sprint 27 unit tests passed");
