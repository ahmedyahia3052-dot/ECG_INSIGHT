import { leadRegionInImage } from "./ecgAiOverlayEngine";
import { computeQtc, heartRateFromRr, resolveGridSpacing } from "./ecgCalibrationMath";
import { imageXToMs, msToImageX } from "./ecgWaveDetectionBridge";
import type { EcgCaliper, EcgCaliperKind, EcgMeasurementKind, EcgMeasurementReadouts, ImagePoint, WaveformPoint } from "./measurementTypes";
import type { EcgViewerGridSettings } from "./types";

export type WaveformCoordinateContext = {
  beatAnchorMs?: number;
  grid: Pick<EcgViewerGridSettings, "customCalibration" | "gain" | "pixelsPerSmallBox" | "speed">;
  imageHeight: number;
  imageWidth: number;
  lead: string;
  samplingRateHz?: number;
};

export function imagePointToWaveform(point: ImagePoint, ctx: WaveformCoordinateContext): WaveformPoint {
  const region = leadRegionInImage(ctx.lead, ctx.imageWidth, ctx.imageHeight);
  const spacing = resolveGridSpacing(ctx.grid);
  const baselineY = region.y + region.height * 0.58;
  const timeMs = imageXToMs(point.x, ctx.grid, region, ctx.beatAnchorMs ?? 0);
  const smallBoxes = (baselineY - point.y) / Math.max(spacing, 1);
  const amplitudeMv = Number((smallBoxes * 0.1 * (10 / ctx.grid.gain)).toFixed(4));
  const sampleIndex =
    ctx.samplingRateHz && ctx.samplingRateHz > 0 ? Math.round((timeMs / 1000) * ctx.samplingRateHz) : undefined;
  return { amplitudeMv, lead: ctx.lead, sampleIndex, timeMs: Number(timeMs.toFixed(2)) };
}

export function waveformToImagePoint(point: WaveformPoint, ctx: WaveformCoordinateContext): ImagePoint {
  const region = leadRegionInImage(point.lead, ctx.imageWidth, ctx.imageHeight);
  const spacing = resolveGridSpacing(ctx.grid);
  const baselineY = region.y + region.height * 0.58;
  const x = msToImageX(point.timeMs, ctx.grid, region, ctx.beatAnchorMs ?? 0);
  const smallBoxes = point.amplitudeMv / (0.1 * (10 / ctx.grid.gain));
  const y = baselineY - smallBoxes * spacing;
  return { x, y };
}

export function syncCaliperImageFromWaveform(caliper: EcgCaliper, ctx: WaveformCoordinateContext): EcgCaliper {
  if (!caliper.waveformStart || !caliper.waveformEnd) return caliper;
  const lead = caliper.lead ?? ctx.lead;
  const startCtx = { ...ctx, lead };
  const endCtx = { ...ctx, lead: caliper.waveformEnd.lead ?? lead };
  return {
    ...caliper,
    end: waveformToImagePoint(caliper.waveformEnd, endCtx),
    start: waveformToImagePoint(caliper.waveformStart, startCtx),
    vertex: caliper.waveformVertex ? waveformToImagePoint(caliper.waveformVertex, startCtx) : caliper.vertex,
    waypoints: caliper.waveformWaypoints?.map((wp) => waveformToImagePoint(wp, { ...ctx, lead: wp.lead ?? lead })),
  };
}

export function attachWaveformAnchors(
  caliper: EcgCaliper,
  ctx: WaveformCoordinateContext,
): EcgCaliper {
  const lead = caliper.lead ?? ctx.lead;
  const wfCtx = { ...ctx, lead };
  return {
    ...caliper,
    waveformEnd: imagePointToWaveform(caliper.end, wfCtx),
    waveformStart: imagePointToWaveform(caliper.start, wfCtx),
    waveformVertex: caliper.vertex ? imagePointToWaveform(caliper.vertex, wfCtx) : undefined,
    waveformWaypoints: caliper.waypoints?.map((p) => imagePointToWaveform(p, wfCtx)),
  };
}

export function computeFridericiaQtc(qtMs: number, rrMs: number) {
  if (rrMs <= 0) return 0;
  return qtMs / Math.cbrt(rrMs / 1000);
}

export function readoutsFromWaveformAnchors(input: {
  caliperKind: EcgCaliperKind;
  end: WaveformPoint;
  measurementKind?: EcgMeasurementKind;
  rrMs?: number;
  start: WaveformPoint;
}): EcgMeasurementReadouts {
  const deltaMs = Math.abs(input.end.timeMs - input.start.timeMs);
  const deltaMv = Math.abs(input.end.amplitudeMv - input.start.amplitudeMv);
  const readouts: EcgMeasurementReadouts = {
    bpm: heartRateFromRr(deltaMs),
    milliseconds: Number(deltaMs.toFixed(1)),
    mv: Number(deltaMv.toFixed(3)),
    seconds: Number((deltaMs / 1000).toFixed(3)),
  };
  if (input.measurementKind === "qtc" || input.measurementKind === "qtc_bazett") {
    readouts.milliseconds =
      input.rrMs && input.rrMs > 0 ? Number(computeQtc(deltaMs, input.rrMs).toFixed(1)) : readouts.milliseconds;
  }
  if (input.measurementKind === "qtc_fridericia") {
    readouts.milliseconds =
      input.rrMs && input.rrMs > 0 ? Number(computeFridericiaQtc(deltaMs, input.rrMs).toFixed(1)) : readouts.milliseconds;
  }
  if (input.measurementKind === "heart_rate" || input.measurementKind === "rr_interval" || input.measurementKind === "pp_interval") {
    readouts.bpm = heartRateFromRr(deltaMs);
  }
  if (input.caliperKind === "vertical" || input.measurementKind === "st_elevation" || input.measurementKind === "st_depression") {
    readouts.mm = Number((deltaMv * 10).toFixed(2));
  }
  return readouts;
}

export function measurementValueFromWaveform(
  kind: EcgMeasurementKind,
  caliperKind: EcgCaliperKind,
  readouts: EcgMeasurementReadouts,
): { unit: string; value: number } {
  if (kind === "heart_rate") return { unit: "bpm", value: readouts.bpm ?? 0 };
  if (kind === "electrical_axis" || caliperKind === "angle") return { unit: "deg", value: readouts.angleDegrees ?? 0 };
  if (kind === "st_elevation" || kind === "st_depression") return { unit: "mm", value: readouts.mm ?? 0 };
  if (kind === "p_amplitude" || kind === "r_amplitude" || kind === "s_amplitude" || kind === "t_amplitude") {
    return { unit: "mV", value: readouts.mv ?? 0 };
  }
  if (caliperKind === "vertical") return { unit: "mV", value: readouts.mv ?? 0 };
  return { unit: "ms", value: readouts.milliseconds ?? 0 };
}

export function hasWaveformAnchors(caliper: EcgCaliper): caliper is EcgCaliper & { waveformEnd: WaveformPoint; waveformStart: WaveformPoint } {
  return !!caliper.waveformStart && !!caliper.waveformEnd;
}

export function waveformContextFromImage(
  grid: WaveformCoordinateContext["grid"],
  imageWidth: number,
  imageHeight: number,
  lead: string,
  samplingRateHz?: number,
): WaveformCoordinateContext {
  return { grid, imageHeight, imageWidth, lead, samplingRateHz };
}

export function qtcBazett(qtMs: number, rrMs: number) {
  return computeQtc(qtMs, rrMs);
}

export function qtcFridericia(qtMs: number, rrMs: number) {
  return computeFridericiaQtc(qtMs, rrMs);
}

export type { WaveformPoint };
