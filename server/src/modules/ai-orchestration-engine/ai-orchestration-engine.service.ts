import type { AiOrchestrationJobStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { listFutureAiProviders } from "./providers/registry";
import {
  cancelOrchestrationJob,
  createOrchestrationJob,
  getOrchestrationJob,
  listOrchestrationJobs,
  scheduleOrchestrationJobRetry,
  serializeOrchestrationJob,
} from "./repository";
import { scheduleOrchestrationRetryAt } from "./recovery";
import {
  ensureOrchestrationWorkerStarted,
  getOrchestrationWorkerStats,
  triggerOrchestrationWorkerPump,
} from "./worker";
import { AI_ORCHESTRATION_ENGINE_VERSION } from "./types";

export async function enqueueCaseOrchestration(input: {
  analysisId?: string;
  caseId: string;
  maxAttempts?: number;
  pipelineKind?: "FULL" | "ECG_ONLY" | "LLM_ONLY";
  providerPreference?: "AUTO" | "OPENAI" | "OLLAMA" | "RULE_BASED";
  requestedById: string;
  timeoutMs?: number;
}) {
  const ecgCase = await prisma.eCGCase.findUnique({
    select: { id: true, patientId: true },
    where: { id: input.caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

  if (input.analysisId) {
    const analysis = await prisma.aIAnalysis.findUnique({ where: { id: input.analysisId } });
    if (!analysis) throw new AppError(404, "AI analysis not found.", "ANALYSIS_NOT_FOUND");
    if (analysis.caseId !== input.caseId) {
      throw new AppError(422, "AI analysis does not belong to case.", "ANALYSIS_CASE_MISMATCH");
    }
  }

  const job = await createOrchestrationJob({
    analysisId: input.analysisId,
    caseId: input.caseId,
    maxAttempts: input.maxAttempts,
    patientId: ecgCase.patientId,
    pipelineKind: input.pipelineKind,
    providerPreference: input.providerPreference,
    requestedById: input.requestedById,
    timeoutMs: input.timeoutMs,
  });

  ensureOrchestrationWorkerStarted();
  void triggerOrchestrationWorkerPump();

  return serializeOrchestrationJob(job);
}

export async function getCaseOrchestrationJob(jobId: string) {
  const job = await getOrchestrationJob(jobId);
  if (!job) throw new AppError(404, "Orchestration job not found.", "ORCHESTRATION_JOB_NOT_FOUND");
  return serializeOrchestrationJob(job);
}

export async function listCaseOrchestrationJobs(filters?: {
  caseId?: string;
  limit?: number;
  status?: AiOrchestrationJobStatus;
}) {
  const jobs = await listOrchestrationJobs(filters);
  return jobs.map(serializeOrchestrationJob);
}

export async function cancelCaseOrchestrationJob(jobId: string) {
  const job = await cancelOrchestrationJob(jobId);
  return serializeOrchestrationJob(job);
}

export async function retryCaseOrchestrationJob(jobId: string, force = false) {
  const job = await getOrchestrationJob(jobId);
  if (!job) throw new AppError(404, "Orchestration job not found.", "ORCHESTRATION_JOB_NOT_FOUND");
  if (!force && !["FAILED", "TIMED_OUT"].includes(job.status)) {
    throw new AppError(409, "Only failed or timed-out jobs can be retried.", "JOB_NOT_RETRYABLE");
  }
  if (job.attemptCount >= job.maxAttempts && !force) {
    throw new AppError(409, "Maximum retry attempts exceeded.", "MAX_ATTEMPTS_EXCEEDED");
  }
  const nextRetryAt = scheduleOrchestrationRetryAt(job.attemptCount + 1);
  const updated = await scheduleOrchestrationJobRetry(jobId, nextRetryAt);
  ensureOrchestrationWorkerStarted();
  void triggerOrchestrationWorkerPump();
  return serializeOrchestrationJob(updated);
}

export function getOrchestrationEngineHealth() {
  return {
    engineVersion: AI_ORCHESTRATION_ENGINE_VERSION,
    futureProviders: listFutureAiProviders(),
    ok: true,
    service: "ai-orchestration-engine",
    worker: getOrchestrationWorkerStats(),
  };
}
