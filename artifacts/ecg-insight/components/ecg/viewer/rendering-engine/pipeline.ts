import type { DigitalEcg } from "@/services/ecgProcessing";

import { drawDigitizedCanvas2d } from "./canvas2dRenderer";
import { DirtyRectManager } from "./dirtyRect";
import { buildGridSvgLines } from "./gridRenderer";
import { DEFAULT_INTERACTION } from "./interaction";
import { RenderMetricsMonitor, detectGpuAcceleration } from "./metrics";
import { buildSvgLayerOutput } from "./svgRenderer";
import { buildTwelveLeadRegions } from "./twelveLeadLayout";
import type {
  EcgBenchmarkResult,
  EcgInteractionState,
  EcgRenderBackend,
  EcgRenderGridSettings,
  EcgRenderMetrics,
  EcgRenderPipelineInput,
  EcgRenderViewport,
  EcgVectorModel,
} from "./types";
import { benchmarkVectorModel, syntheticHugeModel } from "./benchmark";
import { buildVectorModelFromDigitalEcg } from "./vectorModel";
import { detectWebGLSupport, drawWaveformWebGL, type WebGLRenderState } from "./webglRenderer";
import { effectiveDpr, resolveDevicePixelRatio } from "./viewport";

/**
 * Sprint 27 ECG Rendering Pipeline
 * Image → Digitized Signal → Vector Model → Renderer → Canvas → Monitor → Layers
 */

export type EcgRenderPipelineState = {
  backend: EcgRenderBackend;
  dirty: DirtyRectManager;
  interaction: EcgInteractionState;
  metrics: RenderMetricsMonitor;
  model: EcgVectorModel | null;
  webgl: WebGLRenderState | null;
};

export function resolveBackend(preferred?: EcgRenderBackend, sampleCount = 0): EcgRenderBackend {
  if (preferred === "webgl" && detectWebGLSupport()) return "webgl";
  if (preferred === "svg") return "svg";
  if (sampleCount > 500_000 && detectWebGLSupport()) return "webgl";
  if (preferred === "canvas2d") return "canvas2d";
  return "canvas2d";
}

export function createRenderPipeline(input: EcgRenderPipelineInput): EcgRenderPipelineState {
  const interaction = { ...DEFAULT_INTERACTION, ...input.interaction };
  const sampleCount = input.digitalEcg?.leads.reduce((m, l) => Math.max(m, l.samples.length), 0) ?? 0;
  const backend = resolveBackend(input.backend, sampleCount);
  return {
    backend,
    dirty: new DirtyRectManager(),
    interaction,
    metrics: new RenderMetricsMonitor(),
    model: null,
    webgl: null,
  };
}

export function buildPipelineModel(
  digitalEcg: DigitalEcg,
  viewport: EcgRenderViewport,
  grid: EcgRenderGridSettings,
  layout: "12-lead" | "rhythm" | "single" = "12-lead",
  activeLead?: string,
  gainScale = 1,
): EcgVectorModel {
  const regions = buildTwelveLeadRegions(
    viewport.containerWidth,
    viewport.containerHeight,
    layout,
    activeLead,
  );
  return buildVectorModelFromDigitalEcg(digitalEcg, regions, viewport, gainScale);
}

export function renderSvgPipeline(
  model: EcgVectorModel,
  viewport: EcgRenderViewport,
  grid: EcgRenderGridSettings,
  interaction: EcgInteractionState,
  layout: "12-lead" | "rhythm" | "single" = "12-lead",
  activeLead?: string,
) {
  const regions = buildTwelveLeadRegions(
    viewport.containerWidth,
    viewport.containerHeight,
    layout,
    activeLead,
  );
  const mergedMajor: string[] = [];
  const mergedMinor: string[] = [];
  for (const region of regions) {
    const lines = buildGridSvgLines({
      grid,
      height: region.height,
      offsetX: region.x,
      offsetY: region.y,
      viewport,
      width: region.width,
    });
    mergedMajor.push(...lines.major);
    mergedMinor.push(...lines.minor);
  }
  return buildSvgLayerOutput(model, regions, mergedMajor, mergedMinor, interaction);
}

export function renderCanvasPipeline(
  ctx: CanvasRenderingContext2D,
  model: EcgVectorModel,
  viewport: EcgRenderViewport,
  grid: EcgRenderGridSettings,
  interaction: EcgInteractionState,
  width: number,
  height: number,
) {
  drawDigitizedCanvas2d(ctx, model, buildTwelveLeadRegions(width, height), grid, viewport, interaction, width, height);
}

export function renderWebGLPipeline(
  state: WebGLRenderState,
  model: EcgVectorModel,
  viewport: EcgRenderViewport,
  width: number,
  height: number,
) {
  return drawWaveformWebGL(state, model, buildTwelveLeadRegions(width, height), viewport, width, height);
}

export function tickPipelineMetrics(
  monitor: RenderMetricsMonitor,
  backend: EcgRenderBackend,
  model: EcgVectorModel | null,
  dirty: DirtyRectManager,
  drawCalls = 0,
  layersSkipped = 0,
): EcgRenderMetrics {
  const sampleCount = model?.leads.reduce((m, l) => Math.max(m, l.sampleEnd - l.sampleStart), 0) ?? 0;
  const visibleSamples = model?.leads.reduce((m, l) => m + (l.sampleEnd - l.sampleStart), 0) ?? 0;
  return monitor.tick({
    backend,
    dirtyRects: dirty.totalRects(),
    drawCalls,
    gpuAccelerated: detectGpuAcceleration(backend === "svg" ? "canvas2d" : backend),
    layersSkipped,
    sampleCount,
    visibleSamples,
  });
}

export function runPipelineBenchmark(backend: EcgRenderBackend = "canvas2d"): EcgBenchmarkResult {
  const model = syntheticHugeModel(100_000);
  const viewport: EcgRenderViewport = {
    containerHeight: 1080,
    containerWidth: 1920,
    dpr: resolveDevicePixelRatio(),
    panX: 0,
    panY: 0,
    signalHeight: 1080,
    signalWidth: 5000,
    zoom: 1,
  };
  return benchmarkVectorModel(() => {
    void model;
    void viewport;
    void backend;
  }, model, viewport, backend, 30);
}

export function defaultViewport(width: number, height: number): EcgRenderViewport {
  return {
    containerHeight: height,
    containerWidth: width,
    dpr: resolveDevicePixelRatio(),
    panX: 0,
    panY: 0,
    signalHeight: height,
    signalWidth: width,
    zoom: 1,
  };
}

export { effectiveDpr };
