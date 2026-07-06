import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { beatMarkerPositions, detectPvcIndices, type MonitorBeatMarker } from "./ecgMonitorBeatMarkers";

export type MonitorCanvasState = {
  alarmTone: boolean;
  brightness: number;
  frozen: boolean;
  gainScale: number;
  isPlaying: boolean;
  offsetIndex: number;
  paperSpeed: 25 | 50;
  playheadMs: number;
  phosphorPersistence: number;
};

const PAD_X = 36;
const PAD_Y = 22;

function drawHospitalGrid(ctx: CanvasRenderingContext2D, width: number, height: number, paperSpeed: 25 | 50) {
  const minor = Math.max(8, Math.round((paperSpeed === 50 ? 14 : 18) * (width / 920)));
  const major = minor * 5;

  ctx.strokeStyle = "rgba(6,78,59,0.35)";
  ctx.lineWidth = 0.45;
  for (let x = 0; x <= width; x += minor) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += minor) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(16,120,88,0.55)";
  ctx.lineWidth = 0.85;
  for (let x = 0; x <= width; x += major) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += major) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
}

function interpolateSamples(samples: number[], targetCount: number) {
  if (samples.length < 2) return samples;
  const output: number[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const t = (i / Math.max(targetCount - 1, 1)) * (samples.length - 1);
    const left = Math.floor(t);
    const right = Math.min(samples.length - 1, left + 1);
    const frac = t - left;
    const value = samples[left]! * (1 - frac) + samples[right]! * frac;
    output.push(value);
  }
  return output;
}

function sampleToPoint(
  sample: number,
  index: number,
  count: number,
  width: number,
  height: number,
  gainScale: number,
) {
  const traceW = width - PAD_X * 2;
  const traceH = height - PAD_Y * 2;
  const x = PAD_X + (index / Math.max(count - 1, 1)) * traceW;
  const y = PAD_Y + traceH / 2 - sample * (traceH * 0.34) * gainScale;
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

export function drawMonitorCanvas(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  width: number,
  height: number,
  state: MonitorCanvasState,
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const fade = Math.min(0.42, Math.max(0.08, state.phosphorPersistence));
  ctx.fillStyle = `rgba(2, 6, 23, ${fade})`;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#000000";
  ctx.globalAlpha = state.brightness;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  drawHospitalGrid(ctx, width, height, state.paperSpeed);

  const traceColor = state.alarmTone ? "#FACC15" : "#22C55E";
  const samples = lead.samples;
  if (samples.length >= 2) {
    const windowSize = Math.min(Math.round(width * 0.75), samples.length);
    const start = Math.max(0, Math.floor(state.offsetIndex) % Math.max(samples.length, 1));
    const slice = samples.slice(start, start + windowSize);
    const smooth = interpolateSamples(slice, Math.max(windowSize * 2, 640));

    const traceW = width - PAD_X * 2;
    const points = smooth.map((sample, index) =>
      sampleToPoint(sample, index, smooth.length, width, height, state.gainScale),
    );

    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = state.alarmTone ? "rgba(250,204,21,0.9)" : "rgba(34,197,94,0.85)";
    ctx.strokeStyle = traceColor;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
        return;
      }
      const prev = points[index - 1]!;
      const cx = (prev.x + point.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + point.y) / 2);
      if (index === points.length - 1) ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(187,247,208,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.restore();

    const markers = beatMarkerPositions(lead, width, height, state.gainScale, state.offsetIndex, windowSize);
    const pvcMarkers = detectPvcIndices(lead)
      .filter((index) => index >= start && index < start + windowSize)
      .map((index) => {
        const local = index - start;
        const x = PAD_X + (local / Math.max(windowSize - 1, 1)) * traceW;
        const y = sampleToPoint(lead.samples[index]!, 0, 1, width, height, state.gainScale).y;
        return { index, kind: "pvc" as const, x, y };
      });
    [...markers, ...pvcMarkers].forEach((marker) => drawBeatMarker(ctx, marker));

    const sweepX = PAD_X + ((state.offsetIndex % windowSize) / windowSize) * traceW;
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
  const status = state.frozen ? "FROZEN" : state.isPlaying ? "LIVE DIGITAL SWEEP" : "PAUSED";
  const durationMs = lead.samplingRate ? (lead.samples.length / lead.samplingRate) * 1000 : lead.durationSeconds * 1000;
  ctx.fillText(`${status} · ${state.paperSpeed} mm/s · ${Math.round(state.playheadMs)} ms / ${Math.round(durationMs)} ms`, 36, height - 12);
}

export function drawMonitorOverview(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  width: number,
  height: number,
  offsetIndex: number,
  gainScale: number,
) {
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
