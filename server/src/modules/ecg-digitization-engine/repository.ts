import { randomUUID } from "node:crypto";
import type { EcgDigitizationJob, EcgDigitizationJobStatus, EcgDigitizationStage, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import {
  ECG_DIGITIZATION_ENGINE_VERSION,
  type DigitizationStageLogEntry,
  type EcgDigitizationJobResult,
  type EcgDigitizationStageName,
  type SerializedEcgDigitizationJob,
} from "./types";

export async function createDigitizationJob(input: {
  caseId: string;
  ecgFileId: string;
  maxAttempts?: number;
  patientId?: string;
  processingJobId?: string;
  requestedById: string;
}) {
  const existingActive = await prisma.ecgDigitizationJob.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      caseId: input.caseId,
      ecgFileId: input.ecgFileId,
      status: { in: ["QUEUED", "PROCESSING", "RETRY_SCHEDULED"] },
    },
  });
  if (existingActive) return existingActive;

  return prisma.ecgDigitizationJob.create({
    data: {
      caseId: input.caseId,
      ecgFileId: input.ecgFileId,
      engineVersion: ECG_DIGITIZATION_ENGINE_VERSION,
      jobGroupId: randomUUID(),
      maxAttempts: input.maxAttempts ?? 3,
      patientId: input.patientId,
      processingJobId: input.processingJobId,
      requestedById: input.requestedById,
      stageLog: [] as Prisma.InputJsonValue,
    },
  });
}

export async function getDigitizationJob(jobId: string) {
  return prisma.ecgDigitizationJob.findUnique({ where: { id: jobId } });
}

export async function listDigitizationJobs(filters?: {
  caseId?: string;
  limit?: number;
  status?: EcgDigitizationJobStatus;
}) {
  return prisma.ecgDigitizationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 50,
    where: {
      ...(filters?.caseId ? { caseId: filters.caseId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
  });
}

export async function claimNextDigitizationJob() {
  const now = new Date();
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const candidate = await tx.ecgDigitizationJob.findFirst({
      orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }],
      where: {
        OR: [
          { status: "QUEUED" },
          { nextRetryAt: { lte: now }, status: "RETRY_SCHEDULED" },
        ],
      },
    });
    if (!candidate) return null;
    return tx.ecgDigitizationJob.update({
      data: {
        attemptCount: candidate.attemptCount + 1,
        startedAt: candidate.startedAt ?? now,
        status: "PROCESSING",
      },
      where: { id: candidate.id },
    });
  });
}

export async function updateDigitizationJobStage(
  jobId: string,
  patch: {
    progress?: number;
    qualityScore?: number;
    stage: EcgDigitizationStageName;
    stageLog?: DigitizationStageLogEntry[];
  },
) {
  return prisma.ecgDigitizationJob.update({
    data: {
      progress: patch.progress,
      qualityScore: patch.qualityScore,
      stage: patch.stage as EcgDigitizationStage,
      ...(patch.stageLog ? { stageLog: patch.stageLog as Prisma.InputJsonValue } : {}),
    },
    where: { id: jobId },
  });
}

export async function markDigitizationJobCompleted(jobId: string, result: EcgDigitizationJobResult) {
  return prisma.ecgDigitizationJob.update({
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

export async function markDigitizationJobFailed(jobId: string, error: { code?: string; message: string }) {
  return prisma.ecgDigitizationJob.update({
    data: {
      errorCode: error.code,
      errorMessage: error.message,
      status: "FAILED",
    },
    where: { id: jobId },
  });
}

export async function scheduleDigitizationJobRetry(jobId: string, nextRetryAt: Date) {
  return prisma.ecgDigitizationJob.update({
    data: {
      nextRetryAt,
      status: "RETRY_SCHEDULED",
    },
    where: { id: jobId },
  });
}

export async function cancelDigitizationJob(jobId: string) {
  const job = await prisma.ecgDigitizationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError(404, "Digitization job not found.", "DIGITIZATION_JOB_NOT_FOUND");
  if (job.status === "COMPLETED") {
    throw new AppError(409, "Completed jobs cannot be cancelled.", "JOB_ALREADY_COMPLETED");
  }
  return prisma.ecgDigitizationJob.update({
    data: { status: "CANCELLED" },
    where: { id: jobId },
  });
}

export function serializeDigitizationJob(job: EcgDigitizationJob): SerializedEcgDigitizationJob {
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
    processingJobId: job.processingJobId ?? undefined,
    progress: job.progress,
    qualityScore: job.qualityScore ?? undefined,
    requestedById: job.requestedById,
    result: (job.resultJson as EcgDigitizationJobResult | null) ?? undefined,
    stage: job.stage as EcgDigitizationStageName,
    stageLog: Array.isArray(job.stageLog) ? (job.stageLog as DigitizationStageLogEntry[]) : [],
    startedAt: job.startedAt?.toISOString(),
    status: job.status,
    updatedAt: job.updatedAt.toISOString(),
  };
}
