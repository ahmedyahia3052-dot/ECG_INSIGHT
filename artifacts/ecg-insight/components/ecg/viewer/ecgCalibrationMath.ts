import type { EcgCaliper, EcgCaliperKind, EcgMeasurementKind, EcgMeasurementReadouts, ImagePoint } from "./measurementTypes";
import type { EcgGridGain, EcgPaperSpeed, EcgViewerGridSettings } from "./types";
import { computeAngleDegrees, deltaPixelsForCaliper, polylineLength } from "./ecgCaliperGeometry";
import { MEASUREMENT_KIND_LABELS } from "./measurementTypes";

export function resolveGridSpacing(grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">) {
  if (grid.customCalibration && grid.pixelsPerSmallBox && grid.pixelsPerSmallBox > 0) {
    return grid.pixelsPerSmallBox;
  }
  return gridSpacingPx(grid.speed, grid.gain);
}

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

export function deltaPixels(start: ImagePoint, end: ImagePoint, kind: EcgCaliperKind, caliper?: Pick<EcgCaliper, "vertex" | "waypoints">) {
  if (kind === "angle" && caliper?.vertex) return computeAngleDegrees(caliper.vertex, start, end);
  if (kind === "multi" && caliper?.waypoints?.length) return polylineLength(caliper.waypoints);
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
  caliper?: Pick<EcgCaliper, "vertex" | "waypoints">;
  deltaPx: number;
  gain: EcgGridGain;
  kind: EcgCaliperKind;
  measurementKind?: EcgMeasurementKind;
  rrMs?: number;
  spacing: number;
  speed: EcgPaperSpeed;
}): EcgMeasurementReadouts {
  if (input.kind === "angle") {
    return { angleDegrees: Number(input.deltaPx.toFixed(1)) };
  }
  const horizontalPx = input.kind === "vertical" ? 0 : input.deltaPx;
  const verticalPx = input.kind === "horizontal" || input.kind === "multi" ? 0 : input.deltaPx;
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
    pathPixels: input.kind === "multi" || input.kind === "distance" ? Number(input.deltaPx.toFixed(2)) : undefined,
    seconds: Number((milliseconds / 1000).toFixed(3)),
    smallBoxes: Number(smallBoxes.toFixed(2)),
  };
  if (input.measurementKind === "heart_rate" || input.measurementKind === "rr_interval" || input.measurementKind === "pp_interval") {
    readouts.bpm = heartRateFromRr(milliseconds);
  }
  if (input.measurementKind === "qtc" || input.measurementKind === "qtc_bazett") {
    const qtMs = milliseconds;
    readouts.milliseconds = input.rrMs && input.rrMs > 0
      ? Number(computeQtc(qtMs, input.rrMs).toFixed(1))
      : qtMs;
  }
  if (input.measurementKind === "qtc_fridericia") {
    const qtMs = milliseconds;
    readouts.milliseconds =
      input.rrMs && input.rrMs > 0
        ? Number((qtMs / Math.cbrt(input.rrMs / 1000)).toFixed(1))
        : qtMs;
  }
  if (input.measurementKind === "st_depression" && readouts.mm != null) {
    readouts.mm = Number(Math.abs(readouts.mm).toFixed(2));
  }
  return readouts;
}

export function primaryValueForKind(kind: EcgMeasurementKind, readouts: EcgMeasurementReadouts, caliperKind: EcgCaliperKind) {
  if (kind === "heart_rate") return { unit: "bpm", value: readouts.bpm ?? 0 };
  if (kind === "electrical_axis" || caliperKind === "angle") return { unit: "deg", value: readouts.angleDegrees ?? 0 };
  if (kind === "st_elevation" || kind === "st_depression") return { unit: "mm", value: readouts.mm ?? 0 };
  if (kind === "p_amplitude" || kind === "r_amplitude" || kind === "s_amplitude" || kind === "t_amplitude") {
    return { unit: "mV", value: readouts.mv ?? 0 };
  }
  if (kind === "qt_dispersion") return { unit: "ms", value: readouts.milliseconds ?? 0 };
  if (kind === "qtc_bazett" || kind === "qtc_fridericia" || kind === "qtc") return { unit: "ms", value: readouts.milliseconds ?? 0 };
  if (caliperKind === "vertical") return { unit: "mV", value: readouts.mv ?? 0 };
  if (caliperKind === "distance") return { unit: "px", value: readouts.pathPixels ?? readouts.milliseconds ?? 0 };
  return { unit: "ms", value: readouts.milliseconds ?? 0 };
}

export function measurementFromCaliper(
  caliper: EcgCaliper,
  spacing: number,
  speed: EcgPaperSpeed,
  gain: EcgGridGain,
  operator: string,
  options?: { rrMs?: number },
): { kind: EcgMeasurementKind; name: string; readouts: EcgMeasurementReadouts; unit: string; value: number } {
  const kind = caliper.measurementKind ?? inferMeasurementKind(caliper.kind);
  const deltaPx = deltaPixelsForCaliper(caliper);
  const readouts = buildReadouts({
    caliper,
    deltaPx,
    gain,
    kind: caliper.kind,
    measurementKind: kind,
    rrMs: options?.rrMs,
    spacing,
    speed,
  });
  const primary = primaryValueForKind(kind, readouts, caliper.kind);
  const name = caliper.label?.trim() || defaultNameForKind(kind);
  return { kind, name, readouts, unit: primary.unit, value: primary.value };
}

function inferMeasurementKind(caliperKind: EcgCaliperKind): EcgMeasurementKind {
  if (caliperKind === "angle") return "electrical_axis";
  if (caliperKind === "distance") return "custom";
  if (caliperKind === "vertical") return "st_elevation";
  return "rr_interval";
}

function defaultNameForKind(kind: EcgMeasurementKind) {
  return MEASUREMENT_KIND_LABELS[kind] ?? "Custom Measurement";
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

export function dragCaliperEndpoint(
  caliper: EcgCaliper,
  endpoint: "start" | "end",
  imagePoint: ImagePoint,
  spacing: number,
) {
  const snapped = caliper.snapToGrid ? snapPoint(imagePoint, spacing) : imagePoint;
  if (endpoint === "start") {
    if (caliper.kind === "horizontal") return { ...caliper, start: { x: snapped.x, y: caliper.start.y } };
    if (caliper.kind === "vertical") return { ...caliper, start: { x: caliper.start.x, y: snapped.y } };
    if (caliper.kind === "angle" && caliper.vertex) return { ...caliper, start: snapped };
    return { ...caliper, start: snapped };
  }
  if (caliper.kind === "horizontal") return { ...caliper, end: { x: snapped.x, y: caliper.start.y } };
  if (caliper.kind === "vertical") return { ...caliper, end: { x: caliper.start.x, y: snapped.y } };
  if (caliper.kind === "angle" && caliper.vertex) return { ...caliper, end: snapped };
  return { ...caliper, end: snapped };
}

export function dragCaliperVertex(caliper: EcgCaliper, imagePoint: ImagePoint, spacing: number) {
  const snapped = caliper.snapToGrid ? snapPoint(imagePoint, spacing) : imagePoint;
  return { ...caliper, vertex: snapped };
}

export function dragMultiWaypoint(caliper: EcgCaliper, index: number, imagePoint: ImagePoint, spacing: number) {
  if (!caliper.waypoints?.length) return caliper;
  const snapped = caliper.snapToGrid ? snapPoint(imagePoint, spacing) : imagePoint;
  const waypoints = caliper.waypoints.map((point, pointIndex) => (pointIndex === index ? snapped : point));
  return {
    ...caliper,
    end: waypoints[waypoints.length - 1] ?? caliper.end,
    start: waypoints[0] ?? caliper.start,
    waypoints,
  };
}
