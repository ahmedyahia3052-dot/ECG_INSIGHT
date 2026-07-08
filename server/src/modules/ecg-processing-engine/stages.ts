import type { ECGFile } from "@prisma/client";
import { detectGrid } from "../ecg-digitization/grid-detector";
import { detectStandardLeadLayout } from "../ecg-digitization/lead-detector";
import { extractLeadWaveformCenterline } from "../ecg-digitization/waveform/centerline-extractor";
import { buildDigitalSignalObjects, digitalSignalObjectsToLeads } from "../ecg-digitization/signal-engine";
import { validateDigitizedSignals } from "../ecg-digitization/validation/signal-validator";
import { scoreImageQuality } from "../ecg-digitization/quality-service";
import { enrichQualityWithTier } from "../ecg-digitization/quality-tier";
import { reconstructDigitizedLeads } from "../ecg-digitization/signal-reconstruction";
import { runEnterpriseDigitizationPipeline } from "../ecg-digitization/engine/enterprise-pipeline";
import { estimateDurationSeconds } from "../ecg-digitization/digitizer/trace-extractor";
import { isPdfEcgFile } from "../ecg-digitization/image-processing";
import {
  DEFAULT_SAMPLING_RATE,
  DIGITIZATION_PIPELINE_VERSION,
  STANDARD_LEADS,
  type DigitizationPipelineResult,
  type ImageAnalysisMetrics,
} from "../ecg-digitization/types";
import { runMeasurementEngine } from "../ecg-measurement-engine/service";
import type { ProcessingPipelineContext } from "./types";
import { decodeEcgImage, preprocessEcgImage } from "../ecg-digitization/image-processing";
import type { LeadMappingEngine, MeasurementEngineAdapter, WaveformExtractionEngine } from "./interfaces";

export const defaultLeadMappingEngine: LeadMappingEngine = {
  mapLeads(input) {
    const leadSegments = detectStandardLeadLayout(
      input.imageBuffer,
      input.width,
      input.height,
      input.imageMetrics,
    );
    return { leadSegments, mappedLeadCount: leadSegments.length };
  },
};

export const defaultWaveformExtractionEngine: WaveformExtractionEngine = {
  extract(input) {
    const extracted = extractLeadWaveformCenterline({
      calibration: input.calibration,
      data: input.imageBuffer,
      durationSeconds: input.durationSeconds,
      height: input.height,
      leadSegments: input.leadSegments,
      sampleCount: input.sampleCount,
      width: input.width,
    });
    const completeLeads = STANDARD_LEADS.map((lead) => {
      const found = extracted.leads.find((item) => item.lead === lead);
      return {
        lead,
        metrics: found?.metrics,
        samples: found?.samples ?? Array.from({ length: input.sampleCount }, () => 0),
      };
    });
    const reconstructed = reconstructDigitizedLeads(
      completeLeads.map((lead) => ({ lead: lead.lead, samples: lead.samples })),
    );
    const finalLeads = completeLeads.map((lead) => {
      const match = reconstructed.find((item) => item.lead === lead.lead);
      return match ? { ...lead, samples: match.samples } : lead;
    });
    const signalObjects = buildDigitalSignalObjects({
      calibration: input.calibration,
      durationSeconds: input.durationSeconds,
      ecgFileId: input.ecgFileId,
      leadSegments: input.leadSegments,
      leads: finalLeads,
    });
    return {
      leads: digitalSignalObjectsToLeads(signalObjects),
      waveformMetrics: Object.fromEntries(
        finalLeads.filter((lead) => lead.metrics).map((lead) => [lead.lead, lead.metrics!]),
      ),
    };
  },
};

export const defaultMeasurementEngineAdapter: MeasurementEngineAdapter = {
  async measure(input) {
    const result = runMeasurementEngine({
      calibration: input.calibration,
      leads: input.leads,
    });
    return {
      confidence: result.confidence,
      engineVersion: result.engineVersion,
      heartRateBpm: result.bundle.heartRate.heartRateBpm,
      performanceMs: result.performanceMs,
      prIntervalMs: result.bundle.intervals.prIntervalMs,
      qrsDurationMs: result.bundle.intervals.qrsDurationMs,
      qtIntervalMs: result.bundle.intervals.qtIntervalMs,
      qtcBazettMs: result.bundle.intervals.qtcBazettMs,
    };
  },
};

export async function ingestUpload(file: ECGFile) {
  if (!file.storagePath) throw new Error("ECG file storage path missing.");
  return {
    fileId: file.id,
    mimeType: file.mimeType,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    storagePath: file.storagePath,
  };
}

export async function runPreprocessStage(file: ECGFile) {
  const decoded = await decodeEcgImage(file.storagePath, file.originalName, file.mimeType);
  const { image, preprocessing } = preprocessEcgImage(decoded);
  return { decoded, image, preprocessing };
}

export function runNormalizeStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    adaptiveBrightnessApplied: preprocessing.adaptiveBrightnessApplied ?? false,
    colorNormalized: preprocessing.colorNormalized ?? false,
    gammaCorrected: preprocessing.gammaCorrected ?? false,
    histogramEqualized: preprocessing.histogramEqualized ?? false,
    normalized: true,
  };
}

export function runGridDetectStage(
  image: { buffer: Uint8Array; height: number; metrics: ImageAnalysisMetrics; width: number },
  file: ECGFile,
) {
  const metadata = file.metadataJson && typeof file.metadataJson === "object"
    ? (file.metadataJson as Record<string, unknown>)
    : {};
  return detectGrid(image.buffer, image.width, image.height, { metadata, originalName: file.originalName });
}

export function runPerspectiveCorrectionStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    deskewDegrees: preprocessing.deskewDegrees,
    perspectiveCorrected: preprocessing.perspectiveCorrected,
    rotationDegrees: preprocessing.autoRotationDegrees,
  };
}

export function runNoiseReductionStage(preprocessing: DigitizationPipelineResult["preprocessing"]) {
  return {
    backgroundCleaned: preprocessing.backgroundCleaned ?? false,
    edgeEnhanced: preprocessing.edgeEnhanced ?? false,
    noiseReduced: preprocessing.noiseReduced,
    shadowRemoved: preprocessing.shadowRemoved,
  };
}

export function runLeadMapStage(
  image: { buffer: Uint8Array; height: number; metrics: ImageAnalysisMetrics; width: number },
) {
  const leadSegments = detectStandardLeadLayout(image.buffer, image.width, image.height, image.metrics);
  return { leadSegments, mappedLeadCount: leadSegments.length };
}

export function runQualityScoreStage(input: {
  calibration: DigitizationPipelineResult["calibration"];
  fileSizeBytes: number;
  metrics: ImageAnalysisMetrics;
  preprocessing: DigitizationPipelineResult["preprocessing"];
  segments: DigitizationPipelineResult["leadSegments"];
}) {
  const quality = enrichQualityWithTier(
    scoreImageQuality({
      calibration: input.calibration,
      fileSizeBytes: input.fileSizeBytes,
      metrics: input.metrics,
      preprocessing: input.preprocessing,
      segments: input.segments,
    }),
  );
  return quality;
}

export function runValidateStage(pipeline: DigitizationPipelineResult) {
  if (pipeline.validation) return pipeline.validation;
  if (!pipeline.signalObjects?.length) {
    return { score: 0, warnings: ["No signal objects available for validation."] };
  }
  return validateDigitizedSignals({
    calibration: pipeline.calibration,
    leadSegments: pipeline.leadSegments,
    signalObjects: pipeline.signalObjects,
  });
}

export async function runFullDigitizationPipeline(file: ECGFile): Promise<DigitizationPipelineResult> {
  return runEnterpriseDigitizationPipeline(file);
}

export function buildPipelineContextSummary(ctx: ProcessingPipelineContext) {
  const pipeline = ctx.pipeline;
  if (!pipeline) return null;
  const durationSeconds = pipeline.durationSeconds
    ?? estimateDurationSeconds(fileSafeName(ctx), false);
  return {
    calibration: pipeline.calibration,
    durationSeconds,
    leadCount: pipeline.leads.length,
    pipelineVersion: pipeline.pipelineVersion ?? DIGITIZATION_PIPELINE_VERSION,
    preprocessing: pipeline.preprocessing,
    qualityScore: pipeline.quality.score,
    validationScore: pipeline.validation?.score,
  };
}

function fileSafeName(ctx: ProcessingPipelineContext) {
  return ctx.ecgFileId;
}

export function estimateWaveformSampleCount(file: ECGFile, durationSeconds: number) {
  return Math.round(durationSeconds * DEFAULT_SAMPLING_RATE);
}

export function isRasterOrPdfEcg(file: ECGFile) {
  const lowered = file.originalName.toLowerCase();
  return (
    file.mimeType.startsWith("image/")
    || file.mimeType === "application/pdf"
    || /\.(png|jpe?g|pdf)$/i.test(lowered)
  );
}
