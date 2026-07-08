import { log, logError } from "../../utils/logger";
import { executeOrchestrationPipeline } from "./pipeline-manager";
import {
  claimNextOrchestrationJob,
  markOrchestrationJobCompleted,
  markOrchestrationJobFailed,
  scheduleOrchestrationJobRetry,
} from "./repository";
import {
  OrchestrationTimeoutError,
  isRecoverableOrchestrationError,
  orchestrationErrorCode,
  scheduleOrchestrationRetryAt,
} from "./recovery";

let workerStarted = false;
let pumpTimer: NodeJS.Timeout | null = null;
let activeWorkers = 0;
const maxConcurrent = Number(process.env.AI_ORCHESTRATION_WORKER_CONCURRENCY ?? 2);
const pollIntervalMs = Number(process.env.AI_ORCHESTRATION_WORKER_POLL_MS ?? 2000);

async function processSingleJob(job: {
  analysisId: string | null;
  caseId: string;
  id: string;
  patientId: string | null;
  pipelineKind: "FULL" | "ECG_ONLY" | "LLM_ONLY";
  providerPreference: "AUTO" | "OPENAI" | "OLLAMA" | "RULE_BASED";
  requestedById: string;
  timeoutMs: number;
}) {
  try {
    const result = await executeOrchestrationPipeline({
      actorId: job.requestedById,
      analysisId: job.analysisId ?? undefined,
      caseId: job.caseId,
      jobId: job.id,
      patientId: job.patientId ?? undefined,
      pipelineKind: job.pipelineKind,
      providerPreference: job.providerPreference,
      timeoutMs: job.timeoutMs,
    });
    await markOrchestrationJobCompleted(job.id, result);
    log("info", `AI orchestration job ${job.id} completed (analysis=${result.analysisId})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI orchestration failed.";
    const code = orchestrationErrorCode(error);
    const status = error instanceof OrchestrationTimeoutError ? "TIMED_OUT" : "FAILED";
    const updated = await markOrchestrationJobFailed(job.id, { code, message }, status);
    if (updated && isRecoverableOrchestrationError(error) && updated.attemptCount < updated.maxAttempts) {
      const nextRetryAt = scheduleOrchestrationRetryAt(updated.attemptCount);
      await scheduleOrchestrationJobRetry(job.id, nextRetryAt);
      logError(`AI orchestration job ${job.id} failed; retry scheduled at ${nextRetryAt.toISOString()}`, error);
      return;
    }
    logError(`AI orchestration job ${job.id} failed permanently`, error);
  }
}

async function pumpOrchestrationQueue() {
  if (activeWorkers >= maxConcurrent) return;
  const job = await claimNextOrchestrationJob();
  if (!job) return;

  activeWorkers += 1;
  void processSingleJob({
    analysisId: job.analysisId,
    caseId: job.caseId,
    id: job.id,
    patientId: job.patientId,
    pipelineKind: job.pipelineKind,
    providerPreference: job.providerPreference,
    requestedById: job.requestedById,
    timeoutMs: job.timeoutMs,
  }).finally(() => {
    activeWorkers -= 1;
  });
}

export function ensureOrchestrationWorkerStarted() {
  if (workerStarted) return;
  workerStarted = true;
  pumpTimer = setInterval(() => {
    void pumpOrchestrationQueue();
  }, pollIntervalMs);
  void pumpOrchestrationQueue();
}

export function stopOrchestrationWorkerForTests() {
  if (pumpTimer) clearInterval(pumpTimer);
  pumpTimer = null;
  workerStarted = false;
  activeWorkers = 0;
}

export async function triggerOrchestrationWorkerPump() {
  await pumpOrchestrationQueue();
}

export function getOrchestrationWorkerStats() {
  return {
    activeWorkers,
    maxConcurrent,
    pollIntervalMs,
    workerStarted,
  };
}
