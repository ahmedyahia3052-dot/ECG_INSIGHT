import type { EcgRenderMetrics } from "./types";
import { MIN_FRAME_MS, TARGET_FPS } from "./types";

/** FPS and GPU acceleration monitors */

export class RenderMetricsMonitor {
  private frameTimes: number[] = [];
  private lastMetrics: EcgRenderMetrics = {
    backend: "canvas2d",
    dirtyRects: 0,
    drawCalls: 0,
    fps: TARGET_FPS,
    frameMs: MIN_FRAME_MS,
    gpuAccelerated: false,
    layersSkipped: 0,
    sampleCount: 0,
    visibleSamples: 0,
  };

  tick(partial: Partial<EcgRenderMetrics>) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.frameTimes.push(now);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const frameMs =
      this.frameTimes.length >= 2
        ? now - this.frameTimes[this.frameTimes.length - 2]!
        : MIN_FRAME_MS;
    const elapsed =
      this.frameTimes.length >= 2 ? now - this.frameTimes[0]! : 0;
    const fps =
      elapsed > 0 && this.frameTimes.length >= 2
        ? Math.round(((this.frameTimes.length - 1) / elapsed) * 1000)
        : TARGET_FPS;
    this.lastMetrics = {
      ...this.lastMetrics,
      ...partial,
      fps,
      frameMs: Number(frameMs.toFixed(2)),
    };
    return this.lastMetrics;
  }

  snapshot() {
    return { ...this.lastMetrics };
  }

  meetsTarget() {
    return this.lastMetrics.fps >= TARGET_FPS - 2;
  }
}

export function detectGpuAcceleration(backend: "canvas2d" | "webgl" | "svg") {
  if (backend === "webgl") return detectWebGLSupport();
  if (backend === "canvas2d" && typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    return !!ctx;
  }
  return false;
}

function detectWebGLSupport() {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return !!(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
}

export function formatMetricsLine(metrics: EcgRenderMetrics) {
  return `FPS ${metrics.fps} · ${metrics.frameMs}ms · ${metrics.backend.toUpperCase()} · GPU ${metrics.gpuAccelerated ? "ON" : "OFF"} · ${metrics.visibleSamples}/${metrics.sampleCount} samples`;
}
