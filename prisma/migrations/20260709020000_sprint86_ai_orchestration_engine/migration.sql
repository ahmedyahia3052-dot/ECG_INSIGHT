-- Sprint 86 — AI Orchestration Engine

CREATE TYPE "AiOrchestrationJobStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'RETRY_SCHEDULED',
  'TIMED_OUT'
);

CREATE TYPE "AiOrchestrationStage" AS ENUM (
  'VALIDATE',
  'LOAD_CONTEXT',
  'ECG_ANALYSIS',
  'CLINICAL_REASONING',
  'ECG_INTERPRETATION',
  'LLM_ENRICHMENT',
  'PERSIST',
  'COMPLETE'
);

CREATE TYPE "AiProviderPreference" AS ENUM (
  'AUTO',
  'OPENAI',
  'OLLAMA',
  'RULE_BASED'
);

CREATE TYPE "AiOrchestrationPipelineKind" AS ENUM (
  'FULL',
  'ECG_ONLY',
  'LLM_ONLY'
);

CREATE TABLE "AiOrchestrationJob" (
  "id" TEXT NOT NULL,
  "jobGroupId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "analysisId" TEXT,
  "patientId" TEXT,
  "status" "AiOrchestrationJobStatus" NOT NULL DEFAULT 'QUEUED',
  "stage" "AiOrchestrationStage" NOT NULL DEFAULT 'VALIDATE',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "pipelineKind" "AiOrchestrationPipelineKind" NOT NULL DEFAULT 'FULL',
  "providerPreference" "AiProviderPreference" NOT NULL DEFAULT 'AUTO',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "timeoutMs" INTEGER NOT NULL DEFAULT 300000,
  "errorMessage" TEXT,
  "errorCode" TEXT,
  "stageLog" JSONB NOT NULL DEFAULT '[]',
  "processingLogs" JSONB NOT NULL DEFAULT '[]',
  "resultJson" JSONB,
  "requestedById" TEXT NOT NULL,
  "engineVersion" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "timedOutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiOrchestrationJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiOrchestrationJob_caseId_idx" ON "AiOrchestrationJob"("caseId");
CREATE INDEX "AiOrchestrationJob_analysisId_idx" ON "AiOrchestrationJob"("analysisId");
CREATE INDEX "AiOrchestrationJob_patientId_idx" ON "AiOrchestrationJob"("patientId");
CREATE INDEX "AiOrchestrationJob_status_idx" ON "AiOrchestrationJob"("status");
CREATE INDEX "AiOrchestrationJob_stage_idx" ON "AiOrchestrationJob"("stage");
CREATE INDEX "AiOrchestrationJob_status_nextRetryAt_idx" ON "AiOrchestrationJob"("status", "nextRetryAt");
CREATE INDEX "AiOrchestrationJob_createdAt_idx" ON "AiOrchestrationJob"("createdAt");

ALTER TABLE "AiOrchestrationJob" ADD CONSTRAINT "AiOrchestrationJob_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiOrchestrationJob" ADD CONSTRAINT "AiOrchestrationJob_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AIAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiOrchestrationJob" ADD CONSTRAINT "AiOrchestrationJob_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiOrchestrationJob" ADD CONSTRAINT "AiOrchestrationJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
