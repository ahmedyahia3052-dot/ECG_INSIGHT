import { leadRegionInImage } from "./ecgAiOverlayEngine";
import { imageXToMs, msToImageX } from "./ecgWaveDetectionBridge";
import type { EcgCaliper, ImagePoint } from "./measurementTypes";
import type { EcgViewerGridSettings } from "./types";

export const STANDARD_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;

export type MultiLeadSyncMarker = {
  lead: string;
  x: number;
  y: number;
};

export function leadBaselinePoint(lead: string, imageWidth: number, imageHeight: number): ImagePoint {
  const region = leadRegionInImage(lead, imageWidth, imageHeight);
  return { x: region.x + region.width * 0.15, y: region.y + region.height * 0.58 };
}

export function replicateHorizontalCaliper(
  source: EcgCaliper,
  imageWidth: number,
  imageHeight: number,
  grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">,
  groupId: string,
): EcgCaliper[] {
  const anchorLead = source.lead ?? "II";
  const anchorRegion = leadRegionInImage(anchorLead, imageWidth, imageHeight);
  const startMs = imageXToMs(source.start.x, grid, anchorRegion);
  const endMs = imageXToMs(source.end.x, grid, anchorRegion);

  return STANDARD_LEADS.map((lead) => {
    const region = leadRegionInImage(lead, imageWidth, imageHeight);
    const baselineY = region.y + region.height * 0.58;
    const startX = msToImageX(startMs, grid, region);
    const endX = msToImageX(endMs, grid, region);
    const isAnchor = lead === anchorLead;
    return {
      ...source,
      end: { x: endX, y: baselineY },
      groupId,
      hidden: !isAnchor,
      id: isAnchor ? source.id : `${source.id}-${lead}`,
      lead,
      start: { x: startX, y: baselineY },
    };
  });
}

export function syncTimestampMarkers(
  timestampMs: number,
  grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">,
  imageWidth: number,
  imageHeight: number,
): MultiLeadSyncMarker[] {
  return STANDARD_LEADS.map((lead) => {
    const region = leadRegionInImage(lead, imageWidth, imageHeight);
    return {
      lead,
      x: msToImageX(timestampMs, grid, region),
      y: region.y + region.height * 0.58,
    };
  });
}

export function pointToSyncedTimestamp(
  point: ImagePoint,
  anchorLead: string,
  grid: Pick<EcgViewerGridSettings, "gain" | "speed" | "pixelsPerSmallBox" | "customCalibration">,
  imageWidth: number,
  imageHeight: number,
): number {
  const region = leadRegionInImage(anchorLead, imageWidth, imageHeight);
  return imageXToMs(point.x, grid, region);
}
