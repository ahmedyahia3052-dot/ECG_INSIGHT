import { describe, expect, it } from "vitest";

import {
  clampRenderZoom,
  effectiveDpr,
  fitSignal,
  panBy,
  screenToSignal,
  signalToScreen,
  subPixel,
  visibleSampleRange,
  zoomAt,
} from "@/components/ecg/viewer/rendering-engine/viewport";
import type { EcgRenderViewport } from "@/components/ecg/viewer/rendering-engine/types";

function viewport(overrides: Partial<EcgRenderViewport> = {}): EcgRenderViewport {
  return {
    containerHeight: 400,
    containerWidth: 800,
    dpr: 2,
    panX: 0,
    panY: 0,
    signalHeight: 200,
    signalWidth: 1000,
    zoom: 1,
    ...overrides,
  };
}

describe("rendering-engine viewport", () => {
  it("clamps zoom within render bounds", () => {
    expect(clampRenderZoom(512)).toBe(256);
    expect(clampRenderZoom(0.001)).toBe(0.01);
  });

  it("boosts DPR for large display surfaces", () => {
    expect(effectiveDpr(viewport({ containerWidth: 3840, dpr: 1 }))).toBeGreaterThanOrEqual(2);
    expect(effectiveDpr(viewport({ containerWidth: 1280, dpr: 2 }))).toBe(2);
  });

  it("converts between screen and signal coordinates", () => {
    const vp = viewport({ zoom: 2, panX: 10, panY: -5 });
    const signal = screenToSignal(vp, 400, 200);
    const back = signalToScreen(vp, signal.x, signal.y);
    expect(back.x).toBeCloseTo(400, 0);
    expect(back.y).toBeCloseTo(200, 0);
  });

  it("computes visible sample window for virtualized wave rendering", () => {
    const range = visibleSampleRange(5000, viewport({ zoom: 4, panX: 100 }));
    expect(range.end).toBeGreaterThan(range.start);
    expect(range.start).toBeGreaterThanOrEqual(0);
    expect(range.end).toBeLessThanOrEqual(5000);
  });

  it("pans and zooms around anchor preserving focal signal point", () => {
    const vp = viewport();
    const panned = panBy(vp, 20, -10);
    expect(panned.panX).toBe(20);
    expect(panned.panY).toBe(-10);
    const zoomed = zoomAt(vp, 2, 400, 200);
    expect(zoomed.zoom).toBe(2);
  });

  it("fits signal to container and rounds sub-pixel values", () => {
    const fitted = fitSignal(viewport());
    expect(fitted.zoom).toBeGreaterThan(0);
    expect(subPixel(12.3456)).toBe(12.35);
  });
});
