import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { beatMarkerPositions, detectPvcIndices, type MonitorBeatMarker } from "./ecgMonitorBeatMarkers";
import { pixelsPerSmallBox } from "./ecgMonitorGridMath";
import type { MonitorLayoutMode } from "./monitorLayout";
import { buildMonitorLayoutRegions } from "./monitorLayout";
import type { EcgGridGain, EcgPaperSpeed } from "./types";
import type { EcgTwelveLeadRegion } from "./rendering-engine/types";

export type MonitorCanvasState = {
  alarmTone: boolean;
  brightness: number;
  frozen: boolean;
  gainMmPerMv: EcgGridGain;
  gridVisible: boolean;
  isPlaying: boolean;
  layoutMode: MonitorLayoutMode;
  offsetIndex: number;
  panX: number;
  panY: number;
  paperSpeed: EcgPaperSpeed;
  playheadMs: number;
  phosphorPersistence: number;
  reviewMode: boolean;
  selectedLead: string;
  zoom: number;
};

const PAD_X = 28;
const PAD_Y = 16;

function drawClinicalGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  paperSpeed: EcgPaperSpeed,
  gridVisible: boolean,
  gridOpacity: number,
) {
  if (!gridVisible) return;
  const minor = pixelsPerSmallBox(width, paperSpeed, 10);
  const major = minor * 5;
  ctx.save();
  ctx.globalAlpha = gridOpacity;
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.strokeStyle = "rgba(6,78,59,0.38)";
  ctx.lineWidth = 0.45;
  for (let px = x; px <= x + width; px += minor) {
    ctx.moveTo(px + 0.5, y);
    ctx.lineTo(px + 0.5, y + height);
  }
  for (let py = y; py <= y + height; py += minor) {
    ctx.moveTo(x, py + 0.5);
    ctx.lineTo(x + width, py + 0.5);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(16,120,88,0.62)";
  ctx.lineWidth = 0.85;
  for (let px = x; px <= x + width; px += major) {
    ctx.beginPath();
    ctx.moveTo(px + 0.5, y);
    ctx.lineTo(px + 0.5, y + height);
    ctx.stroke();
  }
  for (let py = y; py <= y + height; py += major) {
    ctx.beginPath();
    ctx.moveTo(x, py + 0.5);
    ctx.lineTo(x + width, py + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function interpolateSamples(samples: number[], targetCount: number) {
  if (samples.length < 2) return samples;
  const output: number[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const t = (i / Math.max(targetCount - 1, 1)) * (samples.length - 1);
    const left = Math.floor(t);
    const right = Math.min(samples.length - 1, left + 1);
    const frac = t - left;
    output.push(samples[left]! * (1 - frac) + samples[right]! * frac);
  }
  return output;
}

function gainScaleFromMmPerMv(gainMmPerMv: EcgGridGain) {
  return gainMmPerMv / 10;
}

function sampleToPoint(
  sample: number,
  index: number,
  count: number,
  regionX: number,
  regionY: number,
  regionW: number,
  regionH: number,
  gainScale: number,
) {
  const traceW = regionW - PAD_X * 2;
  const traceH = regionH - PAD_Y * 2;
  const x = regionX + PAD_X + (index / Math.max(count - 1, 1)) * traceW;
  const y = regionY + PAD_Y + traceH / 2 - sample * (traceH * 0.32) * gainScale;
  return { x, y };
}

function drawBeatMarker(ctx: CanvasRenderingContext2D, marker: MonitorBeatMarker) {
  if (marker.kind === "pvc") {
    ctx.fillStyle = "rgba(248,113,113,0.95)";
    ctx.fillRect(marker.x - 4, marker.y - 8, 8, 16);
    return;
  }
  if (marker.kind === "pacing") {
    ctx.strokeStyle = "rgba(250,204,21,0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marker.x, marker.y - 9);
    ctx.lineTo(marker.x, marker.y + 9);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "rgba(250,204,21,0.95)";
  ctx.beginPath();
  ctx.moveTo(marker.x, marker.y - 7);
  ctx.lineTo(marker.x + 5, marker.y);
  ctx.lineTo(marker.x, marker.y + 7);
  ctx.lineTo(marker.x - 5, marker.y);
  ctx.closePath();
  ctx.fill();
}

function drawLeadWaveform(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  region: EcgTwelveLeadRegion,
  state: MonitorCanvasState,
  traceColor: string,
  showSweep: boolean,
) {
  const gainScale = gainScaleFromMmPerMv(state.gainMmPerMv);
  const samples = lead.samples;
  if (samples.length < 2) return;

  const windowSize = Math.min(Math.round(region.width * 0.78), samples.length);
  const start = Math.max(0, Math.floor(state.offsetIndex) % Math.max(samples.length, 1));
  const slice = samples.slice(start, start + windowSize);
  const smooth = interpolateSamples(slice, Math.max(windowSize * 2, 480));
  const traceW = region.width - PAD_X * 2;

  const points = smooth.map((sample, index) =>
    sampleToPoint(sample, index, smooth.length, region.x, region.y, region.width, region.height, gainScale),
  );

  ctx.save();
  ctx.shadowBlur = state.isPlaying && !state.frozen ? 18 : 8;
  ctx.shadowColor = state.alarmTone ? "rgba(250,204,21,0.85)" : "rgba(34,197,94,0.75)";
  ctx.strokeStyle = traceColor;
  ctx.lineWidth = state.layoutMode === "12-lead" ? 1.8 : 2.4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else {
      const prev = points[index - 1]!;
      const cx = (prev.x + point.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + point.y) / 2);
      if (index === points.length - 1) ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();
  ctx.restore();

  if (state.layoutMode === "single" || region.lead === "II") {
    const markers = beatMarkerPositions(lead, region.width, region.height, gainScale, state.offsetIndex, windowSize);
    const pvcMarkers = detectPvcIndices(lead)
      .filter((index) => index >= start && index < start + windowSize)
      .map((index) => {
        const local = index - start;
        const x = region.x + PAD_X + (local / Math.max(windowSize - 1, 1)) * traceW;
        const y = sampleToPoint(lead.samples[index]!, 0, 1, region.x, region.y, region.width, region.height, gainScale).y;
        return { index, kind: "pvc" as const, x, y };
      });
    [...markers.map((m) => ({ ...m, x: m.x + region.x, y: m.y + region.y })), ...pvcMarkers].forEach((marker) =>
      drawBeatMarker(ctx, marker),
    );
  }

  if (showSweep) {
    const sweepX = region.x + PAD_X + ((state.offsetIndex % windowSize) / windowSize) * traceW;
    ctx.strokeStyle = "rgba(220,252,231,0.88)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sweepX, region.y + 6);
    ctx.lineTo(sweepX, region.y + region.height - 6);
    ctx.stroke();
    ctx.fillStyle = state.frozen || state.reviewMode ? "#FACC15" : state.alarmTone ? "#F87171" : "#22C55E";
    ctx.beginPath();
    ctx.arc(sweepX, region.y + 28, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#86EFAC";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.fillText(region.lead, region.x + 8, region.y + 14);
}

export function drawMonitorCanvas(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  width: number,
  height: number,
  state: MonitorCanvasState,
) {
  drawMultiLeadMonitorCanvas(ctx, [lead], width, height, state);
}

export function drawMultiLeadMonitorCanvas(
  ctx: CanvasRenderingContext2D,
  leads: DigitalEcgLead[],
  width: number,
  height: number,
  state: MonitorCanvasState,
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const fade = state.isPlaying && !state.frozen && !state.reviewMode
    ? Math.min(0.38, Math.max(0.1, state.phosphorPersistence))
    : 1;
  ctx.fillStyle = `rgba(2, 6, 23, ${fade})`;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#000000";
  ctx.globalAlpha = state.brightness;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  const regions = buildMonitorLayoutRegions(width, height, state.layoutMode, state.selectedLead as never);
  const leadMap = new Map(leads.map((l) => [l.lead, l]));
  const traceColor = state.alarmTone ? "#FACC15" : "#22C55E";

  regions.forEach((region) => {
    drawClinicalGrid(ctx, region.x, region.y, region.width, region.height, state.paperSpeed, state.gridVisible, 0.85);
    const leadData = leadMap.get(region.lead as never);
    if (leadData) {
      drawLeadWaveform(ctx, leadData, region, state, traceColor, state.layoutMode === "single" || regions.length === 1);
    }
  });

  ctx.restore();

  ctx.fillStyle = "#86EFAC";
  ctx.font = "bold 11px system-ui, sans-serif";
  const status = state.reviewMode ? "REVIEW" : state.frozen ? "FROZEN" : state.isPlaying ? "LIVE SWEEP" : "PAUSED";
  const primary = leadMap.get(state.selectedLead) ?? leads[0];
  const durationMs = primary?.samplingRate
    ? (primary.samples.length / primary.samplingRate) * 1000
    : (primary?.durationSeconds ?? 0) * 1000;
  ctx.fillText(
    `${status} · ${state.layoutMode.toUpperCase()} · ${state.paperSpeed} mm/s · ${state.gainMmPerMv} mm/mV · ${Math.round(state.playheadMs)} / ${Math.round(durationMs)} ms`,
    12,
    height - 10,
  );
}

export function drawRhythmStripCanvas(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  width: number,
  height: number,
  state: Pick<MonitorCanvasState, "offsetIndex" | "gainMmPerMv" | "paperSpeed" | "gridVisible" | "frozen" | "isPlaying" | "alarmTone" | "reviewMode">,
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#010409";
  ctx.fillRect(0, 0, width, height);

  const region: EcgTwelveLeadRegion = { x: 0, y: 0, width, height, lead: lead.lead };
  drawClinicalGrid(ctx, 0, 0, width, height, state.paperSpeed, state.gridVisible, 0.75);
  drawLeadWaveform(
    ctx,
    lead,
    region,
    {
      ...state,
      brightness: 1,
      layoutMode: "single",
      panX: 0,
      panY: 0,
      phosphorPersistence: 0.18,
      playheadMs: 0,
      selectedLead: lead.lead,
      zoom: 1,
    },
    state.alarmTone ? "#FACC15" : "#4ADE80",
    true,
  );

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.fillText(`RHYTHM STRIP · LEAD ${lead.lead}`, 10, 12);
}

export function drawMonitorOverview(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  width: number,
  height: number,
  offsetIndex: number,
  gainMmPerMv: EcgGridGain,
) {
  const gainScale = gainScaleFromMmPerMv(gainMmPerMv);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, width, height);

  const samples = lead.samples;
  if (samples.length < 2) return;

  ctx.strokeStyle = "#22C55E";
  ctx.lineWidth = 1;
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const x = (index / Math.max(samples.length - 1, 1)) * width;
    const y = height / 2 - sample * (height * 0.35) * gainScale;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const viewportRatio = Math.min(0.35, 520 / samples.length);
  const center = (offsetIndex % samples.length) / samples.length;
  const left = Math.max(0, center - viewportRatio / 2);
  ctx.fillStyle = "rgba(34,197,94,0.18)";
  ctx.fillRect(left * width, 0, viewportRatio * width, height);
  ctx.strokeStyle = "#86EFAC";
  ctx.strokeRect(left * width + 0.5, 0.5, viewportRatio * width - 1, height - 1);
}
