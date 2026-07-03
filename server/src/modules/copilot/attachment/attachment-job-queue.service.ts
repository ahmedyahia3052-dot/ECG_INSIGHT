import { log, logError } from "../../../utils/logger";
import type { CopilotAttachmentPipelineResult } from "../copilot-attachment-pipeline.service";
import { processCopilotAttachment } from "../copilot-attachment-pipeline.service";
import { recordClinicalPipelineMetric } from "../observability/clinical-pipeline-metrics";

export type AttachmentJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type AttachmentJobRecord = {
  attachmentId: string;
  completedAt?: number;
  error?: { code: string; message: string; recovery?: string };
  progress: number;
  result?: CopilotAttachmentPipelineResult;
  stage?: string;
  startedAt: number;
  status: AttachmentJobStatus;
};

type JobInput = {
  attachmentId: string;
  filePath: string;
  kind: "camera" | "ecg" | "echo" | "file" | "image" | "labs";
  mimeType: string;
  originalName: string;
  sizeBytes: number;
};

const jobs = new Map<string, AttachmentJobRecord>();
const queue: JobInput[] = [];
let activeJobs = 0;
const maxConcurrent = Number(process.env.COPILOT_ATTACHMENT_JOB_CONCURRENCY ?? 2);

function updateJob(attachmentId: string, patch: Partial<AttachmentJobRecord>) {
  const current = jobs.get(attachmentId);
  if (!current) return;
  jobs.set(attachmentId, { ...current, ...patch });
}

async function runJob(input: JobInput) {
  updateJob(input.attachmentId, { progress: 5, stage: "validation", status: "running" });
  try {
    updateJob(input.attachmentId, { progress: 20, stage: "ocr" });
    const result = await processCopilotAttachment({
      filePath: input.filePath,
      kind: input.kind,
      mimeType: input.mimeType,
      originalName: input.originalName,
      sizeBytes: input.sizeBytes,
    });
    updateJob(input.attachmentId, {
      completedAt: Date.now(),
      progress: 100,
      result,
      stage: "completed",
      status: "completed",
    });
    log("info", "Copilot attachment job completed", {
      attachmentId: input.attachmentId,
      documentType: result.documentType,
      durationMs: Date.now() - (jobs.get(input.attachmentId)?.startedAt ?? Date.now()),
      service: "copilot-attachment-jobs",
    });
    recordClinicalPipelineMetric("copilot_upload_completed", {
      attachmentId: input.attachmentId,
      async: true,
      documentType: result.documentType,
      durationMs: Date.now() - (jobs.get(input.attachmentId)?.startedAt ?? Date.now()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Attachment processing failed";
    updateJob(input.attachmentId, {
      completedAt: Date.now(),
      error: {
        code: "ATTACHMENT_PROCESSING_FAILED",
        message,
        recovery: "Retry upload or contact support if the issue persists.",
      },
      progress: 100,
      stage: "failed",
      status: "failed",
    });
    logError("Copilot attachment job failed", message, {
      attachmentId: input.attachmentId,
      service: "copilot-attachment-jobs",
    });
  }
}

async function pumpQueue() {
  while (activeJobs < maxConcurrent && queue.length) {
    const next = queue.shift();
    if (!next) break;
    activeJobs += 1;
    void runJob(next).finally(() => {
      activeJobs -= 1;
      void pumpQueue();
    });
  }
}

export function enqueueAttachmentJob(input: JobInput) {
  jobs.set(input.attachmentId, {
    attachmentId: input.attachmentId,
    progress: 0,
    startedAt: Date.now(),
    status: "queued",
  });
  queue.push(input);
  void pumpQueue();
  return jobs.get(input.attachmentId)!;
}

export function getAttachmentJob(attachmentId: string) {
  return jobs.get(attachmentId) ?? null;
}

export async function processAttachmentJobSync(input: JobInput) {
  enqueueAttachmentJob(input);
  const started = Date.now();
  while (Date.now() - started < Number(process.env.COPILOT_ATTACHMENT_JOB_TIMEOUT_MS ?? 180_000)) {
    const job = getAttachmentJob(input.attachmentId);
    if (!job) throw new Error("Attachment job not found.");
    if (job.status === "completed" && job.result) return job.result;
    if (job.status === "failed") throw new Error(job.error?.message ?? "Attachment processing failed");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Attachment processing timed out.");
}

export function resetAttachmentJobsForTests() {
  jobs.clear();
  queue.length = 0;
  activeJobs = 0;
}

export function isAsyncAttachmentProcessingEnabled() {
  return process.env.COPILOT_ASYNC_ATTACHMENTS === "true";
}
