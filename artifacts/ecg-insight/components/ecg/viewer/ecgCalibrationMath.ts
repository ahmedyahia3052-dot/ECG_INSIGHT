import type { EcgCaliper, EcgCaliperKind, EcgMeasurementKind, EcgMeasurementReadouts, ImagePoint } from "./measurementTypes";
import type { EcgGridGain, EcgPaperSpeed } from "./types";

export function gridSpacingPx(speed: EcgPaperSpeed, gain: EcgGridGain) {
  const speedFactor = speed === 50 ? 0.72 : 1;
  const gainFactor = gain === 5 ? 1.25 : gain === 20 ? 0.72 : 1;
  return 14 * speedFactor * gainFactor;
}

export function snapToGrid(value: number, spacing: number) {
  if (spacing <= 0) return value;
  return Math.round(value / spacing) * spacing;
}

export function snapPoint(point: ImagePoint, spacing: number): ImagePoint {
  return { x: snapToGrid(point.x, spacing), y: snapToGrid(point.y, spacing) };
}

export function deltaPixels(start: ImagePoint, end: ImagePoint, kind: EcgCaliperKind) {
  if (kind === "horizontal") return Math.abs(end.x - start.x);
  if (kind === "vertical") return Math.abs(end.y - start.y);
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function horizontalDeltaMs(deltaPx: number, speed: EcgPaperSpeed, spacing: number) {
  const smallBoxes = deltaPx / Math.max(spacing, 1);
  const msPerSmallBox = speed === 50 ? 20 : 40;
  return smallBoxes * msPerSmallBox;
}

export function verticalDeltaMv(deltaPx: number, gain: EcgGridGain, spacing: number) {
  const smallBoxes = deltaPx / Math.max(spacing, 1);
  return smallBoxes * (0.1 * (10 / gain));
}

export function verticalDeltaMm(deltaPx: number, spacing: number) {
  return deltaPx / Math.max(spacing, 1);
}

export function computeQtc(qtMs: number, rrMs: number) {
  if (rrMs <= 0) return 0;
  return qtMs / Math.sqrt(rrMs / 1000);
}

export function heartRateFromRr(rrMs: number) {
  if (rrMs <= 0) return 0;
  return Math.round(60000 / rrMs);
}

export function buildReadouts(input: {
  deltaPx: number;
  gain: EcgGridGain;
  kind: EcgCaliperKind;
  measurementKind?: EcgMeasurementKind;
  spacing: number;
  speed: EcgPaperSpeed;
}): EcgMeasurementReadouts {
  const horizontalPx = input.kind === "vertical" ? 0 : input.deltaPx;
  const verticalPx = input.kind === "horizontal" ? 0 : input.deltaPx;
  const milliseconds = horizontalDeltaMs(horizontalPx, input.speed, input.spacing);
  const mm = verticalDeltaMm(verticalPx, input.spacing);
  const mv = verticalDeltaMv(verticalPx, input.gain, input.spacing);
  const smallBoxes = input.deltaPx / Math.max(input.spacing, 1);
  const largeBoxes = smallBoxes / 5;
  const readouts: EcgMeasurementReadouts = {
    largeBoxes: Number(largeBoxes.toFixed(2)),
    milliseconds: Number(milliseconds.toFixed(1)),
    mm: Number(mm.toFixed(2)),
    mv: Number(mv.toFixed(3)),
    seconds: Number((milliseconds / 1000).toFixed(3)),
    smallBoxes: Number(smallBoxes.toFixed(2)),
  };
  if (input.measurementKind === "heart_rate" || input.measurementKind === "rr_interval" || input.measurementKind === "pp_interval") {
    readouts.bpm = heartRateFromRr(milliseconds);
  }
  if (input.measurementKind === "qtc") {
    readouts.milliseconds = Number(computeQtc(readouts.milliseconds ?? 0, 800).toFixed(1));
  }
  return readouts;
}

export function primaryValueForKind(kind: EcgMeasurementKind, readouts: EcgMeasurementReadouts, caliperKind: EcgCaliperKind) {
  if (kind === "heart_rate") return { unit: "bpm", value: readouts.bpm ?? 0 };
  if (kind === "st_elevation" || kind === "st_depression") return { unit: "mm", value: readouts.mm ?? 0 };
  if (caliperKind === "vertical") return { unit: "mV", value: readouts.mv ?? 0 };
  return { unit: "ms", value: readouts.milliseconds ?? 0 };
}

export function measurementFromCaliper(
  caliper: EcgCaliper,
  spacing: number,
  speed: EcgPaperSpeed,
  gain: EcgGridGain,
  operator: string,
): { kind: EcgMeasurementKind; name: string; readouts: EcgMeasurementReadouts; unit: string; value: number } {
  const kind = caliper.measurementKind ?? inferMeasurementKind(caliper.kind);
  const deltaPx = deltaPixels(caliper.start, caliper.end, caliper.kind);
  const readouts = buildReadouts({ deltaPx, gain, kind: caliper.kind, measurementKind: kind, spacing, speed });
  const primary = primaryValueForKind(kind, readouts, caliper.kind);
  const name = caliper.label?.trim() || defaultNameForKind(kind);
  return { kind, name, readouts, unit: primary.unit, value: primary.value };
}

function inferMeasurementKind(caliperKind: EcgCaliperKind): EcgMeasurementKind {
  if (caliperKind === "vertical") return "st_elevation";
  return "rr_interval";
}

function defaultNameForKind(kind: EcgMeasurementKind) {
  const labels: Record<EcgMeasurementKind, string> = {
    custom: "Custom Measurement",
    heart_rate: "Heart Rate",
    p_wave_duration: "P Wave Duration",
    pp_interval: "PP Interval",
    pr_interval: "PR Interval",
    qrs_duration: "QRS Duration",
    qt_interval: "QT Interval",
    qtc: "QTc",
    rr_interval: "RR Interval",
    st_depression: "ST Depression",
    st_elevation: "ST Elevation",
    t_wave_duration: "T Wave Duration",
  };
  return labels[kind];
}

export type ImageDisplayRect = {
  displayHeight: number;
  displayWidth: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

export function imageDisplayRect(containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number): ImageDisplayRect {
  const scale = Math.min(containerWidth / Math.max(imageWidth, 1), containerHeight / Math.max(imageHeight, 1));
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;
  return {
    displayHeight,
    displayWidth,
    offsetX: (containerWidth - displayWidth) / 2,
    offsetY: (containerHeight - displayHeight) / 2,
    scale,
  };
}

export function imageToScreen(point: ImagePoint, rect: ImageDisplayRect, transform: { panX: number; panY: number; zoom: number }) {
  const baseX = rect.offsetX + point.x * rect.scale;
  const baseY = rect.offsetY + point.y * rect.scale;
  return {
    x: baseX * transform.zoom + transform.panX,
    y: baseY * transform.zoom + transform.panY,
  };
}

export function screenToImage(point: ImagePoint, rect: ImageDisplayRect, transform: { panX: number; panY: number; zoom: number }) {
  const baseX = (point.x - transform.panX) / Math.max(transform.zoom, 0.0001);
  const baseY = (point.y - transform.panY) / Math.max(transform.zoom, 0.0001);
  return {
    x: (baseX - rect.offsetX) / Math.max(rect.scale, 0.0001),
    y: (baseY - rect.offsetY) / Math.max(rect.scale, 0.0001),
  };
}
