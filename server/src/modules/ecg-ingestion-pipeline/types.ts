import type { EcgIngestionJobStatus, EcgIngestionPriority, EcgIngestionStage } from "@prisma/client";

export const ECG_INGESTION_PIPELINE_VERSION = "sprint88-ecg-ingestion-v1" as const;

export const INGESTION_STAGE_ORDER = [
  "UPLOAD",
  "VALIDATE",
  "STORAGE",
  "QUEUE",
  "PROCESSING",
  "AI_ORCHESTRATION",
  "RESULTS",
  "PERSIST",
  "NOTIFICATION",
  "COMPLETE",
] as const;

export type EcgIngestionStageName = (typeof INGESTION_STAGE_ORDER)[number];

export const INGESTION_STAGE_PROGRESS: Record<EcgIngestionStageName, number> = {
  UPLOAD: 5,
  VALIDATE: 12,
  STORAGE: 18,
  QUEUE: 22,
  PROCESSING: 45,
  AI_ORCHESTRATION: 70,
  RESULTS: 82,
  PERSIST: 90,
  NOTIFICATION: 96,
  COMPLETE: 100,
};

export type IngestionStageLogEntry = {
  durationMs?: number;
  message?: string;
  stage: EcgIngestionStageName;
  status: "completed" | "failed" | "running" | "skipped" | "waiting";
  timestamp: string;
};

export type IngestionProcessingMetrics = {
  checksumMs?: number;
  duplicateDetected?: boolean;
  notificationSent?: boolean;
  orchestrationDurationMs?: number;
  processingDurationMs?: number;
  retryCount?: number;
  stageDurationsMs?: Partial<Record<EcgIngestionStageName, number>>;
  totalDurationMs?: number;
};

export type IngestionPipelineResult = {
  analysisId?: string;
  checksumSha256?: string;
  duplicateOfJobId?: string;
  engineVersion: string;
  orchestrationJobId?: string;
  processingJobId?: string;
  processingResult?: unknown;
  orchestrationResult?: unknown;
};

export type SerializedEcgIngestionJob = {
  analysisId?: string;
  attemptCount: number;
  cancelledAt?: string;
  caseId: string;
  checksumSha256?: string;
  completedAt?: string;
  createdAt: string;
  deadLetterAt?: string;
  duplicateOfJobId?: string;
  ecgFileId: string;
  engineVersion: string;
  errorCode?: string;
  errorMessage?: string;
  id: string;
  jobGroupId: string;
  maxAttempts: number;
  metrics: IngestionProcessingMetrics;
  nextRetryAt?: string;
  orchestrationJobId?: string;
  patientId?: string;
  priority: EcgIngestionPriority;
  processingJobId?: string;
  progress: number;
  requestedById: string;
  result?: IngestionPipelineResult;
  resumeFromStage?: EcgIngestionStageName;
  stage: EcgIngestionStageName;
  stageLog: IngestionStageLogEntry[];
  startedAt?: string;
  status: EcgIngestionJobStatus;
  timedOutAt?: string;
  timeoutMs: number;
  updatedAt: string;
};

export type IngestionAdvanceResult = "ADVANCED" | "WAIT" | "COMPLETED" | "DUPLICATE" | "FAILED";

export type IngestionWorkerStats = {
  activeWorkers: number;
  maxConcurrent: number;
  pollIntervalMs: number;
  workerStarted: boolean;
};

export function isIngestionStageName(value: string): value is EcgIngestionStageName {
  return (INGESTION_STAGE_ORDER as readonly string[]).includes(value);
}

export function toIngestionStageName(stage: EcgIngestionStage): EcgIngestionStageName {
  return stage as EcgIngestionStageName;
}

export function nextIngestionStage(stage: EcgIngestionStageName): EcgIngestionStageName | null {
  const index = INGESTION_STAGE_ORDER.indexOf(stage);
  if (index < 0 || index >= INGESTION_STAGE_ORDER.length - 1) return null;
  return INGESTION_STAGE_ORDER[index + 1] ?? null;
}
