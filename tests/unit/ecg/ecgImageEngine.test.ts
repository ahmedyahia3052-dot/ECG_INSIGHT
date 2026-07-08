import { describe, expect, it, beforeEach } from "vitest";

import {
  buildImageFilterStyle,
  buildTransformStyle,
  cacheImageDimensions,
  clampZoom,
  clearExpiredImageCache,
  detectImageFormat,
  fitZoomForDimensions,
  heroFitZoom,
  isSupportedEcgAsset,
  nearestZoomPreset,
  readCachedImageDimensions,
  zoomAtPoint,
  zoomStep,
} from "@/components/ecg/viewer/ecgImageEngine";

describe("ecgImageEngine", () => {
  beforeEach(() => {
    clearExpiredImageCache(Date.now() + 60 * 60 * 1000);
  });

  it("detects image formats from mime type and extension", () => {
    expect(detectImageFormat("scan.png", "image/png")).toBe("png");
    expect(detectImageFormat("scan.JPG")).toBe("jpg");
    expect(detectImageFormat("report.pdf", "application/pdf")).toBe("pdf");
    expect(detectImageFormat("unknown.bin")).toBe("unknown");
    expect(isSupportedEcgAsset("scan.webp")).toBe(true);
    expect(isSupportedEcgAsset("unknown.bin")).toBe(false);
  });

  it("builds CSS filter and transform styles for viewer adjustments", () => {
    expect(buildImageFilterStyle({ brightness: 100, contrast: 100, flipHorizontal: false, flipVertical: false, grayscale: false, invert: false, sharpen: false })).toBeUndefined();
    const filters = buildImageFilterStyle({ brightness: 120, contrast: 90, flipHorizontal: false, flipVertical: false, grayscale: true, invert: false, sharpen: true });
    expect(filters).toContain("grayscale(1)");
    const transform = buildTransformStyle({ panX: 10, panY: 20, rotation: 90, zoom: 2 }, { brightness: 100, contrast: 100, flipHorizontal: true, flipVertical: false, grayscale: false, invert: false, sharpen: false });
    expect(transform.some((t) => "scaleX" in t && t.scaleX === -2)).toBe(true);
  });

  it("clamps zoom and steps through hospital presets", () => {
    expect(clampZoom(0.01)).toBe(0.1);
    expect(clampZoom(64)).toBe(32);
    expect(nearestZoomPreset(3.2)).toBe(4);
    expect(zoomStep(1, 1)).toBe(2);
  });

  it("zooms at anchor point preserving focal coordinates", () => {
    const next = zoomAtPoint({ panX: 0, panY: 0, rotation: 0, zoom: 1 }, { x: 100, y: 100 }, 2);
    expect(next.zoom).toBe(2);
    expect(next.panX).toBe(-100);
    expect(next.panY).toBe(-100);
  });

  it("computes fit zoom modes for hero framing", () => {
    expect(fitZoomForDimensions(800, 600, 400, 300, "contain")).toBeGreaterThan(0);
    expect(fitZoomForDimensions(800, 600, 400, 300, "100")).toBe(1);
    expect(heroFitZoom(800, 600, 400, 300)).toBeGreaterThan(0);
  });

  it("caches and expires image dimension lookups", () => {
    cacheImageDimensions("uri-a", 1200, 800);
    expect(readCachedImageDimensions("uri-a")).toEqual(expect.objectContaining({ width: 1200, height: 800 }));
    clearExpiredImageCache(Date.now() + 20 * 60 * 1000);
    expect(readCachedImageDimensions("uri-a")).toBeNull();
  });
});
