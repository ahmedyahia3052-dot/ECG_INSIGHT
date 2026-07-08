import { describe, expect, it } from "vitest";

import {
  applyWheelZoom,
  CLINICAL_EASING_MS,
  decayMomentum,
  easeOutCubic,
  lerpZoom,
  momentumActive,
  trackPanVelocity,
} from "@/components/ecg/viewer/clinical-visualization/zoomPanEngine";

describe("zoomPanEngine", () => {
  it("zooms out on positive wheel delta and caps factor", () => {
    expect(applyWheelZoom(120)).toBeLessThan(1);
    expect(applyWheelZoom(120)).toBeGreaterThan(0.75);
  });

  it("zooms in on negative wheel delta", () => {
    expect(applyWheelZoom(-120)).toBeGreaterThan(1);
    expect(applyWheelZoom(-120)).toBeLessThan(1.25);
  });

  it("lerps zoom toward target", () => {
    expect(lerpZoom(1, 2, 0.5)).toBe(1.5);
  });

  it("decays pan momentum with friction", () => {
    const next = decayMomentum({ vx: 10, vy: -8 }, 0.5);
    expect(next.vx).toBe(5);
    expect(next.vy).toBe(-4);
  });

  it("detects active momentum above threshold", () => {
    expect(momentumActive({ vx: 0.2, vy: 0.1 })).toBe(false);
    expect(momentumActive({ vx: 2, vy: 0 })).toBe(true);
  });

  it("tracks velocity from pointer samples", () => {
    const last = { t: 1000, x: 0, y: 0 };
    const velocity = trackPanVelocity(last, 16, 16, 1016);
    expect(velocity.vx).toBeGreaterThan(0);
    expect(velocity.vy).toBeGreaterThan(0);
  });

  it("returns zero velocity when sample gap is too large", () => {
    expect(trackPanVelocity({ t: 0, x: 0, y: 0 }, 10, 10, 200)).toEqual({ vx: 0, vy: 0 });
  });

  it("eases out cubic toward 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it("exports clinical easing constant", () => {
    expect(CLINICAL_EASING_MS).toBe(200);
  });
});
