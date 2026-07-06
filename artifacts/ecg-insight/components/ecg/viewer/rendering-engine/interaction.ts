import type { EcgInteractionState, EcgTwelveLeadRegion } from "./types";

/** User interaction layer — hover, selection, crosshair, rubber band */

export const DEFAULT_INTERACTION: EcgInteractionState = {
  beatCursorMs: null,
  crosshair: null,
  highlightedLead: null,
  hoverLead: null,
  rubberBand: null,
  selectedLeads: [],
};

export function hitTestLead(
  x: number,
  y: number,
  regions: EcgTwelveLeadRegion[],
): string | null {
  for (const region of regions) {
    if (x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height) {
      return region.lead;
    }
  }
  return null;
}

export function toggleLeadSelection(state: EcgInteractionState, lead: string): EcgInteractionState {
  const selected = state.selectedLeads.includes(lead)
    ? state.selectedLeads.filter((l) => l !== lead)
    : [...state.selectedLeads, lead];
  return { ...state, highlightedLead: lead, selectedLeads: selected };
}

export function updateCrosshair(state: EcgInteractionState, x: number, y: number): EcgInteractionState {
  return { ...state, crosshair: { x, y } };
}

export function updateHover(state: EcgInteractionState, lead: string | null): EcgInteractionState {
  return { ...state, hoverLead: lead };
}

export function startRubberBand(state: EcgInteractionState, x: number, y: number): EcgInteractionState {
  return { ...state, rubberBand: { end: { x, y }, start: { x, y } } };
}

export function extendRubberBand(state: EcgInteractionState, x: number, y: number): EcgInteractionState {
  if (!state.rubberBand) return state;
  return { ...state, rubberBand: { ...state.rubberBand, end: { x, y } } };
}

export function finishRubberBand(
  state: EcgInteractionState,
  regions: EcgTwelveLeadRegion[],
): EcgInteractionState {
  if (!state.rubberBand) return state;
  const { end, start } = state.rubberBand;
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const selected = regions
    .filter((r) => r.x + r.width >= minX && r.x <= maxX && r.y + r.height >= minY && r.y <= maxY)
    .map((r) => r.lead);
  return { ...state, rubberBand: null, selectedLeads: selected };
}

export function setBeatCursor(state: EcgInteractionState, ms: number | null): EcgInteractionState {
  return { ...state, beatCursorMs: ms };
}

export function clearInteraction(): EcgInteractionState {
  return { ...DEFAULT_INTERACTION };
}
