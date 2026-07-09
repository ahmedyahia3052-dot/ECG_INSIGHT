import { log, logError } from "../../utils/logger";
import { executeDigitizationPipeline } from "./orchestrator";
import {
  claimNextDigitizationJob,
  markDigitizationJobCompleted,
  markDigitizationJobFailed,
  scheduleDigitizationJobRetry,
} from "./repository";
import {
  digitizationErrorCode,
  isRecoverableDigitizationError,
  scheduleDigitizationRetryAt,
} from "./recovery";

let workerStarted = false;
let pumpTimer: NodeJS.Timeout | null = null;
let activeWorkers = 0;
const maxConcurrent = Number(process.env.ECG_DIGITIZATION_WORKER_CONCURRENCY ?? 2);
const pollIntervalMs = Number(process.env.ECG_DIGITIZATION_WORKER_POLL_MS ?? 1500);

async function processSingleJob(jobId: string, caseId: string, ecgFileId: string, actorId: string, processingJobId?: string | null) {
  try {
    const result = await executeDigitizationPipeline({
      actorId,
      caseId,
      ecgFileId,
      jobId,
      processingJobId: processingJobId ?? undefined,
    });
    await markDigitizationJobCompleted(jobId, result);
    log("info", `ECG digitization job ${jobId} completed (quality=${result.quality.score})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ECG digitization failed.";
    const code = digitizationErrorCode(error);
    const job = await markDigitizationJobFailed(jobId, { code, message });
    if (job && isRecoverableDigitizationError(error) && job.attemptCount < job.maxAttempts) {
      const nextRetryAt = scheduleDigitizationRetryAt(job.attemptCount);
      await scheduleDigitizationJobRetry(jobId, nextRetryAt);
      logError(`ECG digitization job ${jobId} failed; retry scheduled at ${nextRetryAt.toISOString()}`, error);
      return;
    }
    logError(`ECG digitization job ${jobId} failed permanently`, error);
  }
}

async function pumpDigitizationQueue() {
  if (activeWorkers >= maxConcurrent) return;
  const job = await claimNextDigitizationJob();
  if (!job) return;

  activeWorkers += 1;
  void processSingleJob(job.id, job.caseId, job.ecgFileId, job.requestedById, job.processingJobId)
    .finally(() => {
      activeWorkers -= 1;
    });
}

export function ensureDigitizationWorkerStarted() {
  if (workerStarted) return;
  workerStarted = true;
  pumpTimer = setInterval(() => {
    void pumpDigitizationQueue();
  }, pollIntervalMs);
  void pumpDigitizationQueue();
}

export function stopDigitizationWorkerForTests() {
  if (pumpTimer) clearInterval(pumpTimer);
  pumpTimer = null;
  workerStarted = false;
  activeWorkers = 0;
}

export async function triggerDigitizationWorkerPump() {
  await pumpDigitizationQueue();
}

export function getDigitizationWorkerStats() {
  return {
    activeWorkers,
    maxConcurrent,
    pollIntervalMs,
    workerStarted,
  };
}
