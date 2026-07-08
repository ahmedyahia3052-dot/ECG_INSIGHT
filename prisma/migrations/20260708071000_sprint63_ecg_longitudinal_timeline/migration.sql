-- Sprint 63 — Enterprise ECG Longitudinal Timeline & Follow-up Engine

-- CreateEnum
CREATE TYPE "ECGFollowUpStatus" AS ENUM ('RECOMMENDED', 'SCHEDULED', 'DUE', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ECGTrendDirection" AS ENUM ('IMPROVING', 'WORSENING', 'STABLE', 'NEW', 'RESOLVED', 'INDETERMINATE');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ECG_TIMELINE_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'ECG_COMPARISON_PERFORMED';
ALTER TYPE "AuditAction" ADD VALUE 'ECG_HISTORICAL_DATA_ACCESSED';
ALTER TYPE "AuditAction" ADD VALUE 'ECG_TREND_ANALYSIS_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'ECG_FOLLOW_UP_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'ECG_LONGITUDINAL_REPORT_GENERATED';

-- AlterEnum
ALTER TYPE "TimelineEventType" ADD VALUE 'ECG_TIMELINE_VIEWED';
ALTER TYPE "TimelineEventType" ADD VALUE 'ECG_FOLLOW_UP_RECOMMENDED';
ALTER TYPE "TimelineEventType" ADD VALUE 'ECG_TREND_ANALYSIS_GENERATED';

-- CreateTable
CREATE TABLE "ECGTimeline" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "organizationId" TEXT,
    "branchId" TEXT,
    "physicianId" TEXT,
    "studyDate" TIMESTAMP(3) NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "reportUuid" TEXT,
    "diagnosis" TEXT,
    "interpretation" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "prInterval" INTEGER,
    "qrsDuration" INTEGER,
    "qtInterval" INTEGER,
    "qtcInterval" INTEGER,
    "axis" DOUBLE PRECISION,
    "rhythm" TEXT,
    "measurements" JSONB,
    "attachments" JSONB,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ECGTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ECGFollowUp" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caseId" TEXT,
    "timelineId" TEXT,
    "recommendation" TEXT NOT NULL,
    "summary" TEXT,
    "status" "ECGFollowUpStatus" NOT NULL DEFAULT 'RECOMMENDED',
    "dueDate" TIMESTAMP(3),
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ECGFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ECGComparisonHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "currentCaseId" TEXT NOT NULL,
    "previousCaseId" TEXT NOT NULL,
    "timelineId" TEXT,
    "evaluatedById" TEXT NOT NULL,
    "measurementDelta" JSONB NOT NULL,
    "diagnosisDelta" JSONB NOT NULL,
    "interpretationDelta" JSONB NOT NULL,
    "confidenceDelta" JSONB,
    "clinicalSignificance" TEXT NOT NULL,
    "trendSummary" JSONB NOT NULL,
    "followUpSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ECGComparisonHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ECGTrendSnapshot" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caseId" TEXT,
    "timelineId" TEXT,
    "comparisonId" TEXT,
    "trendType" TEXT NOT NULL,
    "direction" "ECGTrendDirection" NOT NULL,
    "metric" TEXT,
    "currentValue" DOUBLE PRECISION,
    "previousValue" DOUBLE PRECISION,
    "delta" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "statement" TEXT NOT NULL,
    "significance" TEXT,
    "metadata" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ECGTrendSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ECGTimeline_caseId_key" ON "ECGTimeline"("caseId");

-- CreateIndex
CREATE INDEX "ECGTimeline_patientId_idx" ON "ECGTimeline"("patientId");
CREATE INDEX "ECGTimeline_caseId_idx" ON "ECGTimeline"("caseId");
CREATE INDEX "ECGTimeline_organizationId_idx" ON "ECGTimeline"("organizationId");
CREATE INDEX "ECGTimeline_branchId_idx" ON "ECGTimeline"("branchId");
CREATE INDEX "ECGTimeline_physicianId_idx" ON "ECGTimeline"("physicianId");
CREATE INDEX "ECGTimeline_studyDate_idx" ON "ECGTimeline"("studyDate");
CREATE INDEX "ECGTimeline_acquisitionDate_idx" ON "ECGTimeline"("acquisitionDate");
CREATE INDEX "ECGTimeline_sequenceNumber_idx" ON "ECGTimeline"("sequenceNumber");
CREATE INDEX "ECGTimeline_createdAt_idx" ON "ECGTimeline"("createdAt");

-- CreateIndex
CREATE INDEX "ECGFollowUp_patientId_idx" ON "ECGFollowUp"("patientId");
CREATE INDEX "ECGFollowUp_caseId_idx" ON "ECGFollowUp"("caseId");
CREATE INDEX "ECGFollowUp_timelineId_idx" ON "ECGFollowUp"("timelineId");
CREATE INDEX "ECGFollowUp_status_idx" ON "ECGFollowUp"("status");
CREATE INDEX "ECGFollowUp_dueDate_idx" ON "ECGFollowUp"("dueDate");
CREATE INDEX "ECGFollowUp_createdAt_idx" ON "ECGFollowUp"("createdAt");

-- CreateIndex
CREATE INDEX "ECGComparisonHistory_patientId_idx" ON "ECGComparisonHistory"("patientId");
CREATE INDEX "ECGComparisonHistory_currentCaseId_idx" ON "ECGComparisonHistory"("currentCaseId");
CREATE INDEX "ECGComparisonHistory_previousCaseId_idx" ON "ECGComparisonHistory"("previousCaseId");
CREATE INDEX "ECGComparisonHistory_timelineId_idx" ON "ECGComparisonHistory"("timelineId");
CREATE INDEX "ECGComparisonHistory_evaluatedById_idx" ON "ECGComparisonHistory"("evaluatedById");
CREATE INDEX "ECGComparisonHistory_createdAt_idx" ON "ECGComparisonHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ECGTrendSnapshot_patientId_idx" ON "ECGTrendSnapshot"("patientId");
CREATE INDEX "ECGTrendSnapshot_caseId_idx" ON "ECGTrendSnapshot"("caseId");
CREATE INDEX "ECGTrendSnapshot_timelineId_idx" ON "ECGTrendSnapshot"("timelineId");
CREATE INDEX "ECGTrendSnapshot_comparisonId_idx" ON "ECGTrendSnapshot"("comparisonId");
CREATE INDEX "ECGTrendSnapshot_trendType_idx" ON "ECGTrendSnapshot"("trendType");
CREATE INDEX "ECGTrendSnapshot_direction_idx" ON "ECGTrendSnapshot"("direction");
CREATE INDEX "ECGTrendSnapshot_capturedAt_idx" ON "ECGTrendSnapshot"("capturedAt");

-- AddForeignKey
ALTER TABLE "ECGTimeline" ADD CONSTRAINT "ECGTimeline_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGTimeline" ADD CONSTRAINT "ECGTimeline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGTimeline" ADD CONSTRAINT "ECGTimeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGTimeline" ADD CONSTRAINT "ECGTimeline_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGTimeline" ADD CONSTRAINT "ECGTimeline_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECGFollowUp" ADD CONSTRAINT "ECGFollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGFollowUp" ADD CONSTRAINT "ECGFollowUp_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGFollowUp" ADD CONSTRAINT "ECGFollowUp_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "ECGTimeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGFollowUp" ADD CONSTRAINT "ECGFollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGFollowUp" ADD CONSTRAINT "ECGFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECGComparisonHistory" ADD CONSTRAINT "ECGComparisonHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGComparisonHistory" ADD CONSTRAINT "ECGComparisonHistory_currentCaseId_fkey" FOREIGN KEY ("currentCaseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGComparisonHistory" ADD CONSTRAINT "ECGComparisonHistory_previousCaseId_fkey" FOREIGN KEY ("previousCaseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGComparisonHistory" ADD CONSTRAINT "ECGComparisonHistory_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "ECGTimeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGComparisonHistory" ADD CONSTRAINT "ECGComparisonHistory_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECGTrendSnapshot" ADD CONSTRAINT "ECGTrendSnapshot_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGTrendSnapshot" ADD CONSTRAINT "ECGTrendSnapshot_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGTrendSnapshot" ADD CONSTRAINT "ECGTrendSnapshot_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "ECGTimeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGTrendSnapshot" ADD CONSTRAINT "ECGTrendSnapshot_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "ECGComparisonHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
