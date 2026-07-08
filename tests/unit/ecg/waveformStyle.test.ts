import { describe, expect, it } from "vitest";

import { resolveWaveformStyle, waveformOpacity } from "@/components/ecg/viewer/clinical-visualization/waveformStyle";
import type { EcgClinicalVisualizationSettings } from "@/components/ecg/viewer/clinical-visualization/types";

const settings: EcgClinicalVisualizationSettings = {
  beatGlow: true,
  highContrast: false,
  phosphorEffect: false,
  waveformBrightness: 1.2,
  waveformOpacity: 0.9,
  waveformThickness: 1.5,
};

describe("waveformStyle", () => {
  it("uses hospital monitor styling for black grid preset", () => {
    const style = resolveWaveformStyle(settings, "hospital-black", false, false);
    expect(style.traceColor).toBe("#22C55E");
    expect(style.glowBlur).toBeGreaterThan(0);
  });

  it("highlights and hovers override trace color", () => {
    const base = resolveWaveformStyle(settings, "clinical-white", false, false);
    const highlighted = resolveWaveformStyle(settings, "clinical-white", true, false);
    const hovered = resolveWaveformStyle(settings, "clinical-white", false, true);
    expect(base.traceColor).not.toBe(highlighted.traceColor);
    expect(hovered.traceColor).toBe("#FDE047");
  });

  it("dims waveform opacity when lead is not focused", () => {
    expect(waveformOpacity(settings, true)).toBeLessThan(settings.waveformOpacity);
    expect(waveformOpacity(settings, false)).toBe(settings.waveformOpacity);
  });
});
