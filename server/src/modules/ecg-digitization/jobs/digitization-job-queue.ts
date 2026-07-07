import { randomUUID } from "node:crypto";

export type DigitizationJobStage =
  | "cancelled"
  | "complete"
  | "decode"
  | "failed"
  | "grid"
  | "leads"
  | "persist"
  | "preprocess"
  | "queued"
  | "reconstruct"
  | "validate";

export type DigitizationJobRecord = {
  actorId: string;
  cancelRequested: boolean;
  caseId: string;
  createdAt: number;
  error?: string;
  id: string;
  progress: number;
  result?: unknown;
  stage: DigitizationJobStage;
  updatedAt: number;
};

const jobs = new Map<string, DigitizationJobRecord>();

const STAGE_PROGRESS: Record<DigitizationJobStage, number> = {
  cancelled: 0,
  complete: 100,
  decode: 10,
  failed: 0,
  grid: 35,
  leads: 55,
  persist: 90,
  preprocess: 22,
  queued: 2,
  reconstruct: 72,
  validate: 82,
};

export function createDigitizationJob(caseId: string, actorId: string) {
  const id = randomUUID();
  const now = Date.now();
  const job: DigitizationJobRecord = {
    actorId,
    cancelRequested: false,
    caseId,
    createdAt: now,
    id,
    progress: STAGE_PROGRESS.queued,
    stage: "queued",
    updatedAt: now,
  };
  jobs.set(id, job);
  return job;
}

export function getDigitizationJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export function cancelDigitizationJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return null;
  job.cancelRequested = true;
  job.stage = "cancelled";
  job.progress = 0;
  job.updatedAt = Date.now();
  return job;
}

export function updateDigitizationJob(jobId: string, patch: Partial<DigitizationJobRecord>) {
  const job = jobs.get(jobId);
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: Date.now() });
  if (patch.stage && patch.progress == null) job.progress = STAGE_PROGRESS[patch.stage] ?? job.progress;
  return job;
}

export function listDigitizationJobsForCase(caseId: string) {
  return [...jobs.values()].filter((job) => job.caseId === caseId);
}

export function pruneDigitizationJobs(maxAgeMs = 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [id, job] of jobs.entries()) {
    if (job.updatedAt < cutoff) jobs.delete(id);
  }
}

export async function runDigitizationJob<T>(
  jobId: string,
  runner: (ctx: {
    isCancelled: () => boolean;
    setStage: (stage: DigitizationJobStage) => void;
  }) => Promise<T>,
): Promise<DigitizationJobRecord | null> {
  const job = jobs.get(jobId);
  if (!job) return null;

  const setStage = (stage: DigitizationJobStage) => {
    const current = jobs.get(jobId);
    if (!current || current.cancelRequested) return;
    current.stage = stage;
    current.progress = STAGE_PROGRESS[stage] ?? current.progress;
    current.updatedAt = Date.now();
  };

  try {
    setStage("decode");
    const result = await runner({
      isCancelled: () => Boolean(jobs.get(jobId)?.cancelRequested),
      setStage,
    });
    const current = jobs.get(jobId);
    if (!current) return null;
    if (current.cancelRequested) {
      current.stage = "cancelled";
      current.progress = 0;
    } else {
      current.stage = "complete";
      current.progress = 100;
      current.result = result;
    }
    current.updatedAt = Date.now();
    return current;
  } catch (error) {
    const current = jobs.get(jobId);
    if (!current) return null;
    current.stage = "failed";
    current.error = error instanceof Error ? error.message : "Digitization job failed.";
    current.updatedAt = Date.now();
    return current;
  }
}
