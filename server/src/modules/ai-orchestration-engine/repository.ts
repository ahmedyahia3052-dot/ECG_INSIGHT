import { randomUUID } from "node:crypto";
import type {
  AiOrchestrationJob,
  AiOrchestrationJobStatus,
  AiOrchestrationPipelineKind,
  AiProviderPreference,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import {
  AI_ORCHESTRATION_ENGINE_VERSION,
  type AiOrchestrationJobResult,
  type AiOrchestrationStageName,
  type OrchestrationProcessingLogEntry,
  type OrchestrationStageLogEntry,
  type SerializedAiOrchestrationJob,
} from "./types";
import { getDefaultOrchestrationTimeoutMs } from "./recovery";

export async function createOrchestrationJob(input: {
  analysisId?: string;
  caseId: string;
  maxAttempts?: number;
  patientId?: string;
  pipelineKind?: AiOrchestrationPipelineKind;
  providerPreference?: AiProviderPreference;
  requestedById: string;
  timeoutMs?: number;
}) {
  const existingActive = await prisma.aiOrchestrationJob.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      caseId: input.caseId,
      status: { in: ["QUEUED", "PROCESSING", "RETRY_SCHEDULED"] },
      ...(input.analysisId ? { analysisId: input.analysisId } : {}),
    },
  });
  if (existingActive) return existingActive;

  const jobGroupId = randomUUID();
  return prisma.aiOrchestrationJob.create({
    data: {
      analysisId: input.analysisId,
      caseId: input.caseId,
      engineVersion: AI_ORCHESTRATION_ENGINE_VERSION,
      jobGroupId,
      maxAttempts: input.maxAttempts ?? 3,
      patientId: input.patientId,
      pipelineKind: input.pipelineKind ?? "FULL",
      providerPreference: input.providerPreference ?? "AUTO",
      requestedById: input.requestedById,
      timeoutMs: input.timeoutMs ?? getDefaultOrchestrationTimeoutMs(),
      processingLogs: [] as Prisma.InputJsonValue,
      stageLog: [] as Prisma.InputJsonValue,
    },
  });
}

export async function getOrchestrationJob(jobId: string) {
  return prisma.aiOrchestrationJob.findUnique({ where: { id: jobId } });
}

export async function listOrchestrationJobs(filters?: {
  caseId?: string;
  limit?: number;
  status?: AiOrchestrationJobStatus;
}) {
  return prisma.aiOrchestrationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 50,
    where: {
      ...(filters?.caseId ? { caseId: filters.caseId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
  });
}

export async function claimNextOrchestrationJob() {
  const now = new Date();
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const candidate = await tx.aiOrchestrationJob.findFirst({
      orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }],
      where: {
        OR: [
          { status: "QUEUED" },
          { nextRetryAt: { lte: now }, status: "RETRY_SCHEDULED" },
        ],
      },
    });
    if (!candidate) return null;
    return tx.aiOrchestrationJob.update({
      data: {
        attemptCount: candidate.attemptCount + 1,
        startedAt: candidate.startedAt ?? now,
        status: "PROCESSING",
      },
      where: { id: candidate.id },
    });
  });
}

export async function updateOrchestrationJobStage(
  jobId: string,
  patch: {
    analysisId?: string;
    progress?: number;
    stage: AiOrchestrationStageName;
    stageLog?: OrchestrationStageLogEntry[];
    processingLogs?: OrchestrationProcessingLogEntry[];
  },
) {
  return prisma.aiOrchestrationJob.update({
    data: {
      analysisId: patch.analysisId,
      progress: patch.progress,
      stage: patch.stage,
      ...(patch.stageLog ? { stageLog: patch.stageLog as Prisma.InputJsonValue } : {}),
      ...(patch.processingLogs ? { processingLogs: patch.processingLogs as Prisma.InputJsonValue } : {}),
    },
    where: { id: jobId },
  });
}

export async function appendOrchestrationProcessingLog(
  jobId: string,
  entry: OrchestrationProcessingLogEntry,
) {
  const job = await prisma.aiOrchestrationJob.findUnique({
    select: { processingLogs: true },
    where: { id: jobId },
  });
  const processingLogs = Array.isArray(job?.processingLogs)
    ? (job!.processingLogs as OrchestrationProcessingLogEntry[])
    : [];
  processingLogs.push(entry);
  return prisma.aiOrchestrationJob.update({
    data: { processingLogs: processingLogs as Prisma.InputJsonValue },
    where: { id: jobId },
  });
}

export async function markOrchestrationJobCompleted(jobId: string, result: AiOrchestrationJobResult) {
  return prisma.aiOrchestrationJob.update({
    data: {
      analysisId: result.analysisId,
      completedAt: new Date(),
      progress: 100,
      resultJson: result as unknown as Prisma.InputJsonValue,
      stage: "COMPLETE",
      status: "COMPLETED",
    },
    where: { id: jobId },
  });
}

export async function markOrchestrationJobFailed(
  jobId: string,
  error: { code?: string; message: string },
  status: "FAILED" | "TIMED_OUT" = "FAILED",
) {
  return prisma.aiOrchestrationJob.update({
    data: {
      errorCode: error.code,
      errorMessage: error.message,
      status,
      ...(status === "TIMED_OUT" ? { timedOutAt: new Date() } : {}),
    },
    where: { id: jobId },
  });
}

export async function scheduleOrchestrationJobRetry(jobId: string, nextRetryAt: Date) {
  return prisma.aiOrchestrationJob.update({
    data: {
      nextRetryAt,
      status: "RETRY_SCHEDULED",
    },
    where: { id: jobId },
  });
}

export async function cancelOrchestrationJob(jobId: string) {
  const job = await prisma.aiOrchestrationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError(404, "Orchestration job not found.", "ORCHESTRATION_JOB_NOT_FOUND");
  if (job.status === "COMPLETED") {
    throw new AppError(409, "Completed jobs cannot be cancelled.", "JOB_ALREADY_COMPLETED");
  }
  return prisma.aiOrchestrationJob.update({
    data: { status: "CANCELLED" },
    where: { id: jobId },
  });
}

export function serializeOrchestrationJob(job: AiOrchestrationJob): SerializedAiOrchestrationJob {
  return {
    analysisId: job.analysisId ?? undefined,
    attemptCount: job.attemptCount,
    caseId: job.caseId,
    completedAt: job.completedAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    engineVersion: job.engineVersion,
    errorCode: job.errorCode ?? undefined,
    errorMessage: job.errorMessage ?? undefined,
    id: job.id,
    jobGroupId: job.jobGroupId,
    maxAttempts: job.maxAttempts,
    nextRetryAt: job.nextRetryAt?.toISOString(),
    patientId: job.patientId ?? undefined,
    pipelineKind: job.pipelineKind,
    processingLogs: Array.isArray(job.processingLogs)
      ? (job.processingLogs as OrchestrationProcessingLogEntry[])
      : [],
    progress: job.progress,
    providerPreference: job.providerPreference,
    requestedById: job.requestedById,
    result: (job.resultJson as AiOrchestrationJobResult | null) ?? undefined,
    stage: job.stage as AiOrchestrationStageName,
    stageLog: Array.isArray(job.stageLog) ? (job.stageLog as OrchestrationStageLogEntry[]) : [],
    startedAt: job.startedAt?.toISOString(),
    status: job.status,
    timedOutAt: job.timedOutAt?.toISOString(),
    timeoutMs: job.timeoutMs,
    updatedAt: job.updatedAt.toISOString(),
  };
}
