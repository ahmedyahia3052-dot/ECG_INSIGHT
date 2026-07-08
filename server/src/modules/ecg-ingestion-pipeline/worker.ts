import { log, logError } from "../../utils/logger";
import { prisma } from "../../config/prisma";
import { cancelCaseOrchestrationJob } from "../ai-orchestration-engine/ai-orchestration-engine.service";
import { cancelCaseProcessingJob } from "../ecg-processing-engine/ecg-processing-engine.service";
import { ensureOrchestrationWorkerStarted, triggerOrchestrationWorkerPump } from "../ai-orchestration-engine/worker";
import { ensureProcessingWorkerStarted, triggerProcessingWorkerPump } from "../ecg-processing-engine/worker";
import { advanceIngestionPipeline } from "./pipeline-manager";
import {
  appendIngestionPipelineEvent,
  claimNextIngestionJob,
  getIngestionJob,
  markIngestionJobDeadLetter,
  markIngestionJobFailed,
  markIngestionJobTimedOut,
  scheduleIngestionJobRetry,
} from "./repository";
import {
  hasIngestionTimedOut,
  ingestionErrorCode,
  isRecoverableIngestionError,
  scheduleIngestionRetryAt,
} from "./recovery";
import { registerIngestionWorkerAdapter } from "./worker-adapter";
import { toIngestionStageName } from "./types";

let workerStarted = false;
let pumpTimer: NodeJS.Timeout | null = null;
let activeWorkers = 0;
const maxConcurrent = Number(process.env.ECG_INGESTION_WORKER_CONCURRENCY ?? 2);
const pollIntervalMs = Number(process.env.ECG_INGESTION_WORKER_POLL_MS ?? 2000);
const activeJobIds = new Set<string>();

async function processIngestionJob(jobId: string) {
  try {
    ensureProcessingWorkerStarted();
    ensureOrchestrationWorkerStarted();
    void triggerProcessingWorkerPump();
    void triggerOrchestrationWorkerPump();

    let guard = 0;
    while (guard < 20) {
      guard += 1;
      const job = await getIngestionJob(jobId);
      if (!job || ["COMPLETED", "DUPLICATE", "CANCELLED", "DEAD_LETTER"].includes(job.status)) return;
      if (hasIngestionTimedOut(job.startedAt, job.timeoutMs)) {
        await markIngestionJobTimedOut(jobId);
        await appendIngestionPipelineEvent(jobId, {
          eventType: "TIMED_OUT",
          message: "Ingestion worker detected pipeline timeout.",
          stage: toIngestionStageName(job.stage),
        });
        const timedOutJob = await getIngestionJob(jobId);
        if (timedOutJob && timedOutJob.attemptCount < timedOutJob.maxAttempts) {
          const nextRetryAt = scheduleIngestionRetryAt(timedOutJob.attemptCount, Date.now());
          await scheduleIngestionJobRetry(jobId, nextRetryAt, toIngestionStageName(timedOutJob.stage));
          await appendIngestionPipelineEvent(jobId, {
            eventType: "RETRY_SCHEDULED",
            message: `Retry scheduled after timeout at ${nextRetryAt.toISOString()}.`,
          });
        } else if (timedOutJob) {
          await markIngestionJobDeadLetter(jobId, {
            code: "PIPELINE_TIMEOUT",
            message: "Ingestion pipeline exceeded maximum attempts after timeout.",
          });
          await appendIngestionPipelineEvent(jobId, {
            eventType: "DEAD_LETTER",
            message: "Job moved to dead letter queue after timeout.",
          });
        }
        return;
      }

      const outcome = await advanceIngestionPipeline(jobId);
      if (outcome === "WAIT") return;
      if (outcome === "COMPLETED" || outcome === "DUPLICATE") {
        log("info", `ECG ingestion job ${jobId} finished with outcome=${outcome}`);
        return;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "ECG ingestion failed.";
    const code = ingestionErrorCode(error);
    const job = await markIngestionJobFailed(jobId, { code, message });
    if (job && isRecoverableIngestionError(error) && job.attemptCount < job.maxAttempts) {
      const nextRetryAt = scheduleIngestionRetryAt(job.attemptCount);
      await scheduleIngestionJobRetry(jobId, nextRetryAt, toIngestionStageName(job.stage));
      await appendIngestionPipelineEvent(jobId, {
        eventType: "RETRY_SCHEDULED",
        message: `Retry scheduled at ${nextRetryAt.toISOString()}.`,
        payload: { code },
      });
      logError(`ECG ingestion job ${jobId} failed; retry scheduled at ${nextRetryAt.toISOString()}`, error);
      return;
    }
    if (job && job.attemptCount >= job.maxAttempts) {
      await markIngestionJobDeadLetter(jobId, { code, message });
      await appendIngestionPipelineEvent(jobId, {
        eventType: "DEAD_LETTER",
        message: "Job moved to dead letter queue.",
        payload: { code },
      });
    }
    logError(`ECG ingestion job ${jobId} failed permanently`, error);
  }
}

async function pumpIngestionQueue() {
  const inFlightJobs = await getIngestionJobIdsAwaitingChildJobs();
  for (const jobId of inFlightJobs) {
    if (activeWorkers >= maxConcurrent) break;
    if (activeJobIds.has(jobId)) continue;
    activeJobIds.add(jobId);
    activeWorkers += 1;
    void processIngestionJob(jobId).finally(() => {
      activeWorkers -= 1;
      activeJobIds.delete(jobId);
    });
  }

  if (activeWorkers >= maxConcurrent) return;
  const job = await claimNextIngestionJob();
  if (!job) return;
  if (activeJobIds.has(job.id)) return;

  activeJobIds.add(job.id);
  activeWorkers += 1;
  void processIngestionJob(job.id).finally(() => {
    activeWorkers -= 1;
    activeJobIds.delete(job.id);
  });
}

async function getIngestionJobIdsAwaitingChildJobs() {
  const jobs = await prisma.ecgIngestionJob.findMany({
    select: { id: true },
    orderBy: [{ priority: "asc" }, { updatedAt: "asc" }],
    take: maxConcurrent * 2,
    where: {
      stage: { in: ["PROCESSING", "AI_ORCHESTRATION"] },
      status: "PROCESSING",
    },
  });
  return jobs.map((entry) => entry.id);
}

function ensureIngestionWorkerStartedInternal() {
  if (workerStarted) return;
  workerStarted = true;
  pumpTimer = setInterval(() => {
    void pumpIngestionQueue();
  }, pollIntervalMs);
  void pumpIngestionQueue();
}

function stopIngestionWorkerForTestsInternal() {
  if (pumpTimer) clearInterval(pumpTimer);
  pumpTimer = null;
  workerStarted = false;
  activeWorkers = 0;
  activeJobIds.clear();
}

registerIngestionWorkerAdapter({
  ensureStarted: ensureIngestionWorkerStartedInternal,
  getStats: () => ({
    activeWorkers,
    maxConcurrent,
    pollIntervalMs,
    workerStarted,
  }),
  pump: pumpIngestionQueue,
  stopForTests: stopIngestionWorkerForTestsInternal,
});

export async function cancelIngestionChildJobs(jobId: string) {
  const job = await getIngestionJob(jobId);
  if (!job) return;
  if (job.processingJobId) {
    try {
      await cancelCaseProcessingJob(job.processingJobId);
    } catch {
      // Child job may already be terminal.
    }
  }
  if (job.orchestrationJobId) {
    try {
      await cancelCaseOrchestrationJob(job.orchestrationJobId);
    } catch {
      // Child job may already be terminal.
    }
  }
}

export {
  ensureIngestionWorkerStartedInternal as ensureIngestionWorkerStarted,
  pumpIngestionQueue as triggerIngestionWorkerPump,
  stopIngestionWorkerForTestsInternal as stopIngestionWorkerForTests,
};

export function getIngestionWorkerStats() {
  return {
    activeWorkers,
    maxConcurrent,
    pollIntervalMs,
    workerStarted,
  };
}
