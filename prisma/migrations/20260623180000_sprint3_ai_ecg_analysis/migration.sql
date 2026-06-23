CREATE TYPE "AIAnalysisStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "AISeverity" AS ENUM ('NORMAL', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AI_ANALYSIS_QUEUED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AI_ANALYSIS_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AI_ANALYSIS_FAILED';

CREATE TABLE "AIAnalysis" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "rhythm" TEXT NOT NULL,
  "heartRate" INTEGER NOT NULL,
  "severity" "AISeverity" NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "interpretation" TEXT NOT NULL,
  "recommendations" TEXT[],
  "urgentActions" TEXT[],
  "aiVersion" TEXT NOT NULL,
  "processingTime" INTEGER NOT NULL,
  "status" "AIAnalysisStatus" NOT NULL DEFAULT 'QUEUED',
  "diagnosis" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIAnalysis_caseId_idx" ON "AIAnalysis"("caseId");
CREATE INDEX "AIAnalysis_severity_idx" ON "AIAnalysis"("severity");
CREATE INDEX "AIAnalysis_status_idx" ON "AIAnalysis"("status");
CREATE INDEX "AIAnalysis_diagnosis_idx" ON "AIAnalysis"("diagnosis");
CREATE INDEX "AIAnalysis_createdAt_idx" ON "AIAnalysis"("createdAt");

ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
