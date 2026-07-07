import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { buildClinicalMarkers, drawClinicalMarker } from "./live-monitor-v2/ecgClinicalMarkers";
import { adaptiveTraceStrokeWidth, computeHospitalGridMetrics, drawHospitalEcgGrid, sampleToClinicalY } from "./live-monitor-v2/ecgHospitalGrid";
import { pixelsPerSmallBox } from "./ecgMonitorGridMath";
import type { MonitorLayoutMode } from "./monitorLayout";
import { buildMonitorLayoutRegions } from "./monitorLayout";
import type { EcgGridGain, EcgPaperSpeed } from "./types";
import type { EcgTwelveLeadRegion } from "./rendering-engine/types";

export type MonitorCanvasState = {
  alarmTone: boolean;
  brightness: number;
  customLeads?: string[];
  frozen: boolean;
  gainMmPerMv: EcgGridGain;
  gridVisible: boolean;
  highlightedLead?: string | null;
  horizontalScroll: number;
  isPlaying: boolean;
  isolatedLead?: string | null;
  layoutMode: MonitorLayoutMode;
  measureMode?: boolean;
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

const PAD_X = 8;
const PAD_Y = 4;

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

function drawLeadWaveform(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  region: EcgTwelveLeadRegion,
  state: MonitorCanvasState,
  traceColor: string,
  showSweep: boolean,
  regionCount: number,
) {
  const gainScale = gainScaleFromMmPerMv(state.gainMmPerMv);
  const samples = lead.samples;
  if (samples.length < 2) return;

  const minorPx = pixelsPerSmallBox(region.width, state.paperSpeed, 10);
  const scrollPx = state.horizontalScroll * minorPx;
  const windowSize = Math.min(Math.round(region.width * 1.1), samples.length);
  const start = Math.max(0, Math.floor(state.offsetIndex + scrollPx / Math.max(minorPx, 1)) % Math.max(samples.length, 1));
  const slice = samples.slice(start, start + windowSize);
  const smooth = interpolateSamples(slice, Math.max(windowSize * 2, 640));
  const traceW = region.width - PAD_X * 2;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = traceColor;
  ctx.lineWidth = adaptiveTraceStrokeWidth(regionCount, state.zoom);
  ctx.shadowBlur = state.isPlaying && !state.frozen ? 14 : 6;
  ctx.shadowColor = state.alarmTone ? "rgba(250,204,21,0.85)" : "rgba(34,197,94,0.75)";

  ctx.beginPath();
  smooth.forEach((sample, index) => {
    const x = region.x + PAD_X + (index / Math.max(smooth.length - 1, 1)) * traceW;
    const y = sampleToClinicalY(sample, region.y, region.height, state.gainMmPerMv, minorPx);
    if (index === 0) ctx.moveTo(x, y);
    else {
      const prevX = region.x + PAD_X + ((index - 1) / Math.max(smooth.length - 1, 1)) * traceW;
      const prevY = sampleToClinicalY(smooth[index - 1]!, region.y, region.height, state.gainMmPerMv, minorPx);
      const cx = (prevX + x) / 2;
      ctx.quadraticCurveTo(prevX, prevY, cx, (prevY + y) / 2);
      if (index === smooth.length - 1) ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  ctx.restore();

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
    PAD_Y,
  );
  markers.forEach((marker) => drawClinicalMarker(ctx, marker));

  if (showSweep) {
    const sweepX = region.x + PAD_X + ((state.offsetIndex % windowSize) / windowSize) * traceW;
    ctx.strokeStyle = "rgba(220,252,231,0.88)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(sweepX, region.y + 4);
    ctx.lineTo(sweepX, region.y + region.height - 4);
    ctx.stroke();
    ctx.fillStyle = state.frozen || state.reviewMode ? "#FACC15" : state.alarmTone ? "#F87171" : "#22C55E";
    ctx.beginPath();
    ctx.arc(sweepX, region.y + 18, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const isHighlighted = state.highlightedLead === region.lead || state.isolatedLead === region.lead;
  if (isHighlighted) {
    ctx.strokeStyle = "rgba(250,204,21,0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(region.x + 0.5, region.y + 0.5, region.width - 1, region.height - 1);
  }

  ctx.fillStyle = isHighlighted ? "#FACC15" : "#86EFAC";
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.fillText(region.lead, region.x + 6, region.y + 11);
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
    ? Math.min(0.32, Math.max(0.08, state.phosphorPersistence))
    : 1;
  ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#000000";
  ctx.globalAlpha = state.brightness;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  const regions = buildMonitorLayoutRegions(
    width,
    height,
    state.layoutMode,
    state.selectedLead as never,
    (state.customLeads ?? []) as never,
  );
  const visibleRegions = state.isolatedLead
    ? regions.filter((region) => region.lead === state.isolatedLead)
    : regions;

  const leadMap = new Map(leads.map((l) => [l.lead, l]));
  const traceColor = state.alarmTone ? "#FACC15" : "#22C55E";

  visibleRegions.forEach((region) => {
    drawHospitalEcgGrid(ctx, region.x, region.y, region.width, region.height, state.paperSpeed, state.gainMmPerMv, state.gridVisible, state.zoom, 0.97);
    const leadData = leadMap.get(region.lead as never);
    if (leadData) {
      drawLeadWaveform(
        ctx,
        leadData,
        region,
        state,
        traceColor,
        state.layoutMode === "single" || visibleRegions.length === 1,
        visibleRegions.length,
      );
    }
  });

  if (state.measureMode) {
    ctx.strokeStyle = "rgba(250,204,21,0.75)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();

  const gridMetrics = computeHospitalGridMetrics(width, height, state.paperSpeed, state.gainMmPerMv);
  ctx.fillStyle = "#64748B";
  ctx.font = "9px system-ui, sans-serif";
  const status = state.reviewMode ? "REVIEW" : state.frozen ? "FROZEN" : state.isPlaying ? "LIVE SWEEP" : "PAUSED";
  ctx.fillText(
    `${status} · ${state.layoutMode.toUpperCase()} · ${state.paperSpeed} mm/s · ${state.gainMmPerMv} mm/mV · grid ${gridMetrics.minorPx.toFixed(1)}px`,
    8,
    height - 6,
  );
}

export function drawRhythmStripCanvas(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  width: number,
  height: number,
  state: Pick<MonitorCanvasState, "offsetIndex" | "gainMmPerMv" | "paperSpeed" | "gridVisible" | "frozen" | "isPlaying" | "alarmTone" | "reviewMode" | "zoom">,
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const region: EcgTwelveLeadRegion = { x: 0, y: 0, width, height, lead: lead.lead };
  drawHospitalEcgGrid(ctx, 0, 0, width, height, state.paperSpeed, state.gainMmPerMv, state.gridVisible, state.zoom ?? 1, 0.92);
  drawLeadWaveform(
    ctx,
    lead,
    region,
    {
      ...state,
      brightness: 1,
      customLeads: [],
      horizontalScroll: 0,
      layoutMode: "single",
      panX: 0,
      panY: 0,
      phosphorPersistence: 0.16,
      playheadMs: 0,
      selectedLead: lead.lead,
      zoom: state.zoom ?? 1,
    },
    state.alarmTone ? "#FACC15" : "#4ADE80",
    true,
    1,
  );

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.fillText(`RHYTHM STRIP · LEAD ${lead.lead}`, 8, 10);
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
    const y = height / 2 - sample * (height * 0.42) * gainScale;
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
