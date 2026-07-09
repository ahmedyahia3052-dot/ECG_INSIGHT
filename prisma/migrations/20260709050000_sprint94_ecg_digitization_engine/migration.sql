-- Sprint 94 — ECG Digitization Engine durable job queue

CREATE TYPE "EcgDigitizationJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRY_SCHEDULED');

CREATE TYPE "EcgDigitizationStage" AS ENUM (
  'UPLOAD_INGEST',
  'PAPER_DETECT',
  'DECODE',
  'PREPROCESS',
  'PERSPECTIVE_CORRECT',
  'ROTATION_CORRECT',
  'DESKEW',
  'NOISE_REDUCE',
  'SHADOW_REMOVE',
  'CONTRAST_ENHANCE',
  'GRID_DETECT',
  'LEAD_SEGMENT',
  'TWELVE_LEAD_DETECT',
  'WAVEFORM_EXTRACT',
  'RECONSTRUCT',
  'VALIDATE',
  'PERSIST',
  'COMPLETE'
);

CREATE TABLE "EcgDigitizationJob" (
  "id" TEXT NOT NULL,
  "jobGroupId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "ecgFileId" TEXT NOT NULL,
  "patientId" TEXT,
  "processingJobId" TEXT,
  "status" "EcgDigitizationJobStatus" NOT NULL DEFAULT 'QUEUED',
  "stage" "EcgDigitizationStage" NOT NULL DEFAULT 'UPLOAD_INGEST',
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

  CONSTRAINT "EcgDigitizationJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EcgDigitizationJob_caseId_idx" ON "EcgDigitizationJob"("caseId");
CREATE INDEX "EcgDigitizationJob_ecgFileId_idx" ON "EcgDigitizationJob"("ecgFileId");
CREATE INDEX "EcgDigitizationJob_patientId_idx" ON "EcgDigitizationJob"("patientId");
CREATE INDEX "EcgDigitizationJob_processingJobId_idx" ON "EcgDigitizationJob"("processingJobId");
CREATE INDEX "EcgDigitizationJob_status_idx" ON "EcgDigitizationJob"("status");
CREATE INDEX "EcgDigitizationJob_stage_idx" ON "EcgDigitizationJob"("stage");
CREATE INDEX "EcgDigitizationJob_status_nextRetryAt_idx" ON "EcgDigitizationJob"("status", "nextRetryAt");
CREATE INDEX "EcgDigitizationJob_createdAt_idx" ON "EcgDigitizationJob"("createdAt");

ALTER TABLE "EcgDigitizationJob" ADD CONSTRAINT "EcgDigitizationJob_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcgDigitizationJob" ADD CONSTRAINT "EcgDigitizationJob_ecgFileId_fkey" FOREIGN KEY ("ecgFileId") REFERENCES "ECGFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcgDigitizationJob" ADD CONSTRAINT "EcgDigitizationJob_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EcgDigitizationJob" ADD CONSTRAINT "EcgDigitizationJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
