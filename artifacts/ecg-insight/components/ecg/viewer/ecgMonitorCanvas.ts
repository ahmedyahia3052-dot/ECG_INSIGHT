import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { beatMarkerPositions } from "./ecgMonitorBeatMarkers";
import { msToSampleIndex } from "./ecgMonitorPath";

export type MonitorCanvasState = {
  alarmTone: boolean;
  frozen: boolean;
  gainScale: number;
  isPlaying: boolean;
  offsetIndex: number;
  playheadMs: number;
};

export function drawMonitorCanvas(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  width: number,
  height: number,
  state: MonitorCanvasState,
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#064E3B";
  ctx.lineWidth = 0.5;
  const gridStep = Math.max(24, Math.round(width / 20));
  for (let x = 0; x <= width; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const traceColor = state.alarmTone ? "#FACC15" : "#22C55E";
  const samples = lead.samples;
  if (samples.length >= 2) {
    const windowSize = Math.min(520, samples.length);
    const start = Math.max(0, Math.floor(state.offsetIndex) % Math.max(samples.length, 1));
    const slice = samples.slice(start, start + windowSize);
    const padX = 30;
    const padY = 18;
    const traceW = width - padX * 2;
    const traceH = height - padY * 2;

    ctx.shadowBlur = 14;
    ctx.shadowColor = state.alarmTone ? "rgba(250,204,21,0.85)" : "rgba(34,197,94,0.75)";
    ctx.beginPath();
    ctx.strokeStyle = traceColor;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    slice.forEach((sample, index) => {
      const x = padX + (index / Math.max(slice.length - 1, 1)) * traceW;
      const y = padY + traceH / 2 - sample * (traceH * 0.32) * state.gainScale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    const markers = beatMarkerPositions(lead, width, height, state.gainScale, state.offsetIndex);
    markers.forEach((marker) => {
      ctx.fillStyle = "rgba(250,204,21,0.95)";
      ctx.beginPath();
      ctx.moveTo(marker.x, marker.y - 7);
      ctx.lineTo(marker.x + 5, marker.y);
      ctx.lineTo(marker.x, marker.y + 7);
      ctx.lineTo(marker.x - 5, marker.y);
      ctx.closePath();
      ctx.fill();
    });

    const sweepX = padX + ((state.offsetIndex % 520) / 520) * traceW;
    ctx.strokeStyle = "rgba(220,252,231,0.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sweepX, 8);
    ctx.lineTo(sweepX, height - 8);
    ctx.stroke();

    ctx.fillStyle = state.frozen ? "#FACC15" : state.alarmTone ? "#F87171" : "#22C55E";
    ctx.beginPath();
    ctx.arc(sweepX, 36, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#86EFAC";
  ctx.font = "bold 12px system-ui, sans-serif";
  const status = state.frozen ? "FROZEN" : state.isPlaying ? "LIVE SWEEP" : "PAUSED";
  const durationMs = lead.samplingRate ? (lead.samples.length / lead.samplingRate) * 1000 : lead.durationSeconds * 1000;
  ctx.fillText(`${status} · ${Math.round(state.playheadMs)} ms / ${Math.round(durationMs)} ms`, 32, height - 10);
}

export function sampleIndexFromPlayback(lead: DigitalEcgLead, playheadMs: number) {
  return msToSampleIndex(lead, playheadMs);
}
