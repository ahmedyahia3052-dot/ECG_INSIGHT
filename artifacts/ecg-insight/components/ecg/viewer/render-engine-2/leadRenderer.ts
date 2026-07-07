import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { buildClinicalMarkers, drawClinicalMarker } from "../live-monitor-v2/ecgClinicalMarkers";
import { pixelsPerSmallBox } from "../ecgMonitorGridMath";
import type { EcgGridGain } from "../types";
import type { EcgTwelveLeadRegion } from "../rendering-engine/types";

import { resolveDisplayProfile } from "./displayProfile";
import { dynamicTraceStrokeWidth, drawPhosphorTrace } from "./hospitalRenderer";
import { computeMedicalGridMetrics, drawMedicalEcgGrid, sampleToMedicalY } from "./medicalGrid";
import type { RenderEngine2LeadSyncClock, RenderEngine2WaveformSettings } from "./types";
import { processWaveformSamples, resampleSubPixel } from "./waveformProcessor";

export type LeadRenderInput = {
  alarmTone: boolean;
  brightness: number;
  contrast: number;
  gain: EcgGridGain;
  gridVisible: boolean;
  horizontalScroll: number;
  isLive: boolean;
  leadCount: number;
  offsetIndex: number;
  paperSpeed: import("../types").EcgPaperSpeed;
  showSweep: boolean;
  waveform: RenderEngine2WaveformSettings;
  zoom: number;
};

const PAD_X = 8;

export class LeadRenderer {
  private syncClock: RenderEngine2LeadSyncClock = { offsetIndex: 0, playheadMs: 0, sampleRate: 500 };

  /** Shared clock ensures all leads stay synchronized — no timing drift. */
  updateSyncClock(clock: RenderEngine2LeadSyncClock) {
    this.syncClock = clock;
  }

  renderLead(
    ctx: CanvasRenderingContext2D,
    lead: DigitalEcgLead,
    region: EcgTwelveLeadRegion,
    input: LeadRenderInput,
    dpr: number,
  ) {
    drawMedicalEcgGrid(
      ctx,
      region.x,
      region.y,
      region.width,
      region.height,
      input.paperSpeed,
      input.gain,
      input.gridVisible,
      input.zoom,
      0.97,
    );

    const samples = lead.samples;
    if (samples.length < 2) return;

    const minorPx = pixelsPerSmallBox(region.width, input.paperSpeed, 10);
    const scrollPx = input.horizontalScroll * minorPx;
    const windowSize = Math.min(Math.round(region.width * 1.1), samples.length);
    const start = Math.max(
      0,
      Math.floor(this.syncClock.offsetIndex + scrollPx / Math.max(minorPx, 1)) % Math.max(samples.length, 1),
    );
    const slice = samples.slice(start, start + windowSize);
    const processed = processWaveformSamples(slice, input.waveform, start + input.offsetIndex);
    const smooth = resampleSubPixel(processed, Math.max(windowSize * 2, 640));
    const traceW = region.width - PAD_X * 2;
    const profile = resolveDisplayProfile({ brightness: input.brightness, contrast: input.contrast }, input.alarmTone);

    const points = smooth.map((sample, index) => ({
      x: region.x + PAD_X + (index / Math.max(smooth.length - 1, 1)) * traceW,
      y: sampleToMedicalY(sample, region.y, region.height, input.gain, minorPx),
    }));

    drawPhosphorTrace(ctx, points, profile, dynamicTraceStrokeWidth(input.leadCount, input.zoom, dpr), input.isLive);

    const gainScale = input.gain / 10;
    const markers = buildClinicalMarkers(
      lead,
      region.x,
      region.y,
      region.width,
      region.height,
      gainScale,
      start,
      windowSize,
      PAD_X,
      4,
    );
    markers.forEach((marker) => drawClinicalMarker(ctx, marker));

    if (input.showSweep) {
      this.drawSweepLine(ctx, region, traceW, windowSize, input);
    }

    ctx.fillStyle = "#86EFAC";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.fillText(region.lead, region.x + 6, region.y + 11);
  }

  private drawSweepLine(
    ctx: CanvasRenderingContext2D,
    region: EcgTwelveLeadRegion,
    traceW: number,
    windowSize: number,
    input: LeadRenderInput,
  ) {
    const sweepX = region.x + PAD_X + ((this.syncClock.offsetIndex % windowSize) / windowSize) * traceW;
    ctx.strokeStyle = "rgba(220,252,231,0.88)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(sweepX, region.y + 4);
    ctx.lineTo(sweepX, region.y + region.height - 4);
    ctx.stroke();
    ctx.fillStyle = input.alarmTone ? "#F87171" : "#22C55E";
    ctx.beginPath();
    ctx.arc(sweepX, region.y + 18, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createLeadRenderer() {
  return new LeadRenderer();
}

export function renderEngine2GridMetrics(width: number, height: number, paperSpeed: import("../types").EcgPaperSpeed, gain: EcgGridGain) {
  return computeMedicalGridMetrics(width, paperSpeed, gain);
}
