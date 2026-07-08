import { describe, expect, it } from "vitest";

import { applyLeadFocusRegions, toggleLeadFocus } from "@/components/ecg/viewer/clinical-visualization/leadFocus";

const regions = [
  { height: 100, lead: "II", width: 200, x: 0, y: 0 },
  { height: 100, lead: "V1", width: 200, x: 200, y: 0 },
];

describe("leadFocus", () => {
  it("returns unchanged regions when not focused", () => {
    const out = applyLeadFocusRegions(regions, null, 400, 200, 0);
    expect(out.every((r) => !r.dimmed)).toBe(true);
  });

  it("dims non-focused leads and expands focused lead", () => {
    const out = applyLeadFocusRegions(regions, "II", 400, 200, 1);
    const ii = out.find((r) => r.lead === "II");
    const v1 = out.find((r) => r.lead === "V1");
    expect(ii?.dimmed).toBe(false);
    expect(v1?.dimmed).toBe(true);
    expect(ii!.width).toBeGreaterThan(regions[0]!.width);
  });

  it("toggles lead focus state", () => {
    expect(toggleLeadFocus({ activeLead: null, focused: false, progress: 0 }, "II")).toEqual({
      activeLead: "II",
      focused: true,
      progress: 1,
    });
    expect(toggleLeadFocus({ activeLead: "II", focused: true, progress: 1 }, "II")).toEqual({
      activeLead: null,
      focused: false,
      progress: 0,
    });
  });
});
