import type { DigitalEcg, DigitalEcgAnnotation } from "@/services/ecgProcessing";

import { leadRegionInImage } from "./ecgAiOverlayEngine";
import { horizontalDeltaMs, resolveGridSpacing, snapPoint } from "./ecgCalibrationMath";
import type { EcgCaliperKind, EcgMeasurementKind, ImagePoint } from "./measurementTypes";
import type { EcgViewerGridSettings } from "./types";

export type WaveFiducialType =
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "J"
  | "iso"
  | "pr_segment"
  | "st_segment"
  | "qt_end";

export type WaveFiducial = {
  confidence: number;
  lead: string;
  ms: number;
  type: WaveFiducialType;
};

export type CaliperSeed = {
  end: ImagePoint;
  kind: EcgCaliperKind;
  label: string;
  measurementKind: EcgMeasurementKind;
  start: ImagePoint;
};

const FIDUCIAL_MAP: Record<string, WaveFiducialType> = {
  j_point: "J",
  jpoint: "J",
  p_end: "P",
  p_onset: "P",
  p_start: "P",
  p_wave: "P",
  pr_segment: "pr_segment",
  q_onset: "Q",
  q_wave: "Q",
  qt_end: "qt_end",
  r_peak: "R",
  r_wave: "R",
  s_wave: "S",
  st_segment: "st_segment",
  t_end: "T",
  t_wave: "T",
  isoelectric: "iso",
  baseline: "iso",
};

export function msToImageX(
  ms: number,
  grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">,
  region: { width: number; x: number },
  beatAnchorMs = 0,
): number {
  const spacing = resolveGridSpacing(grid);
  const msPerSmallBox = grid.speed === 50 ? 20 : 40;
  const deltaMs = Math.max(0, ms - beatAnchorMs);
  const pixels = (deltaMs / msPerSmallBox) * spacing;
  return region.x + Math.min(region.width * 0.92, pixels + region.width * 0.08);
}

export function imageXToMs(
  x: number,
  grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">,
  region: { width: number; x: number },
  beatAnchorMs = 0,
): number {
  const spacing = resolveGridSpacing(grid);
  const relativePx = Math.max(0, x - region.x - region.width * 0.08);
  const msPerSmallBox = grid.speed === 50 ? 20 : 40;
  const deltaMs = (relativePx / Math.max(spacing, 1)) * msPerSmallBox;
  return beatAnchorMs + deltaMs;
}

function annotationToFiducial(annotation: DigitalEcgAnnotation): WaveFiducial | null {
  const key = annotation.type.toLowerCase().replace(/\s+/g, "_");
  const type = FIDUCIAL_MAP[key];
  if (!type) return null;
  const ms = annotation.peakMs ?? (annotation.startMs + annotation.endMs) / 2;
  return { confidence: 0.85, lead: annotation.lead, ms, type };
}

export function detectWaveFiducials(digitalEcg: DigitalEcg, lead = "II"): WaveFiducial[] {
  const fromAnnotations = (digitalEcg.annotations ?? [])
    .map(annotationToFiducial)
    .filter((item): item is WaveFiducial => !!item && (item.lead === lead || item.lead === "Rhythm Strip"));

  if (fromAnnotations.length >= 3) return fromAnnotations;

  const engine = digitalEcg.measurementEngine;
  const rrMs = engine?.intervals?.rrIntervalMs ?? digitalEcg.measurements?.rrIntervalMs ?? 800;
  const prMs = engine?.intervals?.prIntervalMs ?? digitalEcg.measurements?.prIntervalMs ?? 160;
  const qrsMs = engine?.intervals?.qrsDurationMs ?? digitalEcg.measurements?.qrsDurationMs ?? 90;
  const qtMs = engine?.intervals?.qtIntervalMs ?? digitalEcg.measurements?.qtIntervalMs ?? 380;

  const beatStart = 0;
  const pOnset = beatStart;
  const qOnset = beatStart + prMs;
  const rPeak = qOnset + qrsMs * 0.45;
  const sEnd = qOnset + qrsMs;
  const tPeak = sEnd + (qtMs - qrsMs) * 0.55;
  const qtEnd = beatStart + qtMs;
  const nextR = beatStart + rrMs;

  return [
    { confidence: engine?.confidence ?? 0.72, lead, ms: pOnset, type: "P" },
    { confidence: engine?.confidence ?? 0.72, lead, ms: qOnset, type: "Q" },
    { confidence: engine?.confidence ?? 0.78, lead, ms: rPeak, type: "R" },
    { confidence: engine?.confidence ?? 0.72, lead, ms: sEnd, type: "S" },
    { confidence: engine?.confidence ?? 0.7, lead, ms: sEnd, type: "J" },
    { confidence: engine?.confidence ?? 0.72, lead, ms: tPeak, type: "T" },
    { confidence: engine?.confidence ?? 0.72, lead, ms: qtEnd, type: "qt_end" },
    { confidence: engine?.confidence ?? 0.72, lead, ms: nextR, type: "R" },
    { confidence: 0.65, lead, ms: beatStart + prMs * 0.55, type: "pr_segment" },
    { confidence: 0.65, lead, ms: sEnd + (qtMs - qrsMs) * 0.15, type: "st_segment" },
    { confidence: 0.6, lead, ms: beatStart + rrMs * 0.5, type: "iso" },
  ];
}

export function baselineYForLead(lead: string, imageWidth: number, imageHeight: number): number {
  const region = leadRegionInImage(lead, imageWidth, imageHeight);
  return region.y + region.height * 0.58;
}

export function snapToNearestFiducial(
  point: ImagePoint,
  fiducials: WaveFiducial[],
  grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">,
  imageWidth: number,
  imageHeight: number,
  lead: string,
): ImagePoint {
  const region = leadRegionInImage(lead, imageWidth, imageHeight);
  const spacing = resolveGridSpacing(grid);
  const thresholdPx = spacing * 1.25;
  let best: { dist: number; x: number } | null = null;
  for (const fiducial of fiducials) {
    const x = msToImageX(fiducial.ms, grid, region);
    const dist = Math.abs(point.x - x);
    if (dist <= thresholdPx && (!best || dist < best.dist)) {
      best = { dist, x };
    }
  }
  if (!best) return snapPoint(point, spacing);
  return { x: best.x, y: point.y };
}

export function buildCaliperSeedsFromEngine(
  digitalEcg: DigitalEcg,
  grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">,
  imageWidth: number,
  imageHeight: number,
  lead = "II",
): CaliperSeed[] {
  const region = leadRegionInImage(lead, imageWidth, imageHeight);
  const baselineY = baselineYForLead(lead, imageWidth, imageHeight);
  const fiducials = detectWaveFiducials(digitalEcg, lead);
  const byType = (type: WaveFiducialType) => fiducials.find((item) => item.type === type);

  const p = byType("P");
  const q = byType("Q");
  const r = byType("R");
  const qtEnd = byType("qt_end");
  const nextR = fiducials.filter((item) => item.type === "R").slice(-1)[0];

  const seeds: CaliperSeed[] = [];
  if (p && q) {
    seeds.push({
      end: { x: msToImageX(q.ms, grid, region), y: baselineY },
      kind: "horizontal",
      label: "PR",
      measurementKind: "pr_interval",
      start: { x: msToImageX(p.ms, grid, region), y: baselineY },
    });
  }
  if (q && r) {
    seeds.push({
      end: { x: msToImageX(r.ms, grid, region), y: baselineY },
      kind: "horizontal",
      label: "QRS",
      measurementKind: "qrs_duration",
      start: { x: msToImageX(q.ms, grid, region), y: baselineY },
    });
  }
  if (q && qtEnd) {
    seeds.push({
      end: { x: msToImageX(qtEnd.ms, grid, region), y: baselineY },
      kind: "horizontal",
      label: "QT",
      measurementKind: "qt_interval",
      start: { x: msToImageX(q.ms, grid, region), y: baselineY },
    });
  }
  if (r && nextR) {
    seeds.push({
      end: { x: msToImageX(nextR.ms, grid, region), y: baselineY },
      kind: "horizontal",
      label: "RR",
      measurementKind: "rr_interval",
      start: { x: msToImageX(r.ms, grid, region), y: baselineY },
    });
  }

  const st = byType("st_segment");
  if (st) {
    const x = msToImageX(st.ms, grid, region);
    seeds.push({
      end: { x, y: baselineY - resolveGridSpacing(grid) * 1.5 },
      kind: "vertical",
      label: "ST↑",
      measurementKind: "st_elevation",
      start: { x, y: baselineY },
    });
  }

  return seeds;
}

export function horizontalMsBetweenPoints(
  start: ImagePoint,
  end: ImagePoint,
  grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">,
): number {
  const spacing = resolveGridSpacing(grid);
  const deltaPx = Math.abs(end.x - start.x);
  return horizontalDeltaMs(deltaPx, grid.speed, spacing);
}
