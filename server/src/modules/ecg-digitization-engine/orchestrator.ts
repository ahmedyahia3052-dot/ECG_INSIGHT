import { prisma } from "../../config/prisma";
import { DIGITIZATION_PIPELINE_VERSION } from "../ecg-digitization/types";
import { persistDigitizationArtifacts } from "./persist";
import {
  buildPipelineResult,
  decodeStoredEcgFile,
  estimateDigitizationDuration,
  ingestStoredEcgFile,
  preprocessDecodedImage,
  runContrastEnhancementStage,
  runDeskewStage,
  runGridDetectionStage,
  runLeadSegmentationStage,
  runNoiseReductionStage,
  runPaperDetectionStage,
  runPerspectiveStage,
  runReconstructionStage,
  runRotationStage,
  runShadowRemovalStage,
  runTwelveLeadDetectionStage,
  runValidationStage,
  runWaveformExtractionStage,
} from "./stages";
import {
  DIGITIZATION_STAGE_PROGRESS,
  ECG_DIGITIZATION_ENGINE_VERSION,
  type DigitizationPipelineContext,
  type EcgDigitizationJobResult,
  type EcgDigitizationStageName,
  type DigitizationStageLogEntry,
} from "./types";
import { updateDigitizationJobStage } from "./repository";

async function appendStageLog(
  jobId: string,
  entry: DigitizationStageLogEntry,
  patch: { progress?: number; qualityScore?: number; stage: EcgDigitizationStageName },
) {
  const job = await prisma.ecgDigitizationJob.findUnique({ where: { id: jobId }, select: { stageLog: true } });
  const stageLog = Array.isArray(job?.stageLog) ? (job!.stageLog as DigitizationStageLogEntry[]) : [];
  stageLog.push(entry);
  await updateDigitizationJobStage(jobId, {
    progress: patch.progress ?? DIGITIZATION_STAGE_PROGRESS[patch.stage],
    qualityScore: patch.qualityScore,
    stage: patch.stage,
    stageLog,
  });
}

async function runTrackedStage<T>(
  ctx: DigitizationPipelineContext,
  stage: EcgDigitizationStageName,
  runner: () => Promise<T> | T,
): Promise<T> {
  const started = Date.now();
  await updateDigitizationJobStage(ctx.jobId, {
    progress: DIGITIZATION_STAGE_PROGRESS[stage],
    stage,
  });
  try {
    const result = await runner();
    await appendStageLog(ctx.jobId, {
      durationMs: Date.now() - started,
      stage,
      status: "completed",
      timestamp: new Date().toISOString(),
    }, { stage });
    return result;
  } catch (error) {
    await appendStageLog(ctx.jobId, {
      durationMs: Date.now() - started,
      message: error instanceof Error ? error.message : "Stage failed",
      stage,
      status: "failed",
      timestamp: new Date().toISOString(),
    }, { stage });
    throw error;
  }
}

export async function executeDigitizationPipeline(ctx: DigitizationPipelineContext): Promise<EcgDigitizationJobResult> {
  const file = await prisma.eCGFile.findUnique({ where: { id: ctx.ecgFileId } });
  if (!file) throw new Error("ECG file not found for digitization job.");
  if (!file.caseId || file.caseId !== ctx.caseId) throw new Error("ECG file does not belong to digitization case.");

  await runTrackedStage(ctx, "UPLOAD_INGEST", () => ingestStoredEcgFile(file));

  const decoded = await runTrackedStage(ctx, "DECODE", () => decodeStoredEcgFile(file));
  const { image, preprocessing } = await runTrackedStage(ctx, "PREPROCESS", () => preprocessDecodedImage(decoded));

  await runTrackedStage(ctx, "PAPER_DETECT", () =>
    runPaperDetectionStage({
      borderDetected: preprocessing.borderDetected,
      deskewDegrees: preprocessing.deskewDegrees,
      imageBuffer: image.buffer,
      imageHeight: image.height,
      imageMetrics: image.metrics,
      imageWidth: image.width,
      preprocessing,
    }),
  );

  await runTrackedStage(ctx, "PERSPECTIVE_CORRECT", () => runPerspectiveStage(preprocessing));
  await runTrackedStage(ctx, "ROTATION_CORRECT", () => runRotationStage(preprocessing));
  await runTrackedStage(ctx, "DESKEW", () => runDeskewStage(preprocessing));
  await runTrackedStage(ctx, "NOISE_REDUCE", () => runNoiseReductionStage(preprocessing));
  await runTrackedStage(ctx, "SHADOW_REMOVE", () => runShadowRemovalStage(preprocessing));
  await runTrackedStage(ctx, "CONTRAST_ENHANCE", () => runContrastEnhancementStage(preprocessing));

  const calibration = await runTrackedStage(ctx, "GRID_DETECT", () => runGridDetectionStage(image, file));
  const { leadSegments } = await runTrackedStage(ctx, "LEAD_SEGMENT", () => runLeadSegmentationStage(image));
  const twelveLead = await runTrackedStage(ctx, "TWELVE_LEAD_DETECT", () => runTwelveLeadDetectionStage(leadSegments));

  const durationSeconds = estimateDigitizationDuration(file);
  const extracted = await runTrackedStage(ctx, "WAVEFORM_EXTRACT", () =>
    runWaveformExtractionStage({
      calibration,
      durationSeconds,
      ecgFileId: file.id,
      image,
      leadSegments,
    }),
  );

  const reconstructed = await runTrackedStage(ctx, "RECONSTRUCT", () =>
    runReconstructionStage({
      calibration,
      durationSeconds,
      ecgFileId: file.id,
      extractedLeads: extracted.leads.map((lead) => ({ lead: lead.lead, samples: lead.samples })),
      leadSegments,
    }),
  );

  const { quality, validation } = await runTrackedStage(ctx, "VALIDATE", () =>
    runValidationStage({
      calibration,
      leadSegments,
      qualityInput: {
        fileSizeBytes: file.sizeBytes,
        metrics: image.metrics,
        preprocessing,
      },
      signalObjects: reconstructed.signalObjects,
    }),
  );

  const pipeline = buildPipelineResult({
    calibration,
    durationSeconds,
    leadSegments,
    leads: reconstructed.leads,
    preprocessing,
    quality,
    signalObjects: reconstructed.signalObjects,
    validation,
  });
  ctx.pipeline = pipeline;

  await runTrackedStage(ctx, "PERSIST", async () => {
    await persistDigitizationArtifacts({
      actorId: ctx.actorId,
      caseId: ctx.caseId,
      ecgFileId: ctx.ecgFileId,
      pipeline,
      processingJobId: ctx.processingJobId,
    });
  });

  const result: EcgDigitizationJobResult = {
    calibration: pipeline.calibration,
    durationSeconds: pipeline.durationSeconds,
    engineVersion: ECG_DIGITIZATION_ENGINE_VERSION,
    leadSegments: pipeline.leadSegments,
    leads: pipeline.leads,
    pipelineVersion: pipeline.pipelineVersion ?? DIGITIZATION_PIPELINE_VERSION,
    preprocessing: pipeline.preprocessing,
    quality: pipeline.quality,
    twelveLeadDetected: twelveLead.twelveLeadDetected,
    validation: pipeline.validation,
  };

  ctx.result = result;
  await appendStageLog(
    ctx.jobId,
    { stage: "COMPLETE", status: "completed", timestamp: new Date().toISOString() },
    { progress: DIGITIZATION_STAGE_PROGRESS.COMPLETE, qualityScore: pipeline.quality.score, stage: "COMPLETE" },
  );

  return result;
}
