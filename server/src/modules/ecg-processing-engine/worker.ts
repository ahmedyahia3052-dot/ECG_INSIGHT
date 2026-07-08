import { log, logError } from "../../utils/logger";
import { executeProcessingPipeline } from "./orchestrator";
import {
  claimNextQueuedJob,
  markProcessingJobCompleted,
  markProcessingJobFailed,
  scheduleProcessingJobRetry,
} from "./repository";
import { isRecoverableProcessingError, processingErrorCode, scheduleRetryAt } from "./recovery";

let workerStarted = false;
let pumpTimer: NodeJS.Timeout | null = null;
let activeWorkers = 0;
const maxConcurrent = Number(process.env.ECG_PROCESSING_WORKER_CONCURRENCY ?? 2);
const pollIntervalMs = Number(process.env.ECG_PROCESSING_WORKER_POLL_MS ?? 1500);

async function processSingleJob(jobId: string, caseId: string, ecgFileId: string, actorId: string) {
  try {
    const result = await executeProcessingPipeline({
      actorId,
      caseId,
      ecgFileId,
      jobId,
    });
    await markProcessingJobCompleted(jobId, result);
    log("info", `ECG processing job ${jobId} completed (quality=${result.quality.score})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ECG processing failed.";
    const code = processingErrorCode(error);
    const job = await markProcessingJobFailed(jobId, { code, message });
    if (job && isRecoverableProcessingError(error) && job.attemptCount < job.maxAttempts) {
      const nextRetryAt = scheduleRetryAt(job.attemptCount);
      await scheduleProcessingJobRetry(jobId, nextRetryAt);
      logError(`ECG processing job ${jobId} failed; retry scheduled at ${nextRetryAt.toISOString()}`, error);
      return;
    }
    logError(`ECG processing job ${jobId} failed permanently`, error);
  }
}

async function pumpProcessingQueue() {
  if (activeWorkers >= maxConcurrent) return;
  const job = await claimNextQueuedJob();
  if (!job) return;

  activeWorkers += 1;
  void processSingleJob(job.id, job.caseId, job.ecgFileId, job.requestedById)
    .finally(() => {
      activeWorkers -= 1;
    });
}

export function ensureProcessingWorkerStarted() {
  if (workerStarted) return;
  workerStarted = true;
  pumpTimer = setInterval(() => {
    void pumpProcessingQueue();
  }, pollIntervalMs);
  void pumpProcessingQueue();
}

export function stopProcessingWorkerForTests() {
  if (pumpTimer) clearInterval(pumpTimer);
  pumpTimer = null;
  workerStarted = false;
  activeWorkers = 0;
}

export async function triggerProcessingWorkerPump() {
  await pumpProcessingQueue();
}

export function getProcessingWorkerStats() {
  return {
    activeWorkers,
    maxConcurrent,
    pollIntervalMs,
    workerStarted,
  };
}
