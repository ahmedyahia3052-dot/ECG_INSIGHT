import { describe, expect, it } from "vitest";

import {
  clearInteraction,
  DEFAULT_INTERACTION,
  extendRubberBand,
  finishRubberBand,
  hitTestLead,
  setBeatCursor,
  startRubberBand,
  toggleLeadSelection,
  updateCrosshair,
  updateHover,
} from "@/components/ecg/viewer/rendering-engine/interaction";

const regions = [
  { height: 100, lead: "II", width: 200, x: 0, y: 0 },
  { height: 100, lead: "V1", width: 200, x: 200, y: 0 },
];

describe("rendering interaction layer", () => {
  it("hit tests lead regions", () => {
    expect(hitTestLead(50, 50, regions)).toBe("II");
    expect(hitTestLead(250, 50, regions)).toBe("V1");
    expect(hitTestLead(999, 999, regions)).toBeNull();
  });

  it("toggles lead selection and highlights", () => {
    const first = toggleLeadSelection(DEFAULT_INTERACTION, "II");
    expect(first.selectedLeads).toEqual(["II"]);
    expect(first.highlightedLead).toBe("II");
    const second = toggleLeadSelection(first, "II");
    expect(second.selectedLeads).toEqual([]);
  });

  it("updates crosshair and hover state", () => {
    const cross = updateCrosshair(DEFAULT_INTERACTION, 12, 34);
    expect(cross.crosshair).toEqual({ x: 12, y: 34 });
    const hover = updateHover(cross, "V1");
    expect(hover.hoverLead).toBe("V1");
  });

  it("tracks rubber band selection across regions", () => {
    let state = startRubberBand(DEFAULT_INTERACTION, 10, 10);
    state = extendRubberBand(state, 250, 90);
    state = finishRubberBand(state, regions);
    expect(state.rubberBand).toBeNull();
    expect(state.selectedLeads.sort()).toEqual(["II", "V1"]);
  });

  it("sets beat cursor and clears interaction", () => {
    const beat = setBeatCursor(DEFAULT_INTERACTION, 420);
    expect(beat.beatCursorMs).toBe(420);
    expect(clearInteraction()).toEqual(DEFAULT_INTERACTION);
  });
});
