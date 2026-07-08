import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const engineDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer", "rendering-engine");
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredModules = [
  "types.ts",
  "viewport.ts",
  "vectorModel.ts",
  "dirtyRect.ts",
  "twelveLeadLayout.ts",
  "gridRenderer.ts",
  "svgRenderer.ts",
  "canvas2dRenderer.ts",
  "webglRenderer.ts",
  "renderLoop.ts",
  "interaction.ts",
  "metrics.ts",
  "benchmark.ts",
  "pipeline.ts",
  "index.ts",
];

for (const file of requiredModules) {
  assert(fs.existsSync(path.join(engineDir, file)), `Missing Sprint 27 rendering module: ${file}`);
}

assert(fs.existsSync(path.join(viewerDir, "EcgRenderingEngineView.tsx")), "Missing EcgRenderingEngineView component");

const pipeline = fs.readFileSync(pipelinePath, "utf8");
const viewerEngine = fs.readFileSync(path.join(viewerDir, "ecgViewerEngine.ts"), "utf8");
const imageCanvas = fs.readFileSync(path.join(viewerDir, "EcgImageCanvas.tsx"), "utf8");
const component = fs.readFileSync(path.join(viewerDir, "EcgRenderingEngineView.tsx"), "utf8");
const renderPipeline = fs.readFileSync(path.join(engineDir, "pipeline.ts"), "utf8");
const viewport = fs.readFileSync(path.join(engineDir, "viewport.ts"), "utf8");
const benchmark = fs.readFileSync(path.join(engineDir, "benchmark.ts"), "utf8");
const webgl = fs.readFileSync(path.join(engineDir, "webglRenderer.ts"), "utf8");
const renderLoop = fs.readFileSync(path.join(engineDir, "renderLoop.ts"), "utf8");

const capabilityMarkers = [
  "RENDER_ENGINE_LAYER",
  "EcgRenderingEngineView",
  "sprint27-ecg-rendering-engine",
  "sprint27-ecg-render-svg",
  "sprint27-ecg-render-metrics",
  "buildPipelineModel",
  "renderSvgPipeline",
  "DirtyRectManager",
  "OffscreenCanvas",
  "requestAnimationFrame",
  "detectWebGLSupport",
  "buildTwelveLeadRegions",
  "visibleSampleRange",
  "RenderMetricsMonitor",
  "runRenderBenchmark",
  "rubberBand",
  "crosshair",
  "beatCursorMs",
];

for (const marker of capabilityMarkers) {
  const source = [viewerEngine, imageCanvas, component, renderPipeline, viewport, benchmark, webgl, renderLoop].some((file) => file.includes(marker));
  assert(source, `Sprint 27 ECG Rendering Engine missing capability: ${marker}`);
}

assert(pipeline.includes("ecg-rendering-engine.test.ts"), "Integration pipeline must register rendering engine unit test");
assert(pipeline.includes("sprint27-ecg-rendering-engine.integration.ts"), "Integration pipeline must register Sprint 27 integration test");
assert(
  imageCanvas.includes("EcgRenderingEngineView") || imageCanvas.includes("EcgClinicalVisualizationCanvas"),
  "Waveform view must use Sprint 27 rendering engine or Sprint 28 clinical visualization canvas when digitized ECG is available",
);
assert(!renderPipeline.includes("TODO"), "Rendering pipeline must not contain TODO markers");

console.log("sprint27-ecg-rendering-engine.integration.ts: all Sprint 27 checks passed");
