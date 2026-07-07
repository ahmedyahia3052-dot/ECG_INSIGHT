import { leadRegionInImage } from "./ecgAiOverlayEngine";
import { resolveGridSpacing, snapPoint } from "./ecgCalibrationMath";
import { baselineYForLead, msToImageX, type WaveFiducial, type WaveFiducialType } from "./ecgWaveDetectionBridge";
import type { EcgMeasurementSnapSettings, ImagePoint } from "./measurementTypes";
import type { EcgViewerGridSettings } from "./types";

export type SnapTarget =
  | "p_onset"
  | "p_peak"
  | "p_offset"
  | "q"
  | "r_peak"
  | "s"
  | "j_point"
  | "st_junction"
  | "t_onset"
  | "t_peak"
  | "t_offset"
  | "baseline"
  | "isoelectric"
  | "grid"
  | "nearest_wave";

const FIDUCIAL_TO_TARGET: Partial<Record<WaveFiducialType, SnapTarget[]>> = {
  J: ["j_point", "st_junction"],
  P: ["p_onset", "p_peak", "p_offset"],
  Q: ["q"],
  R: ["r_peak"],
  S: ["s"],
  T: ["t_onset", "t_peak", "t_offset"],
  iso: ["baseline", "isoelectric"],
  pr_segment: ["p_offset"],
  qt_end: ["t_offset"],
  st_segment: ["st_junction", "j_point"],
};

export const DEFAULT_SNAP_TARGETS: SnapTarget[] = [
  "p_onset",
  "p_peak",
  "p_offset",
  "q",
  "r_peak",
  "s",
  "j_point",
  "st_junction",
  "t_onset",
  "t_peak",
  "t_offset",
  "baseline",
  "isoelectric",
  "grid",
  "nearest_wave",
];

export function applyAutoSnap(
  point: ImagePoint,
  input: {
    fiducials: WaveFiducial[];
    grid: Pick<EcgViewerGridSettings, "customCalibration" | "gain" | "pixelsPerSmallBox" | "speed">;
    imageHeight: number;
    imageWidth: number;
    lead: string;
    snapSettings: EcgMeasurementSnapSettings;
    targets?: SnapTarget[];
  },
): ImagePoint {
  const spacing = resolveGridSpacing(input.grid);
  let next = point;
  const targets = input.targets ?? input.snapSettings.snapTargets ?? DEFAULT_SNAP_TARGETS;

  if (input.snapSettings.snapToGrid && targets.includes("grid")) {
    next = snapPoint(next, spacing);
  }

  const region = leadRegionInImage(input.lead, input.imageWidth, input.imageHeight);

  if (input.snapSettings.snapToBaseline && (targets.includes("baseline") || targets.includes("isoelectric"))) {
    next = { ...next, y: baselineYForLead(input.lead, input.imageWidth, input.imageHeight) };
  }

  if (!input.snapSettings.snapToWave || !input.fiducials.length) return next;

  const leadFiducials = input.fiducials.filter((f) => f.lead === input.lead || f.lead === "Rhythm Strip");
  const thresholdPx = spacing * 1.25;
  let bestX: { dist: number; x: number } | null = null;
  let bestY: { dist: number; y: number } | null = null;

  for (const fiducial of leadFiducials) {
    const mappedTargets = FIDUCIAL_TO_TARGET[fiducial.type] ?? ["nearest_wave"];
    const allowed = mappedTargets.some((t) => targets.includes(t) || targets.includes("nearest_wave"));
    if (!allowed) continue;

    const x = msToImageX(fiducial.ms, input.grid, region);
    const xDist = Math.abs(next.x - x);
    if (xDist <= thresholdPx && (!bestX || xDist < bestX.dist)) {
      bestX = { dist: xDist, x };
    }

    if (fiducial.type === "R" && targets.includes("r_peak")) {
      const peakY = region.y + region.height * 0.32;
      const yDist = Math.abs(next.y - peakY);
      if (yDist <= thresholdPx * 2 && (!bestY || yDist < bestY.dist)) {
        bestY = { dist: yDist, y: peakY };
      }
    }
  }

  if (bestX) next = { ...next, x: bestX.x };
  if (bestY) next = { ...next, y: bestY.y };
  return next;
}

export function nearestSnapTargetLabel(
  point: ImagePoint,
  fiducials: WaveFiducial[],
  grid: Pick<EcgViewerGridSettings, "customCalibration" | "gain" | "pixelsPerSmallBox" | "speed">,
  imageWidth: number,
  imageHeight: number,
  lead: string,
): SnapTarget | null {
  const region = leadRegionInImage(lead, imageWidth, imageHeight);
  const spacing = resolveGridSpacing(grid);
  const thresholdPx = spacing * 1.25;
  let best: { dist: number; target: SnapTarget } | null = null;
  for (const fiducial of fiducials) {
    const x = msToImageX(fiducial.ms, grid, region);
    const dist = Math.abs(point.x - x);
    if (dist <= thresholdPx) {
      const target = FIDUCIAL_TO_TARGET[fiducial.type]?.[0] ?? "nearest_wave";
      if (!best || dist < best.dist) best = { dist, target };
    }
  }
  return best?.target ?? null;
}
