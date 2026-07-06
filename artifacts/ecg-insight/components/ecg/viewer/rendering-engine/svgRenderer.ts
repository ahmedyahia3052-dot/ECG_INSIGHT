import type { EcgInteractionState, EcgRenderLayerId, EcgTwelveLeadRegion, EcgVectorModel } from "./types";
import { vectorPointsToSmoothPath } from "./vectorModel";
import { subPixel } from "./viewport";

export type SvgLayerOutput = {
  aiPaths: string[];
  annotationPaths: string[];
  crosshairLines: Array<{ x1: number; x2: number; y1: number; y2: number }>;
  gridMajor: string[];
  gridMinor: string[];
  leadLabels: Array<{ lead: string; x: number; y: number }>;
  measurementPaths: string[];
  rubberBand: { height: number; width: number; x: number; y: number } | null;
  selectionPaths: string[];
  waveformPaths: Array<{ highlighted: boolean; lead: string; path: string }>;
};

export function buildSvgLayerOutput(
  model: EcgVectorModel,
  regions: EcgTwelveLeadRegion[],
  gridMajor: string[],
  gridMinor: string[],
  interaction: EcgInteractionState,
): SvgLayerOutput {
  const waveformPaths = model.leads.map((segment) => {
    const region = regions.find((r) => r.lead === segment.lead);
    if (!region || segment.points.length < 2) return { highlighted: false, lead: segment.lead, path: "" };
    const highlighted =
      interaction.highlightedLead === segment.lead || interaction.selectedLeads.includes(segment.lead);
    return {
      highlighted,
      lead: segment.lead,
      path: vectorPointsToSmoothPath(segment.points, region.x, region.y),
    };
  }).filter((item) => item.path.length > 0);

  const leadLabels = regions.map((region) => ({
    lead: region.lead,
    x: region.x + 8,
    y: region.y + 18,
  }));

  const crosshairLines: SvgLayerOutput["crosshairLines"] = [];
  if (interaction.crosshair) {
    const { x, y } = interaction.crosshair;
    crosshairLines.push({ x1: x, x2: x, y1: 0, y2: 9999 });
    crosshairLines.push({ x1: 0, x2: 9999, y1: y, y2: y });
  }

  let rubberBand: SvgLayerOutput["rubberBand"] = null;
  if (interaction.rubberBand) {
    const { end, start } = interaction.rubberBand;
    rubberBand = {
      height: Math.abs(end.y - start.y),
      width: Math.abs(end.x - start.x),
      x: subPixel(Math.min(start.x, end.x)),
      y: subPixel(Math.min(start.y, end.y)),
    };
  }

  return {
    aiPaths: [],
    annotationPaths: [],
    crosshairLines,
    gridMajor,
    gridMinor,
    leadLabels,
    measurementPaths: [],
    rubberBand,
    selectionPaths: [],
    waveformPaths,
  };
}

export const SVG_LAYER_ORDER: EcgRenderLayerId[] = [
  "grid",
  "waveform",
  "measurement",
  "ai",
  "annotation",
  "selection",
  "cursor",
  "tooltip",
];
