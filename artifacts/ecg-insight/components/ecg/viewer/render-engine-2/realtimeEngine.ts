import type { MonitorCanvasState } from "../ecgMonitorCanvas";
import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { buildMonitorLayoutRegions } from "../monitorLayout";
import { applyCrtPersistenceFade, applyDisplayProfile, resolveDisplayProfile, restoreDisplayProfile, type HospitalCanvasContext } from "./displayProfile";
import { detectGpuAcceleration } from "./hospitalRenderer";
import { createLeadRenderer, renderEngine2GridMetrics } from "./leadRenderer";
import { PerformanceMetricsMonitor } from "./performanceMetrics";
import { RENDER_ENGINE_2_VERSION, type RenderEngine2Metrics } from "./types";

export { RENDER_ENGINE_2_VERSION };

const leadRenderer = createLeadRenderer();

export type RealtimeEngineOptions = {
  onMetrics?: (metrics: RenderEngine2Metrics) => void;
};

/** Circular scroll buffer for continuous waveform without flicker. */
export class CircularScrollBuffer {
  private head = 0;
  private readonly capacity: number;

  constructor(capacity = 8192) {
    this.capacity = capacity;
  }

  push(offset: number) {
    this.head = (offset + 1) % this.capacity;
  }

  read(offset: number) {
    return (this.head + offset) % this.capacity;
  }

  reset() {
    this.head = 0;
  }
}

/** Offscreen double-buffered hospital realtime renderer. */
export class HospitalRealtimeEngine {
  private backCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private metrics = new PerformanceMetricsMonitor();
  private scrollBuffer = new CircularScrollBuffer();
  private rafId = 0;
  private running = false;

  constructor(private options: RealtimeEngineOptions = {}) {}

  supportsOffscreen() {
    return typeof OffscreenCanvas !== "undefined";
  }

  createBackBuffer(width: number, height: number, dpr: number) {
    const w = Math.floor(width * dpr);
    const h = Math.floor(height * dpr);
    if (this.supportsOffscreen()) {
      this.backCanvas = new OffscreenCanvas(w, h);
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      this.backCanvas = canvas;
    }
    return this.backCanvas;
  }

  getScrollBuffer() {
    return this.scrollBuffer;
  }

  paintFrame(
    frontCtx: CanvasRenderingContext2D,
    leads: DigitalEcgLead[],
    width: number,
    height: number,
    state: MonitorCanvasState,
    dpr: number,
  ) {
    const now = performance.now();
    const metrics = this.metrics.tick(now);
    this.options.onMetrics?.(metrics);

    if (!this.backCanvas) {
      this.createBackBuffer(width, height, dpr);
    }

    const backCtx = this.backCanvas!.getContext("2d", { alpha: false, desynchronized: true } as CanvasRenderingContext2DSettings) as HospitalCanvasContext | null;
    if (!backCtx) return;

    backCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isLive = state.isPlaying && !state.frozen && !state.reviewMode;
    if (isLive) {
      applyCrtPersistenceFade(backCtx, width, height, state.phosphorPersistence);
    }

    const profile = resolveDisplayProfile({ brightness: state.brightness }, state.alarmTone);
    applyDisplayProfile(backCtx, profile, width, height);

    backCtx.save();
    backCtx.translate(state.panX, state.panY);
    backCtx.scale(state.zoom, state.zoom);

    const regions = buildMonitorLayoutRegions(width, height, state.layoutMode, state.selectedLead as never, (state.customLeads ?? []) as never);
    const visible = state.isolatedLead ? regions.filter((r) => r.lead === state.isolatedLead) : regions;
    const leadMap = new Map(leads.map((l) => [l.lead, l]));

    leadRenderer.updateSyncClock({
      offsetIndex: state.offsetIndex,
      playheadMs: state.playheadMs,
      sampleRate: 500,
    });

    visible.forEach((region) => {
      const leadData = leadMap.get(region.lead as never);
      if (!leadData) return;
      leadRenderer.renderLead(
        backCtx as CanvasRenderingContext2D,
        leadData,
        region,
        {
          alarmTone: state.alarmTone,
          brightness: state.brightness,
          contrast: profile.contrast,
          gain: state.gainMmPerMv,
          gridVisible: state.gridVisible,
          horizontalScroll: state.horizontalScroll,
          isLive,
          leadCount: visible.length,
          offsetIndex: state.offsetIndex,
          paperSpeed: state.paperSpeed,
          showSweep: state.layoutMode === "single" || visible.length === 1,
          waveform: {
            artifacts: {},
            clinicalSmoothing: true,
            filterEnabled: true,
          },
          zoom: state.zoom,
        },
        dpr,
      );
    });

    backCtx.restore();
    restoreDisplayProfile(backCtx);

    if (state.measureMode) {
      backCtx.strokeStyle = "rgba(250,204,21,0.75)";
      backCtx.setLineDash([4, 4]);
      backCtx.beginPath();
      backCtx.moveTo(width / 2, 0);
      backCtx.lineTo(width / 2, height);
      backCtx.moveTo(0, height / 2);
      backCtx.lineTo(width, height / 2);
      backCtx.stroke();
      backCtx.setLineDash([]);
    }

    const gridMetrics = renderEngine2GridMetrics(width, height, state.paperSpeed, state.gainMmPerMv);
    backCtx.fillStyle = "#64748B";
    backCtx.font = "9px system-ui, sans-serif";
    const status = state.reviewMode ? "REVIEW" : state.frozen ? "FROZEN" : state.isPlaying ? "LIVE SWEEP" : "PAUSED";
    backCtx.fillText(
      `${status} · RE2 ${RENDER_ENGINE_2_VERSION} · ${state.layoutMode.toUpperCase()} · ${state.paperSpeed} mm/s · ${state.gainMmPerMv} mm/mV · grid ${gridMetrics.minorPx.toFixed(1)}px · ${metrics.fps} FPS`,
      8,
      height - 6,
    );

    frontCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    frontCtx.clearRect(0, 0, width, height);
    frontCtx.drawImage(this.backCanvas as CanvasImageSource, 0, 0, width, height);

    this.scrollBuffer.push(state.offsetIndex);
  }

  startLoop(
    frontCanvas: HTMLCanvasElement,
    getState: () => { leads: DigitalEcgLead[]; width: number; height: number; state: MonitorCanvasState; dpr: number },
  ) {
    if (this.running) return;
    this.running = true;

    const tick = () => {
      if (!this.running) return;
      const ctx = frontCanvas.getContext("2d", { alpha: false, desynchronized: true } as CanvasRenderingContext2DSettings);
      if (ctx) {
        const payload = getState();
        this.paintFrame(ctx, payload.leads, payload.width, payload.height, payload.state, payload.dpr);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopLoop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

export function drawRenderEngine2MonitorFrame(
  ctx: CanvasRenderingContext2D,
  leads: DigitalEcgLead[],
  width: number,
  height: number,
  state: MonitorCanvasState,
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const engine = new HospitalRealtimeEngine();
  engine.paintFrame(ctx, leads, width, height, state, dpr);
}

export function isRenderEngine2GpuReady() {
  return detectGpuAcceleration();
}
