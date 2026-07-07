import { DirtyRectManager } from "./dirtyRect";
import type { EcgRenderLayerId } from "./types";

/** RequestAnimationFrame loop with double buffering and OffscreenCanvas support */

export type RenderLoopCallbacks = {
  onFrame: (deltaMs: number, dirty: DirtyRectManager) => void;
  onFps?: (fps: number) => void;
};

export class EcgRenderLoop {
  private dirty = new DirtyRectManager();
  private frontCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private backCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private rafId = 0;
  private running = false;
  private lastTs = 0;
  private frameTimes: number[] = [];

  constructor(private callbacks: RenderLoopCallbacks) {}

  supportsOffscreen() {
    return typeof OffscreenCanvas !== "undefined";
  }

  createBuffer(width: number, height: number, dpr: number, offscreen = false) {
    const w = Math.floor(width * dpr);
    const h = Math.floor(height * dpr);
    if (offscreen && this.supportsOffscreen()) {
      return new OffscreenCanvas(w, h);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  attachDisplayCanvas(canvas: HTMLCanvasElement) {
    this.frontCanvas = canvas;
    if (!this.backCanvas) {
      this.backCanvas = this.createBuffer(canvas.width, canvas.height, 1, this.supportsOffscreen());
    }
  }

  markDirty(layer: EcgRenderLayerId, full = true) {
    if (full) this.dirty.markFull(layer);
  }

  start() {
    if (this.running || typeof requestAnimationFrame === "undefined") return;
    this.running = true;
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      if (!this.running) return;
      const delta = ts - this.lastTs;
      this.lastTs = ts;
      this.frameTimes.push(ts);
      if (this.frameTimes.length > 30) this.frameTimes.shift();
      this.callbacks.onFrame(delta, this.dirty);
      this.swapBuffers();
      this.dirty.clear();
      if (this.frameTimes.length >= 2) {
        const elapsed = this.frameTimes[this.frameTimes.length - 1]! - this.frameTimes[0]!;
        const fps = Math.round(((this.frameTimes.length - 1) / elapsed) * 1000);
        this.callbacks.onFps?.(fps);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private swapBuffers() {
    if (!this.frontCanvas || !this.backCanvas) return;
    const frontCtx = this.frontCanvas.getContext("2d");
    const backCtx = this.backCanvas.getContext("2d");
    if (!frontCtx || !backCtx) return;
    const front2d = frontCtx as CanvasRenderingContext2D;
    const back2d = backCtx as CanvasRenderingContext2D;
    front2d.clearRect(0, 0, this.frontCanvas.width, this.frontCanvas.height);
    front2d.drawImage(this.backCanvas as CanvasImageSource, 0, 0);
  }

  getDirtyManager() {
    return this.dirty;
  }
}

export function createRenderLoop(callbacks: RenderLoopCallbacks) {
  return new EcgRenderLoop(callbacks);
}
