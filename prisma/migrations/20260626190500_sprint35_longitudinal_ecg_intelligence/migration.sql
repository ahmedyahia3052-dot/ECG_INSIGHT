-- Sprint 35 Enterprise Longitudinal ECG Intelligence Platform

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LONGITUDINAL_ECG_COMPARISON_COMPLETED';

CREATE TYPE "LongitudinalComparisonScope" AS ENUM ('PREVIOUS', 'BASELINE', 'HISTORICAL');
CREATE TYPE "LongitudinalChangeType" AS ENUM (
  'IMPROVEMENT',
  'WORSENING',
  'NEW_ABNORMALITY',
  'RESOLVED_ABNORMALITY',
  'PERSISTENT_ABNORMALITY',
  'NO_SIGNIFICANT_CHANGE'
);
CREATE TYPE "OccupationalSurveillanceType" AS ENUM (
  'PRE_EMPLOYMENT',
  'PERIODIC_EXAMINATION',
  'RETURN_TO_WORK',
  'POST_INCIDENT',
  'EXIT_EXAMINATION'
);
CREATE TYPE "LongitudinalFindingCategory" AS ENUM (
  'HEART_RATE_TREND',
  'RHYTHM_TREND',
  'QT_TREND',
  'PR_TREND',
  'QRS_TREND',
  'AXIS_TREND',
  'AV_BLOCK_PROGRESSION',
  'ISCHEMIA_PROGRESSION',
  'PERSISTENT_AF',
  'RECURRENT_ARRHYTHMIA',
  'CONDUCTION_DISEASE',
  'RISK_PROGRESSION',
  'OCCUPATIONAL_SURVEILLANCE'
);

CREATE TABLE "LongitudinalECGComparison" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "currentCaseId" TEXT NOT NULL,
  "baselineCaseId" TEXT,
  "comparedCaseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "evaluatedById" TEXT NOT NULL,
  "scope" "LongitudinalComparisonScope" NOT NULL,
  "surveillanceType" "OccupationalSurveillanceType",
  "overallChange" "LongitudinalChangeType" NOT NULL,
  "aiTrendStatement" TEXT NOT NULL,
  "clinicalDisclaimer" TEXT NOT NULL,
  "trendMetrics" JSONB NOT NULL,
  "abnormalityTimeline" JSONB NOT NULL,
  "riskProgression" JSONB NOT NULL,
  "occupationalSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LongitudinalECGComparison_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LongitudinalECGFinding" (
  "id" TEXT NOT NULL,
  "comparisonId" TEXT NOT NULL,
  "category" "LongitudinalFindingCategory" NOT NULL,
  "changeType" "LongitudinalChangeType" NOT NULL,
  "title" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "severity" "AISeverity" NOT NULL DEFAULT 'MILD',
  "evidence" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LongitudinalECGFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LongitudinalECGComparison_patientId_idx" ON "LongitudinalECGComparison"("patientId");
CREATE INDEX "LongitudinalECGComparison_currentCaseId_idx" ON "LongitudinalECGComparison"("currentCaseId");
CREATE INDEX "LongitudinalECGComparison_baselineCaseId_idx" ON "LongitudinalECGComparison"("baselineCaseId");
CREATE INDEX "LongitudinalECGComparison_evaluatedById_idx" ON "LongitudinalECGComparison"("evaluatedById");
CREATE INDEX "LongitudinalECGComparison_scope_idx" ON "LongitudinalECGComparison"("scope");
CREATE INDEX "LongitudinalECGComparison_surveillanceType_idx" ON "LongitudinalECGComparison"("surveillanceType");
CREATE INDEX "LongitudinalECGComparison_overallChange_idx" ON "LongitudinalECGComparison"("overallChange");
CREATE INDEX "LongitudinalECGComparison_createdAt_idx" ON "LongitudinalECGComparison"("createdAt");

CREATE INDEX "LongitudinalECGFinding_comparisonId_idx" ON "LongitudinalECGFinding"("comparisonId");
CREATE INDEX "LongitudinalECGFinding_category_idx" ON "LongitudinalECGFinding"("category");
CREATE INDEX "LongitudinalECGFinding_changeType_idx" ON "LongitudinalECGFinding"("changeType");
CREATE INDEX "LongitudinalECGFinding_severity_idx" ON "LongitudinalECGFinding"("severity");

ALTER TABLE "LongitudinalECGComparison"
  ADD CONSTRAINT "LongitudinalECGComparison_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "LongitudinalECGComparison_currentCaseId_fkey" FOREIGN KEY ("currentCaseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "LongitudinalECGComparison_baselineCaseId_fkey" FOREIGN KEY ("baselineCaseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "LongitudinalECGComparison_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LongitudinalECGFinding"
  ADD CONSTRAINT "LongitudinalECGFinding_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "LongitudinalECGComparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;
