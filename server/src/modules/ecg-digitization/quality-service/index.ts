import type { DigitizationPreprocessing, DigitizationQuality, GridCalibration, ImageAnalysisMetrics, LeadSegment } from "../types";
import { missingLeads } from "../lead-detector";

export function scoreImageQuality(input: {
  fileSizeBytes: number;
  metrics: ImageAnalysisMetrics;
  preprocessing: DigitizationPreprocessing;
  segments: LeadSegment[];
  calibration: GridCalibration;
}): DigitizationQuality {
  const { metrics, preprocessing, segments, calibration, fileSizeBytes } = input;
  const warnings: string[] = [];

  const blur = Math.min(100, Math.round((metrics.blurScore / 18) * 100));
  const brightness = Math.min(100, Math.round(metrics.brightness * 100));
  const contrast = Math.min(100, Math.round(metrics.contrast * 100));
  const resolution = fileSizeBytes < 20_000 ? 35 : fileSizeBytes < 80_000 ? 58 : fileSizeBytes > 120_000 ? 88 : 72;
  const gridVisibility = calibration.gridDetected ? Math.round(calibration.confidence * 100) : 25;
  const paperVisibility = preprocessing.borderDetected ? 82 : 48;
  const cropping = preprocessing.croppingOptimization.widthPercent >= 85 ? 80 : 52;

  let score = Math.round((blur + brightness + contrast + resolution + gridVisibility + paperVisibility + cropping) / 7);

  if (blur < 45) {
    score -= 12;
    warnings.push("Blur detected — image may reduce trace extraction accuracy.");
  }
  if (brightness < 35 || brightness > 90) {
    score -= 10;
    warnings.push("Brightness is outside optimal range.");
  }
  if (contrast < 35) {
    score -= 12;
    warnings.push("Poor contrast may obscure waveform tracing.");
  }
  if (resolution < 50) {
    score -= 14;
    warnings.push("Low resolution ECG source detected.");
  }
  if (!calibration.gridDetected) {
    score -= 16;
    warnings.push("ECG grid calibration was not confidently detected.");
  }
  if (!preprocessing.borderDetected) {
    score -= 8;
    warnings.push("ECG paper border was not confidently detected; crop may include non-ECG regions.");
  }
  const missing = missingLeads(segments);
  if (missing.length) {
    score -= Math.min(24, missing.length * 4);
    warnings.push(`Missing or low-confidence leads: ${missing.join(", ")}`);
  }
  if (metrics.noise > 0.16) warnings.push("Severe noise artifacts detected in source image.");
  if (preprocessing.contrastEnhanced) score += 3;
  if (preprocessing.noiseReduced) score += 3;
  if (preprocessing.gridEnhanced) score += 4;

  if (score < 50) warnings.push("Image quality is below recommended ECG digitization threshold.");

  return {
    metrics: { blur, brightness, contrast, cropping, gridVisibility, paperVisibility, resolution },
    score: Math.max(0, Math.min(100, score)),
    warnings: [...new Set(warnings)],
  };
}
