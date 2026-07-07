import { createHash } from "node:crypto";
import path from "node:path";
import type { ECGFile } from "@prisma/client";
import { decodeEcgImage, isPdfEcgFile, preprocessEcgImage, saveProcessedPreview } from "../image-processing";
import { detectGrid } from "../grid-detector";
import { detectStandardLeadLayout } from "../lead-detector";
import { scoreImageQuality } from "../quality-service";
import { extractEcgMetadataOcr } from "../ocr/ecg-metadata-ocr";
import { extractLeadWaveformCenterline } from "../waveform/centerline-extractor";
import { buildDigitalSignalObjects, digitalSignalObjectsToLeads } from "../signal-engine";
import { validateDigitizedSignals } from "../validation/signal-validator";
import { buildGridOverlaySvg } from "../viewer";
import { estimateDurationSeconds } from "../digitizer/trace-extractor";
import { lowImageQualityError, validationFailedError } from "../errors";
import {
  DEFAULT_SAMPLING_RATE,
  DIGITIZATION_PIPELINE_VERSION,
  MIN_ACCEPTABLE_QUALITY_SCORE,
  MIN_ACCEPTABLE_VALIDATION_SCORE,
  STANDARD_LEADS,
  type DigitizationPipelineResult,
  type GridCalibration,
} from "../types";
import { detectSmartEcgFeatures } from "../acquisition/smart-ecg-detector";
import { enrichQualityWithTier } from "../quality-tier";
import { reconstructDigitizedLeads } from "../signal-reconstruction";

const processedRoot = path.resolve(process.cwd(), "uploads", "processed-ecg");

export async function runEnterpriseDigitizationPipeline(
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
    // optional preview artifact
  }

  const metadata = file.metadataJson && typeof file.metadataJson === "object"
    ? file.metadataJson as Record<string, unknown>
    : {};
  const ocrMetadata = extractEcgMetadataOcr({ metadata, originalName: file.originalName });

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
  const smartDetection = detectSmartEcgFeatures(image.buffer, image.width, image.height, image.metrics, preprocessing.borderDetected, preprocessing.deskewDegrees);
  preprocessing.smartDetection = {
    autoCropRecommended: smartDetection.autoCropRecommended,
    backgroundNoiseLevel: smartDetection.backgroundNoiseLevel,
    foldedPaperLikely: smartDetection.foldedPaperLikely,
    paperBordersDetected: smartDetection.paperBordersDetected,
    paperColor: smartDetection.paperColor,
    perspectiveDistortion: smartDetection.perspectiveDistortion,
    rotationDegrees: smartDetection.rotationDegrees,
    shadowDetected: smartDetection.shadowDetected,
  };

  const qualityRaw = scoreImageQuality({
    calibration,
    fileSizeBytes: file.sizeBytes,
    metrics: image.metrics,
    preprocessing,
    segments: leadSegments,
  });
  const quality = enrichQualityWithTier(qualityRaw);

  if (quality.score < MIN_ACCEPTABLE_QUALITY_SCORE) {
    quality.warnings.push(lowImageQualityError(quality.score).message);
  }

  const durationSeconds = estimateDurationSeconds(file.originalName, isPdfEcgFile(file.originalName, file.mimeType));
  const sampleCount = Math.round(durationSeconds * DEFAULT_SAMPLING_RATE);
  const extracted = extractLeadWaveformCenterline({
    calibration,
    data: image.buffer,
    durationSeconds,
    height: image.height,
    leadSegments,
    sampleCount,
    width: image.width,
  });

  const completeLeads = STANDARD_LEADS.map((lead) => {
    const found = extracted.leads.find((item) => item.lead === lead);
    return {
      lead,
      metrics: found?.metrics,
      samples: found?.samples ?? Array.from({ length: sampleCount }, () => 0),
    };
  });

  const reconstructedLeads = reconstructDigitizedLeads(
    completeLeads.map((lead) => ({ lead: lead.lead, samples: lead.samples })),
  );
  const finalLeads = completeLeads.map((lead) => {
    const reconstructed = reconstructedLeads.find((item) => item.lead === lead.lead);
    return reconstructed ? { ...lead, samples: reconstructed.samples } : lead;
  });

  const signalObjects = buildDigitalSignalObjects({
    calibration,
    durationSeconds,
    ecgFileId: file.id,
    leadSegments,
    leads: finalLeads,
  });
  const validation = validateDigitizedSignals({ calibration, leadSegments, signalObjects });
  if (validation.score < MIN_ACCEPTABLE_VALIDATION_SCORE) {
    quality.warnings.push(validationFailedError(validation.score, validation.warnings).message);
  }

  const normalizedImageHash = createHash("sha256").update(image.buffer).digest("hex").slice(0, 16);
  const gridOverlaySvg = buildGridOverlaySvg({
    calibration,
    height: image.height,
    leadSegments,
    width: image.width,
  });

  return {
    artifacts: {
      centerlinePaths: extracted.centerlinePaths,
      gridOverlaySvg,
      normalizedImageHash,
      ocrMetadata,
      validation,
      waveformMetrics: Object.fromEntries(
        completeLeads
          .filter((lead) => lead.metrics)
          .map((lead) => [lead.lead, lead.metrics!]),
      ),
    },
    calibration,
    durationSeconds,
    enhancedImagePath: processedPath,
    leadSegments,
    leads: digitalSignalObjectsToLeads(signalObjects),
    ocrMetadata,
    pipelineVersion: DIGITIZATION_PIPELINE_VERSION,
    preprocessing,
    quality,
    signalObjects,
    validation,
  };
}
