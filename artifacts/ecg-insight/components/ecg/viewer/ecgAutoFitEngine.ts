import type { EcgViewerFitMode } from "./types";
import { clampZoom } from "./ecgImageEngine";

/** Sprint 53.2 — clinical reading fill targets */
export const ECG_WORKSPACE_FILL = 0.94;
export const ECG_READING_MODE_FILL = 0.95;

export type AutoFitDimensions = {
  panX: number;
  panY: number;
  renderHeight: number;
  renderWidth: number;
  zoom: number;
};

function containScale(containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number) {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) return 1;
  return Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
}

/** Compute layout-sized render dimensions with aspect ratio preserved (no crop, no distortion). */
export function computeAutoFitLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  mode: EcgViewerFitMode,
  targetFill = ECG_WORKSPACE_FILL,
): AutoFitDimensions {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return { panX: 0, panY: 0, renderHeight: imageHeight, renderWidth: imageWidth, zoom: 1 };
  }

  const contain = containScale(containerWidth, containerHeight, imageWidth, imageHeight);
  const baseWidth = imageWidth * contain;
  const baseHeight = imageHeight * contain;

  if (mode === "width") {
    const renderWidth = containerWidth * targetFill;
    const renderHeight = (imageHeight / imageWidth) * renderWidth;
    const zoom = clampZoom(renderWidth / Math.max(baseWidth, 1));
    return {
      panX: Math.max(0, (containerWidth - renderWidth) / 2),
      panY: 0,
      renderHeight,
      renderWidth,
      zoom,
    };
  }

  if (mode === "height") {
    const renderHeight = containerHeight * targetFill;
    const renderWidth = (imageWidth / imageHeight) * renderHeight;
    const zoom = clampZoom(renderHeight / Math.max(baseHeight, 1));
    return {
      panX: Math.max(0, (containerWidth - renderWidth) / 2),
      panY: 0,
      renderHeight,
      renderWidth,
      zoom,
    };
  }

  if (mode === "contain" || mode === "hero") {
    const zoom = clampZoom(contain * targetFill);
    const renderWidth = imageWidth * contain * targetFill;
    const renderHeight = imageHeight * contain * targetFill;
    return {
      panX: Math.max(0, (containerWidth - renderWidth) / 2),
      panY: Math.max(0, (containerHeight - renderHeight) / 2),
      renderHeight,
      renderWidth,
      zoom,
    };
  }

  if (mode === "100" || mode === "150" || mode === "200" || mode === "300") {
    const preset = mode === "100" ? 1 : mode === "150" ? 1.5 : mode === "200" ? 2 : 3;
    const renderWidth = baseWidth * preset;
    const renderHeight = baseHeight * preset;
    return {
      panX: Math.max(0, (containerWidth - renderWidth) / 2),
      panY: Math.max(0, (containerHeight - renderHeight) / 2),
      renderHeight,
      renderWidth,
      zoom: clampZoom(preset),
    };
  }

  const renderWidth = baseWidth;
  const renderHeight = baseHeight;
  return {
    panX: Math.max(0, (containerWidth - renderWidth) / 2),
    panY: Math.max(0, (containerHeight - renderHeight) / 2),
    renderHeight,
    renderWidth,
    zoom: 1,
  };
}

export function isAutoFitMode(mode: EcgViewerFitMode) {
  return mode === "width" || mode === "height" || mode === "contain" || mode === "hero";
}
