import { describe, expect, it } from "vitest";

import {
  cycleGridPreset,
  GRID_PRESET_COLORS,
  GRID_PRESET_LABELS,
  gridColorsForPreset,
} from "@/components/ecg/viewer/clinical-visualization/gridPresets";

describe("gridPresets", () => {
  it("cycles through all grid presets", () => {
    expect(cycleGridPreset("classic-paper")).toBe("hospital-black");
    expect(cycleGridPreset("dark-gray")).toBe("classic-paper");
  });

  it("exposes labels for every preset", () => {
    for (const key of Object.keys(GRID_PRESET_COLORS)) {
      expect(GRID_PRESET_LABELS[key as keyof typeof GRID_PRESET_LABELS]).toBeTruthy();
    }
  });

  it("boosts opacity for high contrast mode", () => {
    const normal = gridColorsForPreset("dark-blue", 1, false);
    const high = gridColorsForPreset("dark-blue", 1, true);
    expect(high.major).not.toEqual(normal.major);
  });
});
