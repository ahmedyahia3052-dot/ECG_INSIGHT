import type { ECGPriority, EcgIngestionJobStatus, EcgIngestionPriority } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { summarizeIngestionMetrics } from "./metrics";
import {
  cancelIngestionJob as cancelIngestionJobRecord,
  countIngestionJobsByStatus,
  createIngestionJob,
  getIngestionJob,
  listIngestionJobs,
  listIngestionPipelineEvents,
  resumeIngestionJob as resumeIngestionJobRecord,
  scheduleIngestionJobRetry,
  serializeIngestionJob,
  appendIngestionPipelineEvent,
} from "./repository";
import { scheduleIngestionRetryAt } from "./recovery";
import { ECG_INGESTION_PIPELINE_VERSION, type EcgIngestionStageName } from "./types";
import {
  ensureIngestionWorkerStarted,
  getIngestionWorkerStats,
  triggerIngestionWorkerPump,
} from "./worker-adapter";
import { cancelIngestionChildJobs } from "./worker";
import "./worker";

function mapCasePriorityToIngestion(priority: ECGPriority): EcgIngestionPriority {
  switch (priority) {
    case "LOW":
      return "LOW";
    case "HIGH":
      return "HIGH";
    case "CRITICAL":
      return "CRITICAL";
    default:
      return "NORMAL";
  }
}

export async function enqueueIngestion(input: {
  caseId: string;
  ecgFileId: string;
  maxAttempts?: number;
  priority?: EcgIngestionPriority;
  requestedById: string;
  timeoutMs?: number;
}) {
  const ecgCase = await prisma.eCGCase.findUnique({
    select: { id: true, patientId: true, priority: true },
    where: { id: input.caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

  const ecgFile = await prisma.eCGFile.findUnique({ where: { id: input.ecgFileId } });
  if (!ecgFile) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  if (ecgFile.caseId !== input.caseId) {
    throw new AppError(422, "ECG file does not belong to case.", "ECG_FILE_CASE_MISMATCH");
  }

  const job = await createIngestionJob({
    caseId: input.caseId,
    checksumSha256: ecgFile.checksum ?? undefined,
    ecgFileId: input.ecgFileId,
    maxAttempts: input.maxAttempts,
    patientId: ecgCase.patientId,
    priority: input.priority ?? mapCasePriorityToIngestion(ecgCase.priority),
    requestedById: input.requestedById,
    timeoutMs: input.timeoutMs,
  });

  await appendIngestionPipelineEvent(job.id, {
    eventType: "PROGRESS",
    message: "Ingestion job enqueued.",
    stage: "UPLOAD",
  });

  ensureIngestionWorkerStarted();
  void triggerIngestionWorkerPump();

  return serializeIngestionJob(job);
}

export async function enqueueIngestionFromUpload(input: {
  caseId: string;
  ecgFileId: string;
  requestedById: string;
}) {
  return enqueueIngestion(input);
}

export async function getCaseIngestionJob(jobId: string) {
  const job = await getIngestionJob(jobId);
  if (!job) throw new AppError(404, "Ingestion job not found.", "INGESTION_JOB_NOT_FOUND");
  return serializeIngestionJob(job);
}

export async function listCaseIngestionJobs(filters?: {
  caseId?: string;
  limit?: number;
  status?: EcgIngestionJobStatus;
}) {
  const jobs = await listIngestionJobs(filters);
  return jobs.map(serializeIngestionJob);
}

export async function listCaseIngestionEvents(jobId: string, limit?: number) {
  await getCaseIngestionJob(jobId);
  const events = await listIngestionPipelineEvents(jobId, limit ?? 100);
  return events.map((event) => ({
    createdAt: event.createdAt.toISOString(),
    eventType: event.eventType,
    id: event.id,
    message: event.message,
    payload: event.payload ?? undefined,
    stage: event.stage ?? undefined,
  }));
}

export async function cancelCaseIngestionJob(jobId: string) {
  const existing = await getIngestionJob(jobId);
  if (!existing) throw new AppError(404, "Ingestion job not found.", "INGESTION_JOB_NOT_FOUND");
  await cancelIngestionChildJobs(jobId);
  const job = await cancelIngestionJobRecord(jobId);
  await appendIngestionPipelineEvent(jobId, {
    eventType: "CANCELLED",
    message: "Ingestion job cancelled.",
    stage: job.stage,
  });
  return serializeIngestionJob(job);
}

export async function resumeCaseIngestionJob(jobId: string, resumeFromStage?: EcgIngestionStageName) {
  const job = await resumeIngestionJobRecord(jobId, resumeFromStage);
  await appendIngestionPipelineEvent(jobId, {
    eventType: "RESUMED",
    message: resumeFromStage ? `Ingestion resumed from ${resumeFromStage}.` : "Ingestion resumed.",
    stage: job.stage,
  });
  ensureIngestionWorkerStarted();
  void triggerIngestionWorkerPump();
  return serializeIngestionJob(job);
}

export async function retryCaseIngestionJob(jobId: string, force = false) {
  const job = await getIngestionJob(jobId);
  if (!job) throw new AppError(404, "Ingestion job not found.", "INGESTION_JOB_NOT_FOUND");
  if (!force && !["FAILED", "DEAD_LETTER"].includes(job.status)) {
    throw new AppError(409, "Only failed or dead-letter jobs can be retried.", "JOB_NOT_RETRYABLE");
  }
  if (job.attemptCount >= job.maxAttempts && !force) {
    throw new AppError(409, "Maximum retry attempts exceeded.", "MAX_ATTEMPTS_EXCEEDED");
  }
  const nextRetryAt = scheduleIngestionRetryAt(job.attemptCount + 1);
  const updated = await scheduleIngestionJobRetry(jobId, nextRetryAt);
  await appendIngestionPipelineEvent(jobId, {
    eventType: "RETRY_SCHEDULED",
    message: `Manual retry scheduled at ${nextRetryAt.toISOString()}.`,
  });
  ensureIngestionWorkerStarted();
  void triggerIngestionWorkerPump();
  return serializeIngestionJob(updated);
}

export async function getIngestionPipelineMetrics() {
  const counts = await countIngestionJobsByStatus();
  return summarizeIngestionMetrics(counts);
}

export function getIngestionPipelineHealth() {
  return {
    engineVersion: ECG_INGESTION_PIPELINE_VERSION,
    metrics: undefined as Awaited<ReturnType<typeof getIngestionPipelineMetrics>> | undefined,
    ok: true,
    service: "ecg-ingestion-pipeline",
    worker: getIngestionWorkerStats(),
  };
}

export async function getIngestionPipelineHealthDetailed() {
  const health = getIngestionPipelineHealth();
  health.metrics = await getIngestionPipelineMetrics();
  return health;
}
