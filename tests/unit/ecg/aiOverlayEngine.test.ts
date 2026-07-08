import { describe, expect, it } from "vitest";

import {
  confidenceColor,
  confidencePercent,
  confidenceTone,
} from "@/components/ecg/viewer/ecgAiOverlayEngine";

describe("ecgAiOverlayEngine helpers", () => {
  it("normalizes fractional and whole-number confidence", () => {
    expect(confidencePercent(0.86)).toBe(86);
    expect(confidencePercent(86)).toBe(86);
    expect(confidencePercent(null)).toBe(0);
  });

  it("maps confidence to tone bands", () => {
    expect(confidenceTone(96)).toBe("very-high");
    expect(confidenceTone(75)).toBe("high");
    expect(confidenceTone(55)).toBe("moderate");
    expect(confidenceTone(10)).toBe("low");
    expect(confidenceTone(0)).toBe("critical");
  });

  it("returns hex colors for overlay rendering", () => {
    expect(confidenceColor(95)).toMatch(/^#/);
    expect(confidenceColor(40)).toMatch(/^#/);
  });
});
