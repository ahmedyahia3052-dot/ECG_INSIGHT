import { randomUUID } from "node:crypto";
import type {
  EcgIngestionEventType,
  EcgIngestionJob,
  EcgIngestionJobStatus,
  EcgIngestionPriority,
  EcgIngestionStage,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { getDuplicateDetectionWindowMs } from "./recovery";
import { parseIngestionMetrics } from "./metrics";
import {
  ECG_INGESTION_PIPELINE_VERSION,
  type EcgIngestionStageName,
  type IngestionPipelineResult,
  type IngestionStageLogEntry,
  type SerializedEcgIngestionJob,
  toIngestionStageName,
} from "./types";

export async function createIngestionJob(input: {
  caseId: string;
  checksumSha256?: string;
  ecgFileId: string;
  maxAttempts?: number;
  patientId?: string;
  priority?: EcgIngestionPriority;
  requestedById: string;
  timeoutMs?: number;
}) {
  const existingActive = await prisma.ecgIngestionJob.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      caseId: input.caseId,
      ecgFileId: input.ecgFileId,
      status: { in: ["QUEUED", "VALIDATING", "PROCESSING", "RETRY_SCHEDULED"] },
    },
  });
  if (existingActive) return existingActive;

  const jobGroupId = randomUUID();
  return prisma.ecgIngestionJob.create({
    data: {
      caseId: input.caseId,
      checksumSha256: input.checksumSha256,
      ecgFileId: input.ecgFileId,
      engineVersion: ECG_INGESTION_PIPELINE_VERSION,
      jobGroupId,
      maxAttempts: input.maxAttempts ?? 3,
      patientId: input.patientId,
      priority: input.priority ?? "NORMAL",
      requestedById: input.requestedById,
      timeoutMs: input.timeoutMs ?? 600_000,
      metricsJson: {} as Prisma.InputJsonValue,
      stageLog: [] as Prisma.InputJsonValue,
    },
  });
}

export async function getIngestionJob(jobId: string) {
  return prisma.ecgIngestionJob.findUnique({ where: { id: jobId } });
}

export async function listIngestionJobs(filters?: {
  caseId?: string;
  limit?: number;
  status?: EcgIngestionJobStatus;
}) {
  return prisma.ecgIngestionJob.findMany({
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 50,
    where: {
      ...(filters?.caseId ? { caseId: filters.caseId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
  });
}

export async function findDuplicateIngestionJob(caseId: string, checksumSha256: string, excludeJobId: string) {
  const windowStart = new Date(Date.now() - getDuplicateDetectionWindowMs());
  return prisma.ecgIngestionJob.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      caseId,
      checksumSha256,
      createdAt: { gte: windowStart },
      id: { not: excludeJobId },
      status: { in: ["COMPLETED", "DUPLICATE"] },
    },
  });
}

export async function claimNextIngestionJob() {
  const now = new Date();
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const candidate = await tx.ecgIngestionJob.findFirst({
      orderBy: [{ priority: "asc" }, { nextRetryAt: "asc" }, { createdAt: "asc" }],
      where: {
        OR: [
          { status: "QUEUED" },
          { nextRetryAt: { lte: now }, status: "RETRY_SCHEDULED" },
        ],
      },
    });
    if (!candidate) return null;
    return tx.ecgIngestionJob.update({
      data: {
        attemptCount: candidate.attemptCount + 1,
        startedAt: candidate.startedAt ?? now,
        status: "PROCESSING",
      },
      where: { id: candidate.id },
    });
  });
}

export async function appendIngestionPipelineEvent(
  ingestionJobId: string,
  input: {
    eventType: EcgIngestionEventType;
    message: string;
    payload?: Record<string, unknown>;
    stage?: EcgIngestionStageName;
  },
) {
  return prisma.ecgIngestionPipelineEvent.create({
    data: {
      eventType: input.eventType,
      ingestionJobId,
      message: input.message,
      payload: input.payload as Prisma.InputJsonValue | undefined,
      stage: input.stage as EcgIngestionStage | undefined,
    },
  });
}

export async function listIngestionPipelineEvents(ingestionJobId: string, limit = 100) {
  return prisma.ecgIngestionPipelineEvent.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
    where: { ingestionJobId },
  });
}

export async function updateIngestionJobStage(
  jobId: string,
  patch: {
    analysisId?: string;
    checksumSha256?: string;
    duplicateOfJobId?: string;
    metricsJson?: Prisma.InputJsonValue;
    orchestrationJobId?: string;
    processingJobId?: string;
    progress?: number;
    resultJson?: Prisma.InputJsonValue;
    stage?: EcgIngestionStageName;
    stageLog?: IngestionStageLogEntry[];
    status?: EcgIngestionJobStatus;
  },
) {
  return prisma.ecgIngestionJob.update({
    data: {
      ...(patch.analysisId !== undefined ? { analysisId: patch.analysisId } : {}),
      ...(patch.checksumSha256 !== undefined ? { checksumSha256: patch.checksumSha256 } : {}),
      ...(patch.duplicateOfJobId !== undefined ? { duplicateOfJobId: patch.duplicateOfJobId } : {}),
      ...(patch.metricsJson !== undefined ? { metricsJson: patch.metricsJson } : {}),
      ...(patch.orchestrationJobId !== undefined ? { orchestrationJobId: patch.orchestrationJobId } : {}),
      ...(patch.processingJobId !== undefined ? { processingJobId: patch.processingJobId } : {}),
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.resultJson !== undefined ? { resultJson: patch.resultJson } : {}),
      ...(patch.stage ? { stage: patch.stage as EcgIngestionStage } : {}),
      ...(patch.stageLog ? { stageLog: patch.stageLog as Prisma.InputJsonValue } : {}),
      ...(patch.status ? { status: patch.status } : {}),
    },
    where: { id: jobId },
  });
}

export async function markIngestionJobCompleted(jobId: string, result: IngestionPipelineResult, metricsJson?: Prisma.InputJsonValue) {
  return prisma.ecgIngestionJob.update({
    data: {
      completedAt: new Date(),
      metricsJson,
      progress: 100,
      resultJson: result as unknown as Prisma.InputJsonValue,
      stage: "COMPLETE",
      status: "COMPLETED",
    },
    where: { id: jobId },
  });
}

export async function markIngestionJobDuplicate(jobId: string, duplicateOfJobId: string, checksumSha256: string) {
  return prisma.ecgIngestionJob.update({
    data: {
      checksumSha256,
      completedAt: new Date(),
      duplicateOfJobId,
      progress: 100,
      stage: "COMPLETE",
      status: "DUPLICATE",
    },
    where: { id: jobId },
  });
}

export async function markIngestionJobFailed(jobId: string, error: { code?: string; message: string }) {
  return prisma.ecgIngestionJob.update({
    data: {
      errorCode: error.code,
      errorMessage: error.message,
      status: "FAILED",
    },
    where: { id: jobId },
  });
}

export async function markIngestionJobTimedOut(jobId: string) {
  return prisma.ecgIngestionJob.update({
    data: {
      errorCode: "PIPELINE_TIMEOUT",
      errorMessage: "ECG ingestion pipeline timed out.",
      status: "FAILED",
      timedOutAt: new Date(),
    },
    where: { id: jobId },
  });
}

export async function markIngestionJobDeadLetter(jobId: string, error: { code?: string; message: string }) {
  return prisma.ecgIngestionJob.update({
    data: {
      deadLetterAt: new Date(),
      errorCode: error.code ?? "DEAD_LETTER",
      errorMessage: error.message,
      status: "DEAD_LETTER",
    },
    where: { id: jobId },
  });
}

export async function scheduleIngestionJobRetry(jobId: string, nextRetryAt: Date, resumeFromStage?: EcgIngestionStageName) {
  return prisma.ecgIngestionJob.update({
    data: {
      nextRetryAt,
      resumeFromStage: resumeFromStage as EcgIngestionStage | undefined,
      status: "RETRY_SCHEDULED",
    },
    where: { id: jobId },
  });
}

export async function cancelIngestionJob(jobId: string) {
  const job = await prisma.ecgIngestionJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError(404, "Ingestion job not found.", "INGESTION_JOB_NOT_FOUND");
  if (["COMPLETED", "DUPLICATE"].includes(job.status)) {
    throw new AppError(409, "Completed jobs cannot be cancelled.", "JOB_ALREADY_COMPLETED");
  }
  return prisma.ecgIngestionJob.update({
    data: {
      cancelledAt: new Date(),
      status: "CANCELLED",
    },
    where: { id: jobId },
  });
}

export async function resumeIngestionJob(jobId: string, resumeFromStage?: EcgIngestionStageName) {
  const job = await prisma.ecgIngestionJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError(404, "Ingestion job not found.", "INGESTION_JOB_NOT_FOUND");
  if (!["FAILED", "CANCELLED", "DEAD_LETTER"].includes(job.status)) {
    throw new AppError(409, "Only failed, cancelled, or dead-letter jobs can be resumed.", "JOB_NOT_RESUMABLE");
  }
  return prisma.ecgIngestionJob.update({
    data: {
      cancelledAt: null,
      deadLetterAt: null,
      errorCode: null,
      errorMessage: null,
      nextRetryAt: null,
      resumeFromStage: (resumeFromStage ?? toIngestionStageName(job.stage)) as EcgIngestionStage,
      stage: (resumeFromStage ?? toIngestionStageName(job.stage)) as EcgIngestionStage,
      status: "QUEUED",
      timedOutAt: null,
    },
    where: { id: jobId },
  });
}

export async function countIngestionJobsByStatus() {
  const [queued, inFlight, completed, failed, duplicate, deadLetter] = await Promise.all([
    prisma.ecgIngestionJob.count({ where: { status: { in: ["QUEUED", "RETRY_SCHEDULED"] } } }),
    prisma.ecgIngestionJob.count({ where: { status: { in: ["VALIDATING", "PROCESSING"] } } }),
    prisma.ecgIngestionJob.count({ where: { status: "COMPLETED" } }),
    prisma.ecgIngestionJob.count({ where: { status: "FAILED" } }),
    prisma.ecgIngestionJob.count({ where: { status: "DUPLICATE" } }),
    prisma.ecgIngestionJob.count({ where: { status: "DEAD_LETTER" } }),
  ]);
  return { completed, deadLetter, duplicate, failed, inFlight, queued };
}

export function serializeIngestionJob(job: EcgIngestionJob): SerializedEcgIngestionJob {
  return {
    analysisId: job.analysisId ?? undefined,
    attemptCount: job.attemptCount,
    cancelledAt: job.cancelledAt?.toISOString(),
    caseId: job.caseId,
    checksumSha256: job.checksumSha256 ?? undefined,
    completedAt: job.completedAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    deadLetterAt: job.deadLetterAt?.toISOString(),
    duplicateOfJobId: job.duplicateOfJobId ?? undefined,
    ecgFileId: job.ecgFileId,
    engineVersion: job.engineVersion,
    errorCode: job.errorCode ?? undefined,
    errorMessage: job.errorMessage ?? undefined,
    id: job.id,
    jobGroupId: job.jobGroupId,
    maxAttempts: job.maxAttempts,
    metrics: parseIngestionMetrics(job.metricsJson),
    nextRetryAt: job.nextRetryAt?.toISOString(),
    orchestrationJobId: job.orchestrationJobId ?? undefined,
    patientId: job.patientId ?? undefined,
    priority: job.priority,
    processingJobId: job.processingJobId ?? undefined,
    progress: job.progress,
    requestedById: job.requestedById,
    result: (job.resultJson as IngestionPipelineResult | null) ?? undefined,
    resumeFromStage: job.resumeFromStage ? toIngestionStageName(job.resumeFromStage) : undefined,
    stage: toIngestionStageName(job.stage),
    stageLog: Array.isArray(job.stageLog) ? (job.stageLog as IngestionStageLogEntry[]) : [],
    startedAt: job.startedAt?.toISOString(),
    status: job.status,
    timedOutAt: job.timedOutAt?.toISOString(),
    timeoutMs: job.timeoutMs,
    updatedAt: job.updatedAt.toISOString(),
  };
}
