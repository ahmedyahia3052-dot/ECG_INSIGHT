import { MIN_ACCEPTABLE_FPS, TARGET_FPS, type RenderEngine2Metrics } from "./types";

/** Rolling FPS monitor with dropped-frame detection. */
export class PerformanceMetricsMonitor {
  private frameTimes: number[] = [];
  private droppedFrames = 0;
  private lastFrameTs = 0;

  tick(now: number): RenderEngine2Metrics {
    if (this.lastFrameTs > 0) {
      const delta = now - this.lastFrameTs;
      if (delta > (1000 / MIN_ACCEPTABLE_FPS) * 1.5) {
        this.droppedFrames += 1;
      }
    }
    this.lastFrameTs = now;
    this.frameTimes.push(now);
    if (this.frameTimes.length > 30) this.frameTimes.shift();

    let fps = TARGET_FPS;
    let frameMs = 1000 / TARGET_FPS;
    if (this.frameTimes.length >= 2) {
      const elapsed = this.frameTimes[this.frameTimes.length - 1]! - this.frameTimes[0]!;
      const frames = this.frameTimes.length - 1;
      if (elapsed > 0) {
        fps = Math.round((frames / elapsed) * 1000);
        frameMs = elapsed / frames;
      }
    }

    return {
      droppedFrames: this.droppedFrames,
      fps,
      frameMs: Math.round(frameMs * 10) / 10,
      gpuAccelerated: typeof OffscreenCanvas !== "undefined",
    };
  }

  reset() {
    this.frameTimes = [];
    this.droppedFrames = 0;
    this.lastFrameTs = 0;
  }
}

export function formatRenderEngine2Metrics(metrics: RenderEngine2Metrics) {
  return `RE2 ${metrics.fps} FPS · ${metrics.frameMs}ms/frame · drops ${metrics.droppedFrames}`;
}
