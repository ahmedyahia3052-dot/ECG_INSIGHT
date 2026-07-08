import { describe, expect, it } from "vitest";

import {
  buildReadouts,
  computeQtc,
  gridSpacingPx,
  heartRateFromRr,
  horizontalDeltaMs,
  resolveGridSpacing,
  snapPoint,
  snapToGrid,
  verticalDeltaMm,
  verticalDeltaMv,
} from "@/components/ecg/viewer/ecgCalibrationMath";

describe("ecgCalibrationMath", () => {
  it("resolves grid spacing with custom calibration override", () => {
    expect(gridSpacingPx(25, 10)).toBeCloseTo(14, 1);
    expect(resolveGridSpacing({ gain: 10, speed: 25 })).toBeCloseTo(14, 1);
    expect(resolveGridSpacing({ gain: 10, speed: 25, customCalibration: true, pixelsPerSmallBox: 18 })).toBe(18);
  });

  it("snaps points to grid intersections", () => {
    expect(snapToGrid(13, 7)).toBe(14);
    expect(snapPoint({ x: 13, y: 27 }, 7)).toEqual({ x: 14, y: 28 });
  });

  it("converts pixel deltas to clinical units", () => {
    const spacing = 14;
    expect(horizontalDeltaMs(140, 25, spacing)).toBe(400);
    expect(verticalDeltaMv(14, 10, spacing)).toBeCloseTo(0.1, 3);
    expect(verticalDeltaMm(28, spacing)).toBe(2);
  });

  it("derives QTc and heart rate from interval measurements", () => {
    expect(computeQtc(400, 800)).toBeCloseTo(447.2, 0);
    expect(heartRateFromRr(750)).toBe(80);
    expect(heartRateFromRr(0)).toBe(0);
  });

  it("builds readouts for horizontal RR calipers", () => {
    const readouts = buildReadouts({
      deltaPx: 140,
      gain: 10,
      kind: "horizontal",
      measurementKind: "rr_interval",
      spacing: 14,
      speed: 25,
    });
    expect(readouts.milliseconds).toBe(400);
    expect(readouts.bpm).toBe(150);
  });

  it("builds readouts for vertical ST elevation calipers", () => {
    const readouts = buildReadouts({
      deltaPx: 28,
      gain: 10,
      kind: "vertical",
      measurementKind: "st_elevation",
      spacing: 14,
      speed: 25,
    });
    expect(readouts.mm).toBe(2);
  });
});
