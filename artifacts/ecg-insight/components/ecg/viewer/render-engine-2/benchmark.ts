import type { RenderEngine2BenchmarkResult } from "./types";
import { TARGET_FPS } from "./types";

/** Synthetic RAF benchmark for 60 FPS validation (browser or Node with mock RAF). */
export async function runRenderEngine2Benchmark(
  paintFrame: () => void,
  frameCount = 120,
): Promise<RenderEngine2BenchmarkResult> {
  const times: number[] = [];
  let last = performance.now();

  for (let i = 0; i < frameCount; i += 1) {
    paintFrame();
    const now = performance.now();
    times.push(now - last);
    last = now;
  }

  const fpsSamples = times.map((ms) => (ms > 0 ? 1000 / ms : TARGET_FPS));
  const avgFps = Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length);
  const minFps = Math.round(Math.min(...fpsSamples));

  return {
    avgFps,
    frameCount,
    minFps,
    passed: avgFps >= 55 && minFps >= 45,
  };
}
