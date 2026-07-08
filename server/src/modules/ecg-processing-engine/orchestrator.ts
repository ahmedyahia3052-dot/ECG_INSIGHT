import { prisma } from "../../config/prisma";
import { persistMeasurementEngineResult, runMeasurementEngine } from "../ecg-measurement-engine/service";
import { DIGITIZATION_PIPELINE_VERSION } from "../ecg-digitization/types";
import { persistProcessingArtifacts } from "./persist";
import {
  ingestUpload,
  runFullDigitizationPipeline,
  runNoiseReductionStage,
  runNormalizeStage,
  runPerspectiveCorrectionStage,
  runValidateStage,
} from "./stages";
import {
  ECG_PROCESSING_ENGINE_VERSION,
  type EcgProcessingJobResult,
  type EcgProcessingStageName,
  PROCESSING_STAGE_ORDER,
  STAGE_PROGRESS,
  type ProcessingPipelineContext,
  type ProcessingStageLogEntry,
} from "./types";
import { updateProcessingJobStage } from "./repository";

async function appendStageLog(
  jobId: string,
  entry: ProcessingStageLogEntry,
  patch: {
    progress?: number;
    qualityScore?: number;
    stage: EcgProcessingStageName;
  },
) {
  const job = await prisma.ecgProcessingJob.findUnique({ where: { id: jobId }, select: { stageLog: true } });
  const stageLog = Array.isArray(job?.stageLog)
    ? (job!.stageLog as ProcessingStageLogEntry[])
    : [];
  stageLog.push(entry);
  await updateProcessingJobStage(jobId, {
    progress: patch.progress ?? STAGE_PROGRESS[patch.stage],
    qualityScore: patch.qualityScore,
    stage: patch.stage,
    stageLog,
  });
}

async function runTrackedStage<T>(
  ctx: ProcessingPipelineContext,
  stage: EcgProcessingStageName,
  runner: () => Promise<T> | T,
): Promise<T> {
  const started = Date.now();
  await updateProcessingJobStage(ctx.jobId, { progress: STAGE_PROGRESS[stage], stage });
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

export async function executeProcessingPipeline(ctx: ProcessingPipelineContext): Promise<EcgProcessingJobResult> {
  const file = await prisma.eCGFile.findUnique({ where: { id: ctx.ecgFileId } });
  if (!file) throw new Error("ECG file not found for processing job.");
  if (!file.caseId || file.caseId !== ctx.caseId) throw new Error("ECG file does not belong to processing case.");

  await runTrackedStage(ctx, "UPLOAD_INGEST", () => ingestUpload(file));

  const pipeline = await runTrackedStage(ctx, "PREPROCESS", () => runFullDigitizationPipeline(file));
  ctx.pipeline = pipeline;

  await runTrackedStage(ctx, "NORMALIZE", () => runNormalizeStage(pipeline.preprocessing));
  await runTrackedStage(ctx, "GRID_DETECT", () => pipeline.calibration);
  await runTrackedStage(ctx, "PERSPECTIVE_CORRECT", () => runPerspectiveCorrectionStage(pipeline.preprocessing));
  await runTrackedStage(ctx, "NOISE_REDUCE", () => runNoiseReductionStage(pipeline.preprocessing));
  await runTrackedStage(ctx, "LEAD_MAP", () => ({ mappedLeadCount: pipeline.leadSegments.length }));
  await runTrackedStage(ctx, "WAVEFORM_EXTRACT", () => ({ leadCount: pipeline.leads.length }));
  await runTrackedStage(ctx, "QUALITY_SCORE", () => pipeline.quality);
  await runTrackedStage(ctx, "VALIDATE", () => runValidateStage(pipeline));

  const measurement = await runTrackedStage(ctx, "MEASURE", () =>
    runMeasurementEngine({
      calibration: pipeline.calibration,
      leads: pipeline.leads,
    }),
  );

  await runTrackedStage(ctx, "PERSIST", async () => {
    await persistProcessingArtifacts({
      actorId: ctx.actorId,
      caseId: ctx.caseId,
      ecgFileId: ctx.ecgFileId,
      measurement,
      pipeline,
    });
    await persistMeasurementEngineResult(ctx.caseId, measurement);
  });

  const result: EcgProcessingJobResult = {
    calibration: pipeline.calibration,
    durationSeconds: pipeline.durationSeconds,
    engineVersion: ECG_PROCESSING_ENGINE_VERSION,
    leadSegments: pipeline.leadSegments,
    leads: pipeline.leads,
    measurement,
    pipelineVersion: pipeline.pipelineVersion ?? DIGITIZATION_PIPELINE_VERSION,
    preprocessing: pipeline.preprocessing,
    quality: pipeline.quality,
    validation: pipeline.validation,
  };

  ctx.result = result;
  await appendStageLog(
    ctx.jobId,
    { stage: "COMPLETE", status: "completed", timestamp: new Date().toISOString() },
    { progress: STAGE_PROGRESS.COMPLETE, qualityScore: pipeline.quality.score, stage: "COMPLETE" },
  );

  return result;
}

export function nextStageAfter(current: EcgProcessingStageName): EcgProcessingStageName | null {
  const index = PROCESSING_STAGE_ORDER.indexOf(current);
  if (index < 0 || index >= PROCESSING_STAGE_ORDER.length - 1) return null;
  return PROCESSING_STAGE_ORDER[index + 1] ?? null;
}
