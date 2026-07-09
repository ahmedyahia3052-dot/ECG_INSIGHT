import type { EcgDigitizationJobStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { latestFileForCase } from "../ecg-processing/ecg-digitization.service";
import { isRasterOrPdfEcg } from "./stages";
import {
  cancelDigitizationJob,
  createDigitizationJob,
  getDigitizationJob,
  listDigitizationJobs,
  scheduleDigitizationJobRetry,
  serializeDigitizationJob,
} from "./repository";
import { scheduleDigitizationRetryAt } from "./recovery";
import {
  ensureDigitizationWorkerStarted,
  getDigitizationWorkerStats,
  triggerDigitizationWorkerPump,
} from "./worker";
import { ECG_DIGITIZATION_ENGINE_VERSION } from "./types";

export async function enqueueCaseDigitization(input: {
  caseId: string;
  ecgFileId?: string;
  maxAttempts?: number;
  processingJobId?: string;
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
    throw new AppError(422, "ECG file format is not supported for digitization.", "UNSUPPORTED_ECG_FORMAT");
  }

  const job = await createDigitizationJob({
    caseId: input.caseId,
    ecgFileId: file.id,
    maxAttempts: input.maxAttempts,
    patientId: ecgCase.patientId,
    processingJobId: input.processingJobId,
    requestedById: input.requestedById,
  });

  ensureDigitizationWorkerStarted();
  void triggerDigitizationWorkerPump();

  return serializeDigitizationJob(job);
}

export async function getCaseDigitizationJob(jobId: string) {
  const job = await getDigitizationJob(jobId);
  if (!job) throw new AppError(404, "Digitization job not found.", "DIGITIZATION_JOB_NOT_FOUND");
  return serializeDigitizationJob(job);
}

export async function listCaseDigitizationJobs(filters?: {
  caseId?: string;
  limit?: number;
  status?: EcgDigitizationJobStatus;
}) {
  const jobs = await listDigitizationJobs(filters);
  return jobs.map(serializeDigitizationJob);
}

export async function cancelCaseDigitizationJob(jobId: string) {
  const job = await cancelDigitizationJob(jobId);
  return serializeDigitizationJob(job);
}

export async function retryCaseDigitizationJob(jobId: string, force = false) {
  const job = await getDigitizationJob(jobId);
  if (!job) throw new AppError(404, "Digitization job not found.", "DIGITIZATION_JOB_NOT_FOUND");
  if (!force && job.status !== "FAILED") {
    throw new AppError(409, "Only failed jobs can be retried.", "JOB_NOT_RETRYABLE");
  }
  if (job.attemptCount >= job.maxAttempts && !force) {
    throw new AppError(409, "Maximum retry attempts exceeded.", "MAX_ATTEMPTS_EXCEEDED");
  }
  const nextRetryAt = scheduleDigitizationRetryAt(job.attemptCount + 1);
  const updated = await scheduleDigitizationJobRetry(jobId, nextRetryAt);
  ensureDigitizationWorkerStarted();
  void triggerDigitizationWorkerPump();
  return serializeDigitizationJob(updated);
}

export function getDigitizationEngineHealth() {
  return {
    engineVersion: ECG_DIGITIZATION_ENGINE_VERSION,
    ok: true,
    service: "ecg-digitization-engine",
    worker: getDigitizationWorkerStats(),
  };
}
