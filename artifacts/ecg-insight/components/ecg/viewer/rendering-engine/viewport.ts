import type { EcgRenderViewport } from "./types";

/** Infinite zoom/pan viewport with sub-pixel precision and virtual windowing */

export function clampRenderZoom(zoom: number, min = 0.01, max = 256) {
  return Math.min(max, Math.max(min, zoom));
}

export function resolveDevicePixelRatio(dpr?: number) {
  if (dpr && dpr > 0) return dpr;
  if (typeof window !== "undefined" && window.devicePixelRatio) return window.devicePixelRatio;
  return 1;
}

export function effectiveDpr(viewport: EcgRenderViewport) {
  const base = resolveDevicePixelRatio(viewport.dpr);
  if (base >= 3) return base;
  if (viewport.containerWidth >= 7680 || viewport.containerHeight >= 4320) return Math.max(base, 2);
  if (viewport.containerWidth >= 3840 || viewport.containerHeight >= 2160) return Math.max(base, 2);
  return base;
}

export function screenToSignal(viewport: EcgRenderViewport, x: number, y: number) {
  const cx = viewport.containerWidth / 2;
  const cy = viewport.containerHeight / 2;
  return {
    x: (x - cx - viewport.panX) / viewport.zoom + viewport.signalWidth / 2,
    y: (y - cy - viewport.panY) / viewport.zoom + viewport.signalHeight / 2,
  };
}

export function signalToScreen(viewport: EcgRenderViewport, x: number, y: number) {
  const cx = viewport.containerWidth / 2;
  const cy = viewport.containerHeight / 2;
  return {
    x: (x - viewport.signalWidth / 2) * viewport.zoom + cx + viewport.panX,
    y: (y - viewport.signalHeight / 2) * viewport.zoom + cy + viewport.panY,
  };
}

export function visibleSampleRange(
  sampleCount: number,
  viewport: EcgRenderViewport,
  paddingRatio = 0.15,
): { end: number; start: number } {
  if (sampleCount <= 0) return { end: 0, start: 0 };
  const left = screenToSignal(viewport, 0, 0).x;
  const right = screenToSignal(viewport, viewport.containerWidth, 0).x;
  const span = Math.max(1, right - left);
  const pad = span * paddingRatio;
  const startNorm = Math.max(0, (left - pad) / Math.max(viewport.signalWidth, 1));
  const endNorm = Math.min(1, (right + pad) / Math.max(viewport.signalWidth, 1));
  return {
    end: Math.min(sampleCount, Math.ceil(endNorm * sampleCount)),
    start: Math.max(0, Math.floor(startNorm * sampleCount)),
  };
}

export function panBy(viewport: EcgRenderViewport, dx: number, dy: number): EcgRenderViewport {
  return { ...viewport, panX: viewport.panX + dx, panY: viewport.panY + dy };
}

export function zoomAt(
  viewport: EcgRenderViewport,
  factor: number,
  anchorX: number,
  anchorY: number,
): EcgRenderViewport {
  const nextZoom = clampRenderZoom(viewport.zoom * factor);
  const before = screenToSignal(viewport, anchorX, anchorY);
  const next: EcgRenderViewport = { ...viewport, zoom: nextZoom };
  const after = screenToSignal(next, anchorX, anchorY);
  return {
    ...next,
    panX: next.panX + (after.x - before.x) * nextZoom,
    panY: next.panY + (after.y - before.y) * nextZoom,
  };
}

export function fitSignal(viewport: EcgRenderViewport): EcgRenderViewport {
  const scaleX = viewport.containerWidth / Math.max(viewport.signalWidth, 1);
  const scaleY = viewport.containerHeight / Math.max(viewport.signalHeight, 1);
  return { ...viewport, panX: 0, panY: 0, zoom: clampRenderZoom(Math.min(scaleX, scaleY)) };
}

export function subPixel(value: number) {
  return Math.round(value * 100) / 100;
}
