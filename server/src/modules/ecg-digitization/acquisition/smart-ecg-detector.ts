import type { ImageAnalysisMetrics } from "../types";

export type SmartEcgDetection = {
  autoCropRecommended: boolean;
  brightness: number;
  contrast: number;
  foldedPaperLikely: boolean;
  paperBordersDetected: boolean;
  paperColor: "pink" | "red" | "white" | "unknown";
  perspectiveDistortion: boolean;
  rotationDegrees: number;
  shadowDetected: boolean;
  backgroundNoiseLevel: "high" | "low" | "medium";
};

export function detectSmartEcgFeatures(
  data: Uint8Array | Buffer,
  width: number,
  height: number,
  metrics: ImageAnalysisMetrics,
  borderDetected: boolean,
  deskewDegrees: number,
): SmartEcgDetection {
  const marginX = Math.floor(width * 0.05);
  const marginY = Math.floor(height * 0.05);
  let edgeInk = 0;
  let edgeSamples = 0;
  let centerInk = 0;
  let centerSamples = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const value = data[y * width + x] ?? 255;
      const isEdge = x <= marginX || x >= width - marginX || y <= marginY || y >= height - marginY;
      if (isEdge) {
        edgeSamples += 1;
        if (value < 220) edgeInk += 1;
      } else if (x > width * 0.2 && x < width * 0.8 && y > height * 0.15 && y < height * 0.85) {
        centerSamples += 1;
        if (value < 200) centerInk += 1;
      }
    }
  }

  const edgeRatio = edgeSamples > 0 ? edgeInk / edgeSamples : 0;
  const centerRatio = centerSamples > 0 ? centerInk / centerSamples : 0;
  const foldedPaperLikely = metrics.darkRatio > 0.22 && metrics.contrast < 0.5;
  const shadowDetected = metrics.darkRatio > 0.18 || metrics.brightness < 0.38;
  const perspectiveDistortion = borderDetected && Math.abs(deskewDegrees) >= 1.2;
  const paperColor: SmartEcgDetection["paperColor"] =
    metrics.brightness > 0.72 && metrics.contrast < 0.55 ? "pink" : metrics.contrast > 0.62 ? "white" : "unknown";

  return {
    autoCropRecommended: edgeRatio > 0.12 && centerRatio > 0.04,
    backgroundNoiseLevel: metrics.noise > 0.14 ? "high" : metrics.noise > 0.07 ? "medium" : "low",
    brightness: metrics.brightness,
    contrast: metrics.contrast,
    foldedPaperLikely,
    paperBordersDetected: borderDetected || edgeRatio > 0.1,
    paperColor,
    perspectiveDistortion,
    rotationDegrees: deskewDegrees,
    shadowDetected,
  };
}
