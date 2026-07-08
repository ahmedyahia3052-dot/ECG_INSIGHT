-- Sprint 88 — ECG Ingestion Pipeline

CREATE TYPE "EcgIngestionJobStatus" AS ENUM (
  'QUEUED',
  'VALIDATING',
  'PROCESSING',
  'FAILED',
  'CANCELLED',
  'RETRY_SCHEDULED',
  'COMPLETED',
  'DUPLICATE',
  'DEAD_LETTER'
);

CREATE TYPE "EcgIngestionStage" AS ENUM (
  'UPLOAD',
  'VALIDATE',
  'STORAGE',
  'QUEUE',
  'PROCESSING',
  'AI_ORCHESTRATION',
  'RESULTS',
  'PERSIST',
  'NOTIFICATION',
  'COMPLETE'
);

CREATE TYPE "EcgIngestionPriority" AS ENUM (
  'CRITICAL',
  'HIGH',
  'NORMAL',
  'LOW'
);

CREATE TYPE "EcgIngestionEventType" AS ENUM (
  'STAGE_STARTED',
  'STAGE_COMPLETED',
  'STAGE_FAILED',
  'DUPLICATE_DETECTED',
  'CHECKSUM_COMPUTED',
  'CHILD_JOB_ENQUEUED',
  'CHILD_JOB_COMPLETED',
  'RETRY_SCHEDULED',
  'CANCELLED',
  'TIMED_OUT',
  'DEAD_LETTER',
  'NOTIFICATION_SENT',
  'PROGRESS',
  'RESUMED'
);

CREATE TABLE "EcgIngestionJob" (
  "id" TEXT NOT NULL,
  "jobGroupId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "ecgFileId" TEXT NOT NULL,
  "patientId" TEXT,
  "status" "EcgIngestionJobStatus" NOT NULL DEFAULT 'QUEUED',
  "stage" "EcgIngestionStage" NOT NULL DEFAULT 'UPLOAD',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "priority" "EcgIngestionPriority" NOT NULL DEFAULT 'NORMAL',
  "checksumSha256" TEXT,
  "duplicateOfJobId" TEXT,
  "processingJobId" TEXT,
  "orchestrationJobId" TEXT,
  "analysisId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "timeoutMs" INTEGER NOT NULL DEFAULT 600000,
  "errorMessage" TEXT,
  "errorCode" TEXT,
  "stageLog" JSONB NOT NULL DEFAULT '[]',
  "metricsJson" JSONB NOT NULL DEFAULT '{}',
  "resultJson" JSONB,
  "resumeFromStage" "EcgIngestionStage",
  "requestedById" TEXT NOT NULL,
  "engineVersion" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "timedOutAt" TIMESTAMP(3),
  "deadLetterAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EcgIngestionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EcgIngestionPipelineEvent" (
  "id" TEXT NOT NULL,
  "ingestionJobId" TEXT NOT NULL,
  "eventType" "EcgIngestionEventType" NOT NULL,
  "stage" "EcgIngestionStage",
  "message" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EcgIngestionPipelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EcgIngestionJob_caseId_idx" ON "EcgIngestionJob"("caseId");
CREATE INDEX "EcgIngestionJob_ecgFileId_idx" ON "EcgIngestionJob"("ecgFileId");
CREATE INDEX "EcgIngestionJob_checksumSha256_idx" ON "EcgIngestionJob"("checksumSha256");
CREATE INDEX "EcgIngestionJob_caseId_checksumSha256_idx" ON "EcgIngestionJob"("caseId", "checksumSha256");
CREATE INDEX "EcgIngestionJob_status_idx" ON "EcgIngestionJob"("status");
CREATE INDEX "EcgIngestionJob_stage_idx" ON "EcgIngestionJob"("stage");
CREATE INDEX "EcgIngestionJob_priority_status_idx" ON "EcgIngestionJob"("priority", "status");
CREATE INDEX "EcgIngestionJob_status_nextRetryAt_idx" ON "EcgIngestionJob"("status", "nextRetryAt");
CREATE INDEX "EcgIngestionJob_createdAt_idx" ON "EcgIngestionJob"("createdAt");

CREATE INDEX "EcgIngestionPipelineEvent_ingestionJobId_idx" ON "EcgIngestionPipelineEvent"("ingestionJobId");
CREATE INDEX "EcgIngestionPipelineEvent_eventType_idx" ON "EcgIngestionPipelineEvent"("eventType");
CREATE INDEX "EcgIngestionPipelineEvent_createdAt_idx" ON "EcgIngestionPipelineEvent"("createdAt");

ALTER TABLE "EcgIngestionJob" ADD CONSTRAINT "EcgIngestionJob_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcgIngestionJob" ADD CONSTRAINT "EcgIngestionJob_ecgFileId_fkey" FOREIGN KEY ("ecgFileId") REFERENCES "ECGFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcgIngestionJob" ADD CONSTRAINT "EcgIngestionJob_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EcgIngestionJob" ADD CONSTRAINT "EcgIngestionJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EcgIngestionJob" ADD CONSTRAINT "EcgIngestionJob_duplicateOfJobId_fkey" FOREIGN KEY ("duplicateOfJobId") REFERENCES "EcgIngestionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EcgIngestionPipelineEvent" ADD CONSTRAINT "EcgIngestionPipelineEvent_ingestionJobId_fkey" FOREIGN KEY ("ingestionJobId") REFERENCES "EcgIngestionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
