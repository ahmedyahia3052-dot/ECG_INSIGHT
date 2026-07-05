import type { EcgImageAdjustments, EcgImageFormat } from "./types";

export const SUPPORTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "tiff", "bmp"] as const;
export const SUPPORTED_IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "application/pdf",
] as const;

const imageCache = new Map<string, { height: number; loadedAt: number; width: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function detectImageFormat(source: string, mimeType?: string): EcgImageFormat {
  const normalizedMime = mimeType?.toLowerCase() ?? "";
  if (normalizedMime.includes("pdf")) return "pdf";
  if (normalizedMime.startsWith("image/")) {
    const subtype = normalizedMime.split("/")[1] ?? "unknown";
    if (subtype === "jpeg" || subtype === "jpg") return "jpeg";
    if (SUPPORTED_IMAGE_EXTENSIONS.includes(subtype as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) return subtype as EcgImageFormat;
  }
  const match = source.split("?")[0]?.match(/\.([a-z0-9]+)$/i);
  const ext = match?.[1]?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "jpg") return "jpg";
  if (ext === "jpeg") return "jpeg";
  if (ext && SUPPORTED_IMAGE_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) {
    return ext as EcgImageFormat;
  }
  return "unknown";
}

export function isSupportedEcgAsset(source: string, mimeType?: string) {
  const format = detectImageFormat(source, mimeType);
  return format !== "unknown";
}

export function buildImageFilterStyle(adjustments: EcgImageAdjustments) {
  const filters: string[] = [];
  if (adjustments.brightness !== 100) filters.push(`brightness(${adjustments.brightness / 100})`);
  if (adjustments.contrast !== 100) filters.push(`contrast(${adjustments.contrast / 100})`);
  if (adjustments.grayscale) filters.push("grayscale(1)");
  if (adjustments.invert) filters.push("invert(1)");
  if (adjustments.sharpen) filters.push("contrast(1.12) saturate(1.05)");
  return filters.length ? filters.join(" ") : undefined;
}

export function buildTransformStyle(
  transform: { panX: number; panY: number; rotation: number; zoom: number },
  adjustments: EcgImageAdjustments,
) {
  const scaleX = (adjustments.flipHorizontal ? -1 : 1) * transform.zoom;
  const scaleY = (adjustments.flipVertical ? -1 : 1) * transform.zoom;
  return [
    { translateX: transform.panX },
    { translateY: transform.panY },
    { scaleX },
    { scaleY },
    { rotate: `${transform.rotation}deg` },
  ] as const;
}

export function cacheImageDimensions(uri: string, width: number, height: number) {
  imageCache.set(uri, { height, loadedAt: Date.now(), width });
}

export function readCachedImageDimensions(uri: string) {
  const cached = imageCache.get(uri);
  if (!cached) return null;
  if (Date.now() - cached.loadedAt > CACHE_TTL_MS) {
    imageCache.delete(uri);
    return null;
  }
  return cached;
}

export function clearExpiredImageCache(now = Date.now()) {
  for (const [key, value] of imageCache.entries()) {
    if (now - value.loadedAt > CACHE_TTL_MS) imageCache.delete(key);
  }
}

export function clampZoom(value: number, min = 0.1, max = 32) {
  return Math.min(max, Math.max(min, value));
}

/** Hospital-grade zoom presets: 100% → 1600% */
export const ECG_ZOOM_PRESETS = [1, 2, 4, 8, 16] as const;

export type EcgZoomPreset = (typeof ECG_ZOOM_PRESETS)[number];

export function nearestZoomPreset(value: number): EcgZoomPreset {
  return ECG_ZOOM_PRESETS.reduce((closest, preset) =>
    Math.abs(preset - value) < Math.abs(closest - value) ? preset : closest,
  ECG_ZOOM_PRESETS[0]);
}

export function zoomStep(current: number, delta: number) {
  return clampZoom(current + delta);
}

export function zoomAtPoint(
  transform: { panX: number; panY: number; rotation: number; zoom: number },
  anchor: { x: number; y: number },
  nextZoom: number,
) {
  const ratio = nextZoom / Math.max(transform.zoom, 0.001);
  return {
    ...transform,
    panX: anchor.x - (anchor.x - transform.panX) * ratio,
    panY: anchor.y - (anchor.y - transform.panY) * ratio,
    zoom: clampZoom(nextZoom),
  };
}

export function fitZoomForDimensions(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  mode: "width" | "height" | "100",
) {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) return 1;
  if (mode === "100") return 1;
  const contain = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const displayWidth = imageWidth * contain;
  const displayHeight = imageHeight * contain;
  if (mode === "width") return containerWidth / Math.max(displayWidth, 1);
  return containerHeight / Math.max(displayHeight, 1);
}
