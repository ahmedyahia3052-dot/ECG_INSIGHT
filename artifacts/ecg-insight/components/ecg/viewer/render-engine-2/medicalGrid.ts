import { pixelsPerSmallBox, smallBoxesPerMv } from "../ecgMonitorGridMath";
import type { EcgGridGain, EcgPaperSpeed } from "../types";

import { HOSPITAL_PHOSPHOR_PROFILE } from "./displayProfile";
import { subPixelAlign } from "./hospitalRenderer";

export type MedicalGridMetrics = {
  majorPx: number;
  minorPx: number;
  mvPerPixel: number;
  secondsPerPixel: number;
  paperSpeed: EcgPaperSpeed;
  gain: EcgGridGain;
};

/** Authentic 1 mm minor / 5 mm major ECG paper grid with sub-pixel alignment. */
export function computeMedicalGridMetrics(
  canvasWidth: number,
  paperSpeed: EcgPaperSpeed,
  gain: EcgGridGain,
  secondsVisible = 10,
): MedicalGridMetrics {
  const minorPx = pixelsPerSmallBox(canvasWidth, paperSpeed, secondsVisible);
  const majorPx = minorPx * 5;
  return {
    gain,
    majorPx,
    minorPx,
    mvPerPixel: 1 / (minorPx * smallBoxesPerMv(gain)),
    paperSpeed,
    secondsPerPixel: 1 / (minorPx * paperSpeed),
  };
}

export function drawMedicalEcgGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  paperSpeed: EcgPaperSpeed,
  gain: EcgGridGain,
  visible: boolean,
  zoom: number,
  gridOpacity = 0.96,
  majorColor = HOSPITAL_PHOSPHOR_PROFILE.gridMajor,
  minorColor = HOSPITAL_PHOSPHOR_PROFILE.gridMinor,
) {
  if (!visible || width < 8 || height < 8) return;

  const metrics = computeMedicalGridMetrics(width, paperSpeed, gain);
  const minor = Math.max(4, metrics.minorPx / Math.max(zoom, 0.25));
  const major = minor * 5;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.globalAlpha = gridOpacity;
  ctx.imageSmoothingEnabled = false;

  ctx.strokeStyle = minorColor;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let px = x; px <= x + width; px += minor) {
    const aligned = subPixelAlign(px);
    ctx.moveTo(aligned, y);
    ctx.lineTo(aligned, y + height);
  }
  for (let py = y; py <= y + height; py += minor) {
    const aligned = subPixelAlign(py);
    ctx.moveTo(x, aligned);
    ctx.lineTo(x + width, aligned);
  }
  ctx.stroke();

  ctx.strokeStyle = majorColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let px = x; px <= x + width; px += major) {
    const aligned = subPixelAlign(px);
    ctx.moveTo(aligned, y);
    ctx.lineTo(aligned, y + height);
  }
  for (let py = y; py <= y + height; py += major) {
    const aligned = subPixelAlign(py);
    ctx.moveTo(x, aligned);
    ctx.lineTo(x + width, aligned);
  }
  ctx.stroke();
  ctx.restore();
}

export function sampleToMedicalY(
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
