import path from "node:path";
import type { ECGFile } from "@prisma/client";
import { decodeEcgImage, isPdfEcgFile, preprocessEcgImage, saveProcessedPreview } from "../image-processing";
import { detectGrid } from "../grid-detector";
import { detectStandardLeadLayout } from "../lead-detector";
import { scoreImageQuality } from "../quality-service";
import { digitizeLeadsFromImage, estimateDurationSeconds } from "./trace-extractor";
import type { DigitizationPipelineResult, GridCalibration } from "../types";

const processedRoot = path.resolve(process.cwd(), "uploads", "processed-ecg");

export async function runDigitizationPipeline(
  file: Pick<ECGFile, "id" | "metadataJson" | "mimeType" | "originalName" | "sizeBytes" | "storagePath">,
  override?: Partial<GridCalibration>,
): Promise<DigitizationPipelineResult> {
  const decoded = await decodeEcgImage(file.storagePath, file.originalName, file.mimeType);
  const { image, preprocessing } = preprocessEcgImage(decoded);

  let processedPath: string | undefined;
  try {
    processedPath = await saveProcessedPreview(file.storagePath, processedRoot, file.id, file.originalName, file.mimeType);
    preprocessing.processedImagePath = processedPath;
  } catch {
    // processed preview is optional; pipeline continues with in-memory analysis
  }

  const metadata = file.metadataJson && typeof file.metadataJson === "object"
    ? file.metadataJson as Record<string, unknown>
    : {};

  const detected = detectGrid(image.buffer, image.width, image.height, { metadata, originalName: file.originalName });
  const calibration = {
    ...detected,
    ...(override?.gainMmPerMv !== undefined ? { gainMmPerMv: override.gainMmPerMv } : {}),
    ...(override?.paperSpeedMmPerSec !== undefined ? { paperSpeedMmPerSec: override.paperSpeedMmPerSec } : {}),
    ...(override?.confidence !== undefined ? { confidence: override.confidence } : {}),
    ...(override?.gridDetected !== undefined ? { gridDetected: override.gridDetected } : {}),
    ...(override?.pixelsPerSmallSquare !== undefined ? { pixelsPerSmallSquare: override.pixelsPerSmallSquare } : {}),
  } as GridCalibration;

  const leadSegments = detectStandardLeadLayout(image.buffer, image.width, image.height, image.metrics);
  const quality = scoreImageQuality({
    calibration,
    fileSizeBytes: file.sizeBytes,
    metrics: image.metrics,
    preprocessing,
    segments: leadSegments,
  });

  const durationSeconds = estimateDurationSeconds(file.originalName, isPdfEcgFile(file.originalName, file.mimeType));
  const leads = digitizeLeadsFromImage({
    calibration,
    data: image.buffer,
    durationSeconds,
    height: image.height,
    leadSegments,
    width: image.width,
  });

  return {
    calibration,
    durationSeconds,
    enhancedImagePath: processedPath,
    leadSegments,
    leads,
    preprocessing,
    quality,
  };
}
