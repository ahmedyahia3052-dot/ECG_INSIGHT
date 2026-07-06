import type { EcgBenchmarkResult, EcgRenderBackend, EcgRenderViewport, EcgVectorModel } from "./types";
import { TARGET_FPS } from "./types";

/** Benchmark rendering performance for hospital-grade 60 FPS target */

export type BenchmarkFrameFn = () => void;

export function runRenderBenchmark(
  frameFn: BenchmarkFrameFn,
  frames = 120,
  targetFps = TARGET_FPS,
): Omit<EcgBenchmarkResult, "backend" | "sampleCount"> & { frames: number } {
  const times: number[] = [];
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  for (let i = 0; i < frames; i += 1) {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    frameFn();
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    times.push(t1 - t0);
  }
  const total = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  const avgFrameMs = times.reduce((a, b) => a + b, 0) / Math.max(times.length, 1);
  const fps = Math.round((frames / total) * 1000);
  return {
    avgFrameMs: Number(avgFrameMs.toFixed(2)),
    fps,
    frames,
    passed: fps >= targetFps - 2 && avgFrameMs <= 1000 / targetFps + 2,
    targetFps,
  };
}

export function benchmarkVectorModel(
  renderFrame: (model: EcgVectorModel, viewport: EcgRenderViewport) => void,
  model: EcgVectorModel,
  viewport: EcgRenderViewport,
  backend: EcgRenderBackend,
  frames = 60,
): EcgBenchmarkResult {
  const sampleCount = model.leads.reduce((max, l) => Math.max(max, l.sampleEnd - l.sampleStart), 0);
  const result = runRenderBenchmark(() => renderFrame(model, viewport), frames);
  return {
    avgFrameMs: result.avgFrameMs,
    backend,
    fps: result.fps,
    passed: result.passed,
    sampleCount,
    targetFps: result.targetFps,
  };
}

export function syntheticHugeModel(sampleCount: number, leadCount = 12): EcgVectorModel {
  const leads = Array.from({ length: leadCount }, (_, li) => {
    const points = Array.from({ length: sampleCount }, (_, i) => ({
      t: i,
      v: Math.sin(i / 20 + li) * 0.5,
      x: i,
      y: 100 + Math.sin(i / 20 + li) * 40,
    }));
    return { lead: `L${li + 1}`, points, sampleEnd: sampleCount, sampleStart: 0 };
  });
  return { durationMs: sampleCount * 2, leads, samplingRate: 500, source: "digitized" };
}
