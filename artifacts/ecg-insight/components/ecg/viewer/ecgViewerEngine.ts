import type { EcgViewerFitMode, EcgViewerViewport } from "./types";

export const VIEWER_LAYER = {
  aiOverlay: 4,
  digitizedWaveform: 3,
  ecgGrid: 2,
  ecgImage: 1,
  measurements: 5,
} as const;

export function containScale(viewport: Pick<EcgViewerViewport, "containerHeight" | "containerWidth" | "imageHeight" | "imageWidth">) {
  if (!viewport.containerWidth || !viewport.containerHeight || !viewport.imageWidth || !viewport.imageHeight) return 1;
  return Math.min(viewport.containerWidth / viewport.imageWidth, viewport.containerHeight / viewport.imageHeight);
}

export function displayDimensions(viewport: EcgViewerViewport) {
  const scale = containScale(viewport);
  return {
    displayHeight: viewport.imageHeight * scale,
    displayWidth: viewport.imageWidth * scale,
    offsetX: (viewport.containerWidth - viewport.imageWidth * scale) / 2,
    offsetY: (viewport.containerHeight - viewport.imageHeight * scale) / 2,
    scale,
  };
}

export function fitZoomForViewport(viewport: EcgViewerViewport, mode: EcgViewerFitMode) {
  const rect = displayDimensions(viewport);
  if (mode === "100") return 1;
  if (mode === "width") return viewport.containerWidth / Math.max(rect.displayWidth, 1);
  if (mode === "height") return viewport.containerHeight / Math.max(rect.displayHeight, 1);
  return 1;
}

export function formatImageResolution(width: number, height: number) {
  return `${Math.round(width)} × ${Math.round(height)}`;
}

export function rhythmStripMarkers(speed: 25 | 50, spanSeconds = 10) {
  const stepMs = speed === 50 ? 200 : 400;
  const markers: Array<{ label: string; ms: number }> = [];
  for (let ms = 0; ms <= spanSeconds * 1000; ms += stepMs) {
    markers.push({ label: `${(ms / 1000).toFixed(1)}s`, ms });
  }
  return markers;
}
