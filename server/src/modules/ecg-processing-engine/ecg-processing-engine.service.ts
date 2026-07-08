import type { EcgProcessingJobStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { latestFileForCase } from "../ecg-processing/ecg-digitization.service";
import { isRasterOrPdfEcg } from "./stages";
import {
  cancelProcessingJob,
  createProcessingJob,
  getProcessingJob,
  listProcessingJobs,
  scheduleProcessingJobRetry,
  serializeProcessingJob,
} from "./repository";
import { scheduleRetryAt } from "./recovery";
import { ensureProcessingWorkerStarted, getProcessingWorkerStats, triggerProcessingWorkerPump } from "./worker";
import { ECG_PROCESSING_ENGINE_VERSION } from "./types";

export async function enqueueCaseProcessing(input: {
  caseId: string;
  ecgFileId?: string;
  maxAttempts?: number;
  requestedById: string;
}) {
  const ecgCase = await prisma.eCGCase.findUnique({
    select: { id: true, patientId: true },
    where: { id: input.caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

  const file = input.ecgFileId
    ? await prisma.eCGFile.findUnique({ where: { id: input.ecgFileId } })
    : await latestFileForCase(input.caseId);

  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  if (file.caseId && file.caseId !== input.caseId) {
    throw new AppError(422, "ECG file does not belong to case.", "ECG_FILE_CASE_MISMATCH");
  }
  if (!isRasterOrPdfEcg(file)) {
    throw new AppError(422, "ECG file format is not supported for image processing pipeline.", "UNSUPPORTED_ECG_FORMAT");
  }

  const job = await createProcessingJob({
    caseId: input.caseId,
    ecgFileId: file.id,
    maxAttempts: input.maxAttempts,
    patientId: ecgCase.patientId,
    requestedById: input.requestedById,
  });

  ensureProcessingWorkerStarted();
  void triggerProcessingWorkerPump();

  return serializeProcessingJob(job);
}

export async function getCaseProcessingJob(jobId: string) {
  const job = await getProcessingJob(jobId);
  if (!job) throw new AppError(404, "Processing job not found.", "PROCESSING_JOB_NOT_FOUND");
  return serializeProcessingJob(job);
}

export async function listCaseProcessingJobs(filters?: {
  caseId?: string;
  limit?: number;
  status?: EcgProcessingJobStatus;
}) {
  const jobs = await listProcessingJobs(filters);
  return jobs.map(serializeProcessingJob);
}

export async function cancelCaseProcessingJob(jobId: string) {
  const job = await cancelProcessingJob(jobId);
  return serializeProcessingJob(job);
}

export async function retryCaseProcessingJob(jobId: string, force = false) {
  const job = await getProcessingJob(jobId);
  if (!job) throw new AppError(404, "Processing job not found.", "PROCESSING_JOB_NOT_FOUND");
  if (!force && job.status !== "FAILED") {
    throw new AppError(409, "Only failed jobs can be retried.", "JOB_NOT_RETRYABLE");
  }
  if (job.attemptCount >= job.maxAttempts && !force) {
    throw new AppError(409, "Maximum retry attempts exceeded.", "MAX_ATTEMPTS_EXCEEDED");
  }
  const nextRetryAt = scheduleRetryAt(job.attemptCount + 1);
  const updated = await scheduleProcessingJobRetry(jobId, nextRetryAt);
  ensureProcessingWorkerStarted();
  void triggerProcessingWorkerPump();
  return serializeProcessingJob(updated);
}

export function getProcessingEngineHealth() {
  return {
    engineVersion: ECG_PROCESSING_ENGINE_VERSION,
    ok: true,
    service: "ecg-processing-engine",
    worker: getProcessingWorkerStats(),
  };
}
