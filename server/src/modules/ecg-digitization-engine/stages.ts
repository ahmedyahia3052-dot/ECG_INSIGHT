import type { ECGFile } from "@prisma/client";
import { detectSmartEcgFeatures } from "../ecg-digitization/acquisition/smart-ecg-detector";
import { detectGrid } from "../ecg-digitization/grid-detector";
import { decodeEcgImage, isPdfEcgFile, preprocessEcgImage } from "../ecg-digitization/image-processing";
import { detectStandardLeadLayout, missingLeads } from "../ecg-digitization/lead-detector";
import { enrichQualityWithTier } from "../ecg-digitization/quality-tier";
import { scoreImageQuality } from "../ecg-digitization/quality-service";
import { buildDigitalSignalObjects, digitalSignalObjectsToLeads } from "../ecg-digitization/signal-engine";
import { reconstructDigitizedLeads } from "../ecg-digitization/signal-reconstruction";
import { validateDigitizedSignals } from "../ecg-digitization/validation/signal-validator";
import { estimateDurationSeconds } from "../ecg-digitization/digitizer/trace-extractor";
import {
  DEFAULT_SAMPLING_RATE,
  DIGITIZATION_PIPELINE_VERSION,
  STANDARD_LEADS,
  type DigitizationPipelineResult,
  type ImageAnalysisMetrics,
} from "../ecg-digitization/types";
import type { IngestedEcgFile, LeadSegmentationEngine, WaveformExtractionEngine } from "./interfaces";
import { defaultLeadSegmentationEngine, defaultWaveformExtractionEngine } from "./waveform-engine";

export function isRasterOrPdfEcg(file: Pick<ECGFile, "mimeType" | "originalName">) {
  const lowered = file.originalName.toLowerCase();
  return (
    file.mimeType.startsWith("image/")
    || file.mimeType === "application/pdf"
    || /\.(png|jpe?g|pdf)$/i.test(lowered)
  );
}

export async function ingestStoredEcgFile(file: IngestedEcgFile) {
  if (!file.storagePath) throw new Error("ECG file storage path missing.");
  return {
    ecgFileId: file.id,
    mimeType: file.mimeType,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    storagePath: file.storagePath,
    storageProvider: file.storageProvider,
  };
}

export async function decodeStoredEcgFile(file: IngestedEcgFile) {
  return decodeEcgImage(file.storagePath, file.originalName, file.mimeType);
}

export function preprocessDecodedImage(decoded: Awaited<ReturnType<typeof decodeEcgImage>>) {
  return preprocessEcgImage(decoded);
}

export function runPaperDetectionStage(input: {
  borderDetected: boolean;
  deskewDegrees: number;
  imageBuffer: Uint8Array;
  imageHeight: number;
  imageMetrics: ImageAnalysisMetrics;
  imageWidth: number;
  preprocessing: DigitizationPipelineResult["preprocessing"];
}) {
  const smart = detectSmartEcgFeatures(
    input.imageBuffer,
    input.imageWidth,
    input.imageHeight,
    input.imageMetrics,
    input.borderDetected,
    input.deskewDegrees,
  );
  input.preprocessing.smartDetection = {
    autoCropRecommended: smart.autoCropRecommended,
    backgroundNoiseLevel: smart.backgroundNoiseLevel,
    foldedPaperLikely: smart.foldedPaperLikely,
    paperBordersDetected: smart.paperBordersDetected,
    paperColor: smart.paperColor,
    perspectiveDistortion: smart.perspectiveDistortion,
    rotationDegrees: smart.rotationDegrees,
    shadowDetected: smart.shadowDetected,
  };
  return smart;
}

export function runPerspectiveStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    perspectiveCorrected: preprocessing.perspectiveCorrected ?? false,
  };
}

export function runRotationStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    rotationDegrees: preprocessing.autoRotationDegrees ?? 0,
  };
}

export function runDeskewStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    deskewDegrees: preprocessing.deskewDegrees ?? 0,
  };
}

export function runNoiseReductionStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    backgroundCleaned: preprocessing.backgroundCleaned ?? false,
    edgeEnhanced: preprocessing.edgeEnhanced ?? false,
    noiseReduced: preprocessing.noiseReduced ?? false,
  };
}

export function runShadowRemovalStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    shadowRemoved: preprocessing.shadowRemoved ?? false,
  };
}

export function runContrastEnhancementStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    adaptiveBrightnessApplied: preprocessing.adaptiveBrightnessApplied ?? false,
    colorNormalized: preprocessing.colorNormalized ?? false,
    gammaCorrected: preprocessing.gammaCorrected ?? false,
    histogramEqualized: preprocessing.histogramEqualized ?? false,
  };
}

export function runGridDetectionStage(
  image: { buffer: Uint8Array; height: number; metrics: ImageAnalysisMetrics; width: number },
  file: IngestedEcgFile,
) {
  const metadata = file.metadataJson && typeof file.metadataJson === "object"
    ? (file.metadataJson as Record<string, unknown>)
    : {};
  return detectGrid(image.buffer, image.width, image.height, { metadata, originalName: file.originalName });
}

export function runLeadSegmentationStage(
  image: { buffer: Uint8Array; height: number; metrics: ImageAnalysisMetrics; width: number },
  engine: LeadSegmentationEngine = defaultLeadSegmentationEngine,
) {
  return engine.segment({
    imageBuffer: image.buffer,
    imageHeight: image.height,
    imageMetrics: image.metrics,
    imageWidth: image.width,
  });
}

export function runTwelveLeadDetectionStage(leadSegments: DigitizationPipelineResult["leadSegments"]) {
  const missing = missingLeads(leadSegments);
  return {
    detectedLeadCount: leadSegments.length,
    missingLeads: missing,
    twelveLeadDetected: missing.length === 0,
  };
}

export function runWaveformExtractionStage(input: {
  calibration: DigitizationPipelineResult["calibration"];
  durationSeconds: number;
  ecgFileId: string;
  image: { buffer: Uint8Array; height: number; width: number };
  leadSegments: DigitizationPipelineResult["leadSegments"];
  engine?: WaveformExtractionEngine;
}) {
  const sampleCount = Math.round(input.durationSeconds * DEFAULT_SAMPLING_RATE);
  const engine = input.engine ?? defaultWaveformExtractionEngine;
  return engine.extract({
    calibration: input.calibration,
    durationSeconds: input.durationSeconds,
    ecgFileId: input.ecgFileId,
    imageBuffer: input.image.buffer,
    imageHeight: input.image.height,
    imageWidth: input.image.width,
    leadSegments: input.leadSegments,
    sampleCount,
  });
}

export function runReconstructionStage(input: {
  calibration: DigitizationPipelineResult["calibration"];
  durationSeconds: number;
  ecgFileId: string;
  extractedLeads: Array<{ lead: string; samples: number[] }>;
  leadSegments: DigitizationPipelineResult["leadSegments"];
}) {
  const reconstructed = reconstructDigitizedLeads(input.extractedLeads);
  const signalObjects = buildDigitalSignalObjects({
    calibration: input.calibration,
    durationSeconds: input.durationSeconds,
    ecgFileId: input.ecgFileId,
    leadSegments: input.leadSegments,
    leads: reconstructed.map((lead) => ({
      lead: lead.lead,
      metrics: undefined,
      samples: lead.samples,
    })),
  });
  return {
    leads: digitalSignalObjectsToLeads(signalObjects),
    signalObjects,
  };
}

export function runValidationStage(input: {
  calibration: DigitizationPipelineResult["calibration"];
  leadSegments: DigitizationPipelineResult["leadSegments"];
  qualityInput: {
    fileSizeBytes: number;
    metrics: ImageAnalysisMetrics;
    preprocessing: DigitizationPipelineResult["preprocessing"];
  };
  signalObjects: NonNullable<DigitizationPipelineResult["signalObjects"]>;
}) {
  const quality = enrichQualityWithTier(
    scoreImageQuality({
      calibration: input.calibration,
      fileSizeBytes: input.qualityInput.fileSizeBytes,
      metrics: input.qualityInput.metrics,
      preprocessing: input.qualityInput.preprocessing,
      segments: input.leadSegments,
    }),
  );
  const validation = validateDigitizedSignals({
    calibration: input.calibration,
    leadSegments: input.leadSegments,
    signalObjects: input.signalObjects,
  });
  return { quality, validation };
}

export function estimateDigitizationDuration(file: IngestedEcgFile) {
  return estimateDurationSeconds(file.originalName, isPdfEcgFile(file.originalName, file.mimeType));
}

export function buildPipelineResult(input: {
  calibration: DigitizationPipelineResult["calibration"];
  durationSeconds: number;
  leadSegments: DigitizationPipelineResult["leadSegments"];
  leads: DigitizationPipelineResult["leads"];
  preprocessing: DigitizationPipelineResult["preprocessing"];
  quality: DigitizationPipelineResult["quality"];
  signalObjects: NonNullable<DigitizationPipelineResult["signalObjects"]>;
  validation: DigitizationPipelineResult["validation"];
}): DigitizationPipelineResult {
  return {
    calibration: input.calibration,
    durationSeconds: input.durationSeconds,
    leadSegments: input.leadSegments,
    leads: input.leads,
    pipelineVersion: DIGITIZATION_PIPELINE_VERSION,
    preprocessing: input.preprocessing,
    quality: input.quality,
    signalObjects: input.signalObjects,
    validation: input.validation,
  };
}

export { STANDARD_LEADS, DIGITIZATION_PIPELINE_VERSION, DEFAULT_SAMPLING_RATE };
