import type { EcgTwelveLeadRegion } from "../rendering-engine/types";

export type LeadFocusState = {
  activeLead: string | null;
  focused: boolean;
  progress: number;
};

export function applyLeadFocusRegions(
  regions: EcgTwelveLeadRegion[],
  focusedLead: string | null,
  containerWidth: number,
  containerHeight: number,
  progress: number,
): Array<EcgTwelveLeadRegion & { dimmed: boolean; focusScale: number }> {
  if (!focusedLead) {
    return regions.map((r) => ({ ...r, dimmed: false, focusScale: 1 }));
  }
  const focusRegion = regions.find((r) => r.lead === focusedLead);
  if (!focusRegion) return regions.map((r) => ({ ...r, dimmed: false, focusScale: 1 }));

  const t = Math.min(1, Math.max(0, progress));
  return regions.map((region) => {
    if (region.lead === focusedLead) {
      const x = region.x * (1 - t);
      const y = region.y * (1 - t);
      const width = region.width + (containerWidth - region.width) * t;
      const height = region.height + (containerHeight - region.height) * t;
      return { ...region, dimmed: false, focusScale: 1 + t * 0.15, height, width, x, y };
    }
    return { ...region, dimmed: true, focusScale: 1 - t * 0.5 };
  });
}

export function toggleLeadFocus(current: LeadFocusState, lead: string): LeadFocusState {
  if (current.focused && current.activeLead === lead) {
    return { activeLead: null, focused: false, progress: 0 };
  }
  return { activeLead: lead, focused: true, progress: 1 };
}
