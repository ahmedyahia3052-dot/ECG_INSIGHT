-- Sprint 82 — ECG Processing Engine

CREATE TYPE "EcgProcessingJobStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'RETRY_SCHEDULED'
);

CREATE TYPE "EcgProcessingStage" AS ENUM (
  'UPLOAD_INGEST',
  'PREPROCESS',
  'NORMALIZE',
  'GRID_DETECT',
  'PERSPECTIVE_CORRECT',
  'NOISE_REDUCE',
  'LEAD_MAP',
  'WAVEFORM_EXTRACT',
  'MEASURE',
  'QUALITY_SCORE',
  'VALIDATE',
  'PERSIST',
  'COMPLETE'
);

CREATE TABLE "EcgProcessingJob" (
  "id" TEXT NOT NULL,
  "jobGroupId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "ecgFileId" TEXT NOT NULL,
  "patientId" TEXT,
  "status" "EcgProcessingJobStatus" NOT NULL DEFAULT 'QUEUED',
  "stage" "EcgProcessingStage" NOT NULL DEFAULT 'UPLOAD_INGEST',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "qualityScore" DOUBLE PRECISION,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "errorMessage" TEXT,
  "errorCode" TEXT,
  "stageLog" JSONB NOT NULL DEFAULT '[]',
  "resultJson" JSONB,
  "requestedById" TEXT NOT NULL,
  "engineVersion" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EcgProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EcgProcessingJob_caseId_idx" ON "EcgProcessingJob"("caseId");
CREATE INDEX "EcgProcessingJob_ecgFileId_idx" ON "EcgProcessingJob"("ecgFileId");
CREATE INDEX "EcgProcessingJob_patientId_idx" ON "EcgProcessingJob"("patientId");
CREATE INDEX "EcgProcessingJob_status_idx" ON "EcgProcessingJob"("status");
CREATE INDEX "EcgProcessingJob_stage_idx" ON "EcgProcessingJob"("stage");
CREATE INDEX "EcgProcessingJob_status_nextRetryAt_idx" ON "EcgProcessingJob"("status", "nextRetryAt");
CREATE INDEX "EcgProcessingJob_createdAt_idx" ON "EcgProcessingJob"("createdAt");

ALTER TABLE "EcgProcessingJob" ADD CONSTRAINT "EcgProcessingJob_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcgProcessingJob" ADD CONSTRAINT "EcgProcessingJob_ecgFileId_fkey" FOREIGN KEY ("ecgFileId") REFERENCES "ECGFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcgProcessingJob" ADD CONSTRAINT "EcgProcessingJob_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EcgProcessingJob" ADD CONSTRAINT "EcgProcessingJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
