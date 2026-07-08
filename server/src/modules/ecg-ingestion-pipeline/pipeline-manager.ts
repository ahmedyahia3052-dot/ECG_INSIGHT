import fs from "node:fs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { createNotification } from "../../utils/notifications";
import { enqueueCaseOrchestration } from "../ai-orchestration-engine/ai-orchestration-engine.service";
import { getOrchestrationJob } from "../ai-orchestration-engine/repository";
import { enqueueCaseProcessing } from "../ecg-processing-engine/ecg-processing-engine.service";
import { getProcessingJob } from "../ecg-processing-engine/repository";
import { computeFileSha256 } from "./checksum";
import { finalizeIngestionMetrics, parseIngestionMetrics, recordStageDuration } from "./metrics";
import {
  appendIngestionPipelineEvent,
  findDuplicateIngestionJob,
  getIngestionJob,
  markIngestionJobCompleted,
  markIngestionJobDuplicate,
  updateIngestionJobStage,
} from "./repository";
import { hasIngestionTimedOut } from "./recovery";
import {
  INGESTION_STAGE_PROGRESS,
  type EcgIngestionStageName,
  type IngestionAdvanceResult,
  type IngestionPipelineResult,
  type IngestionStageLogEntry,
  nextIngestionStage,
  toIngestionStageName,
  ECG_INGESTION_PIPELINE_VERSION,
} from "./types";

function appendStageLog(
  existing: IngestionStageLogEntry[],
  entry: IngestionStageLogEntry,
): IngestionStageLogEntry[] {
  return [...existing, entry];
}

async function emitEvent(
  jobId: string,
  eventType: Parameters<typeof appendIngestionPipelineEvent>[1]["eventType"],
  message: string,
  stage?: EcgIngestionStageName,
  payload?: Record<string, unknown>,
) {
  await appendIngestionPipelineEvent(jobId, { eventType, message, payload, stage });
}

async function runStage<T>(
  jobId: string,
  stage: EcgIngestionStageName,
  stageLog: IngestionStageLogEntry[],
  metrics: ReturnType<typeof parseIngestionMetrics>,
  fn: () => Promise<T>,
): Promise<{ metrics: ReturnType<typeof parseIngestionMetrics>; result: T; stageLog: IngestionStageLogEntry[] }> {
  const started = Date.now();
  await emitEvent(jobId, "STAGE_STARTED", `Stage ${stage} started.`, stage);
  await updateIngestionJobStage(jobId, {
    progress: INGESTION_STAGE_PROGRESS[stage],
    stage,
    stageLog: appendStageLog(stageLog, {
      message: `Running ${stage}`,
      stage,
      status: "running",
      timestamp: new Date().toISOString(),
    }),
    status: "PROCESSING",
  });

  try {
    const result = await fn();
    const durationMs = Date.now() - started;
    const updatedMetrics = recordStageDuration(metrics, stage, durationMs);
    const completedLog = appendStageLog(stageLog, {
      durationMs,
      message: `Stage ${stage} completed.`,
      stage,
      status: "completed",
      timestamp: new Date().toISOString(),
    });
    await emitEvent(jobId, "STAGE_COMPLETED", `Stage ${stage} completed.`, stage, { durationMs });
    await updateIngestionJobStage(jobId, {
      metricsJson: updatedMetrics as unknown as Prisma.InputJsonValue,
      progress: INGESTION_STAGE_PROGRESS[stage],
      stage,
      stageLog: completedLog,
    });
    return { metrics: updatedMetrics, result, stageLog: completedLog };
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : "Stage failed.";
    const failedLog = appendStageLog(stageLog, {
      durationMs,
      message,
      stage,
      status: "failed",
      timestamp: new Date().toISOString(),
    });
    await emitEvent(jobId, "STAGE_FAILED", message, stage, { durationMs });
    await updateIngestionJobStage(jobId, { stage, stageLog: failedLog, status: "FAILED" });
    throw error;
  }
}

export async function advanceIngestionPipeline(jobId: string): Promise<IngestionAdvanceResult> {
  const job = await getIngestionJob(jobId);
  if (!job) return "FAILED";
  if (["COMPLETED", "DUPLICATE", "CANCELLED", "DEAD_LETTER"].includes(job.status)) {
    return job.status === "DUPLICATE" ? "DUPLICATE" : "COMPLETED";
  }
  if (hasIngestionTimedOut(job.startedAt, job.timeoutMs)) {
    await emitEvent(jobId, "TIMED_OUT", "Ingestion pipeline timed out.", toIngestionStageName(job.stage));
    return "FAILED";
  }

  let stage = job.resumeFromStage ? toIngestionStageName(job.resumeFromStage) : toIngestionStageName(job.stage);
  let stageLog = Array.isArray(job.stageLog) ? (job.stageLog as IngestionStageLogEntry[]) : [];
  let metrics = parseIngestionMetrics(job.metricsJson);
  const pipelineResult: IngestionPipelineResult = {
    checksumSha256: job.checksumSha256 ?? undefined,
    engineVersion: ECG_INGESTION_PIPELINE_VERSION,
    orchestrationJobId: job.orchestrationJobId ?? undefined,
    processingJobId: job.processingJobId ?? undefined,
  };

  if (stage === "UPLOAD") {
    const next = nextIngestionStage(stage)!;
    await updateIngestionJobStage(jobId, { progress: INGESTION_STAGE_PROGRESS.UPLOAD, stage: next, status: "PROCESSING" });
    stage = next;
  }

  if (stage === "VALIDATE") {
    const ecgFile = await prisma.eCGFile.findUnique({ where: { id: job.ecgFileId } });
    if (!ecgFile) throw new Error("ECG file not found.");
    if (!fs.existsSync(ecgFile.storagePath)) throw new Error("ECG storage path missing.");

    const validateRun = await runStage(jobId, "VALIDATE", stageLog, metrics, async () => {
      const checksumStarted = Date.now();
      const checksumSha256 = await computeFileSha256(ecgFile.storagePath);
      metrics = recordStageDuration(metrics, "VALIDATE", Date.now() - checksumStarted);
      await emitEvent(jobId, "CHECKSUM_COMPUTED", "File checksum computed.", "VALIDATE", { checksumSha256 });

      const duplicate = await findDuplicateIngestionJob(job.caseId, checksumSha256, job.id);
      if (duplicate) {
        await emitEvent(jobId, "DUPLICATE_DETECTED", "Duplicate ingestion detected.", "VALIDATE", {
          duplicateOfJobId: duplicate.id,
        });
        await markIngestionJobDuplicate(job.id, duplicate.id, checksumSha256);
        return { duplicate: true as const, checksumSha256 };
      }
      return { duplicate: false as const, checksumSha256 };
    });
    stageLog = validateRun.stageLog;
    metrics = validateRun.metrics;
    if (validateRun.result.duplicate) return "DUPLICATE";
    pipelineResult.checksumSha256 = validateRun.result.checksumSha256;
    stage = nextIngestionStage("VALIDATE")!;
  }

  if (stage === "STORAGE") {
    const storageRun = await runStage(jobId, "STORAGE", stageLog, metrics, async () => {
      await prisma.eCGFile.update({
        data: { checksum: pipelineResult.checksumSha256 },
        where: { id: job.ecgFileId },
      });
      return true;
    });
    stageLog = storageRun.stageLog;
    metrics = storageRun.metrics;
    stage = nextIngestionStage("STORAGE")!;
  }

  if (stage === "QUEUE") {
    await emitEvent(jobId, "PROGRESS", "Job queued for processing.", "QUEUE");
    await updateIngestionJobStage(jobId, {
      checksumSha256: pipelineResult.checksumSha256,
      progress: INGESTION_STAGE_PROGRESS.QUEUE,
      stage: "PROCESSING",
      status: "PROCESSING",
    });
    stage = "PROCESSING";
  }

  if (stage === "PROCESSING") {
    let processingJobId = job.processingJobId;
    if (!processingJobId) {
      const processingJob = await enqueueCaseProcessing({
        caseId: job.caseId,
        ecgFileId: job.ecgFileId,
        requestedById: job.requestedById,
      });
      processingJobId = processingJob.id;
      pipelineResult.processingJobId = processingJobId;
      await updateIngestionJobStage(jobId, { processingJobId, stage: "PROCESSING" });
      await emitEvent(jobId, "CHILD_JOB_ENQUEUED", "Processing job enqueued.", "PROCESSING", { processingJobId });
      return "WAIT";
    }

    const processingJob = await getProcessingJob(processingJobId);
    if (!processingJob) throw new Error("Processing job not found.");
    if (["QUEUED", "PROCESSING", "RETRY_SCHEDULED"].includes(processingJob.status)) {
      await updateIngestionJobStage(jobId, {
        progress: Math.max(job.progress, INGESTION_STAGE_PROGRESS.PROCESSING - 5),
        stage: "PROCESSING",
        stageLog: appendStageLog(stageLog, {
          message: "Waiting for processing job.",
          stage: "PROCESSING",
          status: "waiting",
          timestamp: new Date().toISOString(),
        }),
      });
      return "WAIT";
    }
    if (processingJob.status === "FAILED" || processingJob.status === "CANCELLED") {
      throw new Error(processingJob.errorMessage ?? "Processing job failed.");
    }

    pipelineResult.processingResult = processingJob.resultJson ?? undefined;
    await emitEvent(jobId, "CHILD_JOB_COMPLETED", "Processing job completed.", "PROCESSING", { processingJobId });
    stage = nextIngestionStage("PROCESSING")!;
  }

  if (stage === "AI_ORCHESTRATION") {
    let orchestrationJobId = job.orchestrationJobId;
    if (!orchestrationJobId) {
      const orchestrationJob = await enqueueCaseOrchestration({
        analysisId: job.analysisId ?? undefined,
        caseId: job.caseId,
        requestedById: job.requestedById,
        timeoutMs: Math.max(60_000, Math.floor(job.timeoutMs / 2)),
      });
      orchestrationJobId = orchestrationJob.id;
      pipelineResult.orchestrationJobId = orchestrationJobId;
      await updateIngestionJobStage(jobId, { orchestrationJobId, stage: "AI_ORCHESTRATION" });
      await emitEvent(jobId, "CHILD_JOB_ENQUEUED", "Orchestration job enqueued.", "AI_ORCHESTRATION", {
        orchestrationJobId,
      });
      return "WAIT";
    }

    const orchestrationJob = await getOrchestrationJob(orchestrationJobId);
    if (!orchestrationJob) throw new Error("Orchestration job not found.");
    if (["QUEUED", "PROCESSING", "RETRY_SCHEDULED"].includes(orchestrationJob.status)) {
      await updateIngestionJobStage(jobId, {
        progress: Math.max(job.progress, INGESTION_STAGE_PROGRESS.AI_ORCHESTRATION - 5),
        stage: "AI_ORCHESTRATION",
      });
      return "WAIT";
    }
    if (["FAILED", "CANCELLED", "TIMED_OUT"].includes(orchestrationJob.status)) {
      throw new Error(orchestrationJob.errorMessage ?? "Orchestration job failed.");
    }

    pipelineResult.orchestrationResult = orchestrationJob.resultJson ?? undefined;
    pipelineResult.analysisId = orchestrationJob.analysisId ?? undefined;
    await updateIngestionJobStage(jobId, {
      analysisId: orchestrationJob.analysisId ?? undefined,
      stage: "AI_ORCHESTRATION",
    });
    await emitEvent(jobId, "CHILD_JOB_COMPLETED", "Orchestration job completed.", "AI_ORCHESTRATION", {
      orchestrationJobId,
    });
    stage = nextIngestionStage("AI_ORCHESTRATION")!;
  }

  if (stage === "RESULTS") {
    const resultsRun = await runStage(jobId, "RESULTS", stageLog, metrics, async () => ({
      analysisId: pipelineResult.analysisId,
      orchestrationJobId: pipelineResult.orchestrationJobId,
      processingJobId: pipelineResult.processingJobId,
    }));
    stageLog = resultsRun.stageLog;
    metrics = resultsRun.metrics;
    stage = nextIngestionStage("RESULTS")!;
  }

  if (stage === "PERSIST") {
    const persistRun = await runStage(jobId, "PERSIST", stageLog, metrics, async () => {
      if (pipelineResult.analysisId) {
        const analysis = await prisma.aIAnalysis.findUnique({ where: { id: pipelineResult.analysisId } });
        if (!analysis) throw new Error("Persisted analysis record not found.");
      }
      return true;
    });
    stageLog = persistRun.stageLog;
    metrics = persistRun.metrics;
    stage = nextIngestionStage("PERSIST")!;
  }

  if (stage === "NOTIFICATION") {
    const ecgCase = await prisma.eCGCase.findUnique({
      select: { caseId: true, id: true, patientId: true, priority: true },
      where: { id: job.caseId },
    });
    const notifyRun = await runStage(jobId, "NOTIFICATION", stageLog, metrics, async () => {
      await createNotification({
        caseId: job.caseId,
        message: `ECG ingestion pipeline completed for case ${ecgCase?.caseId ?? job.caseId}.`,
        patientId: ecgCase?.patientId ?? job.patientId ?? undefined,
        targetRole: "DOCTOR",
        title: "ECG Ingestion Complete",
        type: ecgCase?.priority === "CRITICAL" ? "CRITICAL" : "SUCCESS",
      });
      await emitEvent(jobId, "NOTIFICATION_SENT", "Completion notification sent.", "NOTIFICATION");
      return true;
    });
    metrics = { ...notifyRun.metrics, notificationSent: true };
  }

  metrics = finalizeIngestionMetrics(metrics, job.startedAt, new Date());
  await markIngestionJobCompleted(jobId, pipelineResult, metrics as unknown as Prisma.InputJsonValue);
  await emitEvent(jobId, "STAGE_COMPLETED", "Ingestion pipeline completed.", "COMPLETE");
  return "COMPLETED";
}
