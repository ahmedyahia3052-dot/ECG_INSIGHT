import { randomUUID } from "node:crypto";
import type { EcgProcessingJob, EcgProcessingJobStatus, EcgProcessingStage, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import {
  ECG_PROCESSING_ENGINE_VERSION,
  type EcgProcessingJobResult,
  type EcgProcessingStageName,
  type ProcessingStageLogEntry,
  type SerializedEcgProcessingJob,
} from "./types";

export async function createProcessingJob(input: {
  caseId: string;
  ecgFileId: string;
  maxAttempts?: number;
  patientId?: string;
  requestedById: string;
}) {
  const existingActive = await prisma.ecgProcessingJob.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      caseId: input.caseId,
      ecgFileId: input.ecgFileId,
      status: { in: ["QUEUED", "PROCESSING", "RETRY_SCHEDULED"] },
    },
  });
  if (existingActive) return existingActive;

  const jobGroupId = randomUUID();
  return prisma.ecgProcessingJob.create({
    data: {
      caseId: input.caseId,
      ecgFileId: input.ecgFileId,
      engineVersion: ECG_PROCESSING_ENGINE_VERSION,
      jobGroupId,
      maxAttempts: input.maxAttempts ?? 3,
      patientId: input.patientId,
      requestedById: input.requestedById,
      stageLog: [] as Prisma.InputJsonValue,
    },
  });
}

export async function getProcessingJob(jobId: string) {
  return prisma.ecgProcessingJob.findUnique({ where: { id: jobId } });
}

export async function listProcessingJobs(filters?: {
  caseId?: string;
  limit?: number;
  status?: EcgProcessingJobStatus;
}) {
  return prisma.ecgProcessingJob.findMany({
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 50,
    where: {
      ...(filters?.caseId ? { caseId: filters.caseId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
  });
}

export async function claimNextQueuedJob() {
  const now = new Date();
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const candidate = await tx.ecgProcessingJob.findFirst({
      orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }],
      where: {
        OR: [
          { status: "QUEUED" },
          { nextRetryAt: { lte: now }, status: "RETRY_SCHEDULED" },
        ],
      },
    });
    if (!candidate) return null;
    return tx.ecgProcessingJob.update({
      data: {
        attemptCount: candidate.attemptCount + 1,
        startedAt: candidate.startedAt ?? now,
        status: "PROCESSING",
      },
      where: { id: candidate.id },
    });
  });
}

export async function updateProcessingJobStage(
  jobId: string,
  patch: {
    progress?: number;
    qualityScore?: number;
    stage: EcgProcessingStageName;
    stageLog?: ProcessingStageLogEntry[];
  },
) {
  return prisma.ecgProcessingJob.update({
    data: {
      progress: patch.progress,
      qualityScore: patch.qualityScore,
      stage: patch.stage as EcgProcessingStage,
      ...(patch.stageLog ? { stageLog: patch.stageLog as Prisma.InputJsonValue } : {}),
    },
    where: { id: jobId },
  });
}

export async function markProcessingJobCompleted(jobId: string, result: EcgProcessingJobResult) {
  return prisma.ecgProcessingJob.update({
    data: {
      completedAt: new Date(),
      progress: 100,
      qualityScore: result.quality.score,
      resultJson: result as unknown as Prisma.InputJsonValue,
      stage: "COMPLETE",
      status: "COMPLETED",
    },
    where: { id: jobId },
  });
}

export async function markProcessingJobFailed(jobId: string, error: { code?: string; message: string }) {
  return prisma.ecgProcessingJob.update({
    data: {
      errorCode: error.code,
      errorMessage: error.message,
      status: "FAILED",
    },
    where: { id: jobId },
  });
}

export async function scheduleProcessingJobRetry(jobId: string, nextRetryAt: Date) {
  return prisma.ecgProcessingJob.update({
    data: {
      nextRetryAt,
      status: "RETRY_SCHEDULED",
    },
    where: { id: jobId },
  });
}

export async function cancelProcessingJob(jobId: string) {
  const job = await prisma.ecgProcessingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError(404, "Processing job not found.", "PROCESSING_JOB_NOT_FOUND");
  if (job.status === "COMPLETED") throw new AppError(409, "Completed jobs cannot be cancelled.", "JOB_ALREADY_COMPLETED");
  return prisma.ecgProcessingJob.update({
    data: { status: "CANCELLED" },
    where: { id: jobId },
  });
}

export function serializeProcessingJob(job: EcgProcessingJob): SerializedEcgProcessingJob {
  return {
    attemptCount: job.attemptCount,
    caseId: job.caseId,
    completedAt: job.completedAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    ecgFileId: job.ecgFileId,
    engineVersion: job.engineVersion,
    errorCode: job.errorCode ?? undefined,
    errorMessage: job.errorMessage ?? undefined,
    id: job.id,
    jobGroupId: job.jobGroupId,
    maxAttempts: job.maxAttempts,
    nextRetryAt: job.nextRetryAt?.toISOString(),
    patientId: job.patientId ?? undefined,
    progress: job.progress,
    qualityScore: job.qualityScore ?? undefined,
    requestedById: job.requestedById,
    result: (job.resultJson as EcgProcessingJobResult | null) ?? undefined,
    stage: job.stage as EcgProcessingStageName,
    stageLog: Array.isArray(job.stageLog) ? (job.stageLog as ProcessingStageLogEntry[]) : [],
    startedAt: job.startedAt?.toISOString(),
    status: job.status,
    updatedAt: job.updatedAt.toISOString(),
  };
}
