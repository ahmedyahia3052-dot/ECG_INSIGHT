import { pixelsPerSmallBox, smallBoxesPerMv } from "../ecgMonitorGridMath";
import type { EcgGridGain, EcgPaperSpeed } from "../types";

/** Hospital bedside monitor ECG paper colors (Philips/GE-style green phosphor grid). */
export const HOSPITAL_GRID = {
  background: "#000000",
  major: "rgba(34,197,94,0.82)",
  minor: "rgba(16,120,88,0.52)",
} as const;

export type HospitalGridMetrics = {
  majorPx: number;
  minorPx: number;
  mvPerPixel: number;
  secondsPerPixel: number;
};

export function computeHospitalGridMetrics(
  canvasWidth: number,
  canvasHeight: number,
  paperSpeed: EcgPaperSpeed,
  gain: EcgGridGain,
  secondsVisible = 10,
): HospitalGridMetrics {
  const minorPx = pixelsPerSmallBox(canvasWidth, paperSpeed, secondsVisible);
  const majorPx = minorPx * 5;
  const mvPerPixel = 1 / (minorPx * smallBoxesPerMv(gain));
  const secondsPerPixel = 1 / (minorPx * paperSpeed);
  return { majorPx, minorPx, mvPerPixel, secondsPerPixel };
}

/**
 * Draw clinical 1 mm / 5 mm ECG paper grid.
 * Grid lines stay sharp under zoom via 0.5px alignment and transform-aware spacing.
 */
export function drawHospitalEcgGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  paperSpeed: EcgPaperSpeed,
  gain: EcgGridGain,
  gridVisible: boolean,
  zoom: number,
  gridOpacity = 0.96,
) {
  if (!gridVisible || width < 8 || height < 8) return;

  const metrics = computeHospitalGridMetrics(width, height, paperSpeed, gain);
  const minor = Math.max(4, metrics.minorPx / Math.max(zoom, 0.25));
  const major = minor * 5;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.globalAlpha = gridOpacity;

  ctx.strokeStyle = HOSPITAL_GRID.minor;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let px = x; px <= x + width; px += minor) {
    const aligned = Math.round(px) + 0.5;
    ctx.moveTo(aligned, y);
    ctx.lineTo(aligned, y + height);
  }
  for (let py = y; py <= y + height; py += minor) {
    const aligned = Math.round(py) + 0.5;
    ctx.moveTo(x, aligned);
    ctx.lineTo(x + width, aligned);
  }
  ctx.stroke();

  ctx.strokeStyle = HOSPITAL_GRID.major;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let px = x; px <= x + width; px += major) {
    const aligned = Math.round(px) + 0.5;
    ctx.moveTo(aligned, y);
    ctx.lineTo(aligned, y + height);
  }
  for (let py = y; py <= y + height; py += major) {
    const aligned = Math.round(py) + 0.5;
    ctx.moveTo(x, aligned);
    ctx.lineTo(x + width, aligned);
  }
  ctx.stroke();
  ctx.restore();
}

/** Convert normalized sample amplitude to canvas Y using mm/mV clinical scaling. */
export function sampleToClinicalY(
  sample: number,
  regionY: number,
  regionHeight: number,
  gain: EcgGridGain,
  minorPx: number,
  baseline = 0,
): number {
  const centerY = regionY + regionHeight / 2;
  const pixelsPerMv = minorPx * smallBoxesPerMv(gain);
  return centerY - (sample - baseline) * pixelsPerMv;
}

export function adaptiveTraceStrokeWidth(layoutLeadCount: number, zoom: number): number {
  const base = layoutLeadCount >= 12 ? 1.35 : layoutLeadCount >= 6 ? 1.65 : 2.1;
  return Math.max(1, Math.min(3.2, base / Math.sqrt(Math.max(zoom, 0.5))));
}
