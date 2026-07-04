import type { GridCalibration, ImageAnalysisMetrics } from "../types";

function rowProjection(data: Uint8Array, width: number, height: number, y: number) {
  let sum = 0;
  for (let x = 0; x < width; x += 1) sum += 255 - (data[y * width + x] ?? 255);
  return sum / width;
}

function columnProjection(data: Uint8Array, width: number, height: number, x: number) {
  let sum = 0;
  for (let y = 0; y < height; y += 1) sum += 255 - (data[y * width + x] ?? 255);
  return sum / height;
}

function findPeaks(values: number[], minDistance: number) {
  const peaks: number[] = [];
  for (let index = 1; index < values.length - 1; index += 1) {
    if (values[index] > values[index - 1] && values[index] >= values[index + 1]) {
      if (!peaks.length || index - peaks[peaks.length - 1] >= minDistance) peaks.push(index);
    }
  }
  return peaks;
}

function medianSpacing(peaks: number[]) {
  if (peaks.length < 2) return 0;
  const spacings = peaks.slice(1).map((peak, index) => peak - peaks[index]);
  spacings.sort((left, right) => left - right);
  return spacings[Math.floor(spacings.length / 2)] ?? 0;
}

export function detectGrid(
  data: Uint8Array,
  width: number,
  height: number,
  fileHints: { originalName: string; metadata?: Record<string, unknown> },
): GridCalibration {
  const midRow = rowProjection(data, width, height, Math.floor(height / 2));
  const horizontal = Array.from({ length: height }, (_v, y) => rowProjection(data, width, height, y));
  const vertical = Array.from({ length: width }, (_v, x) => columnProjection(data, width, height, x));

  const horizontalPeaks = findPeaks(horizontal, Math.max(3, Math.floor(height / 80)));
  const verticalPeaks = findPeaks(vertical, Math.max(3, Math.floor(width / 80)));
  const rowSpacing = medianSpacing(horizontalPeaks);
  const colSpacing = medianSpacing(verticalPeaks);
  const pixelsPerSmallSquare = rowSpacing && colSpacing ? Math.round((rowSpacing + colSpacing) / 2) : 0;

  const metadataSpeed = Number(fileHints.metadata?.["paperSpeedMmPerSec"]);
  const metadataGain = Number(fileHints.metadata?.["gainMmPerMv"]);
  const name = fileHints.originalName.toLowerCase();

  let paperSpeedMmPerSec: 25 | 50 = metadataSpeed === 50 || name.includes("50mm") ? 50 : 25;
  let gainMmPerMv: 5 | 10 | 20 = metadataGain === 5 || name.includes("5mm")
    ? 5
    : metadataGain === 20 || name.includes("20mm")
      ? 20
      : 10;

  if (pixelsPerSmallSquare > 0) {
    if (pixelsPerSmallSquare < 6) paperSpeedMmPerSec = 50;
    if (pixelsPerSmallSquare > 14) gainMmPerMv = 5;
    if (pixelsPerSmallSquare < 8 && gainMmPerMv === 10) gainMmPerMv = 20;
  }

  const gridDetected = horizontalPeaks.length >= 4 && verticalPeaks.length >= 4 && midRow > 4;
  const confidence = Number(
    Math.min(
      0.99,
      Math.max(
        0.42,
        (horizontalPeaks.length / 20) * 0.35
        + (verticalPeaks.length / 20) * 0.35
        + (gridDetected ? 0.2 : 0)
        + (pixelsPerSmallSquare > 0 ? 0.1 : 0),
      ),
    ).toFixed(2),
  );

  const pixelsPerMm = pixelsPerSmallSquare > 0 ? Number((pixelsPerSmallSquare / 1).toFixed(3)) : undefined;
  const pixelsPerMv = pixelsPerMm && gainMmPerMv ? Number((pixelsPerMm * gainMmPerMv).toFixed(3)) : undefined;
  const pixelsPerMs = pixelsPerMm && paperSpeedMmPerSec
    ? Number((pixelsPerMm * (paperSpeedMmPerSec / 1000)).toFixed(4))
    : undefined;
  const gridRotationDeg = horizontalPeaks.length >= 2 && verticalPeaks.length >= 2
    ? Number((((verticalPeaks[0] ?? 0) - (horizontalPeaks[0] ?? 0)) / Math.max(width, height) * 90).toFixed(2))
    : 0;

  return {
    confidence,
    gainConfidence: Number(Math.min(0.99, confidence * 0.92).toFixed(2)),
    gainMmPerMv: paperSpeedMmPerSec === 50 && gainMmPerMv === 5 ? 10 : gainMmPerMv,
    gridColor: midRow > 8 ? "red" : "pink",
    gridDensity: pixelsPerSmallSquare > 0 ? Number((100 / pixelsPerSmallSquare).toFixed(2)) : undefined,
    gridDetected,
    gridRotationDeg,
    gridThicknessPx: pixelsPerSmallSquare ? Math.max(1, Math.round(pixelsPerSmallSquare * 0.08)) : 1,
    horizontalGridLines: horizontalPeaks.length,
    paperSpeedMmPerSec,
    pixelsPerMm,
    pixelsPerMs,
    pixelsPerMv,
    pixelsPerSmallSquare: pixelsPerSmallSquare || undefined,
    speedConfidence: Number(Math.min(0.99, confidence * 0.9).toFixed(2)),
    verticalGridLines: verticalPeaks.length,
  };
}

export function detectGridCalibrationFromFile(
  file: { metadataJson?: unknown; originalName: string; sizeBytes: number },
  metrics: ImageAnalysisMetrics,
): GridCalibration {
  const metadata = file.metadataJson && typeof file.metadataJson === "object"
    ? file.metadataJson as Record<string, unknown>
    : {};
  const speed = Number(metadata["paperSpeedMmPerSec"]) || (file.originalName.toLowerCase().includes("50mm") ? 50 : 25);
  const gain = Number(metadata["gainMmPerMv"]) || (file.originalName.toLowerCase().includes("20mm") ? 20 : file.originalName.toLowerCase().includes("5mm") ? 5 : 10);
  const confidence = Number(Math.min(0.98, Math.max(0.45, file.sizeBytes / (200 * 1024) * 0.4 + metrics.edgeDensity * 1.2 + metrics.entropy * 0.15)).toFixed(2));
  return {
    confidence,
    gainMmPerMv: speed === 50 && gain === 5 ? 10 : gain === 5 || gain === 20 ? gain : 10,
    gridDetected: confidence >= 0.58 && metrics.edgeDensity >= 0.02,
    paperSpeedMmPerSec: speed === 50 ? 50 : 25,
  };
}
