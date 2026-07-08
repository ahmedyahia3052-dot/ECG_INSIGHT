-- Sprint 64 — ECG Clinical Alerts & Risk Stratification Engine

CREATE TYPE "EcgAlertSeverity" AS ENUM (
  'NORMAL',
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "EcgAlertCode" AS ENUM (
  'CRITICAL_QT_PROLONGATION',
  'BRADYCARDIA',
  'TACHYCARDIA',
  'ATRIAL_FIBRILLATION',
  'ATRIAL_FLUTTER',
  'ST_ELEVATION',
  'ST_DEPRESSION',
  'WIDE_QRS',
  'EXTREME_AXIS',
  'HIGH_PVC_BURDEN',
  'POSSIBLE_AV_BLOCK',
  'BUNDLE_BRANCH_BLOCK',
  'POSSIBLE_ACUTE_MI',
  'POSSIBLE_HYPERKALEMIA',
  'POSSIBLE_HYPOKALEMIA'
);

CREATE TYPE "EcgAlertStatus" AS ENUM (
  'ACTIVE',
  'ACKNOWLEDGED',
  'RESOLVED',
  'SUPERSEDED'
);

CREATE TYPE "EcgRiskCategory" AS ENUM (
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "EcgClinicalPriority" AS ENUM (
  'ROUTINE',
  'ELEVATED',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "EcgUrgencyLevel" AS ENUM (
  'ROUTINE',
  'URGENT',
  'EMERGENT',
  'CRITICAL'
);

CREATE TYPE "EcgAlertHistoryEventType" AS ENUM (
  'ALERT_GENERATED',
  'ALERT_ACKNOWLEDGED',
  'RISK_CALCULATED',
  'RISK_RECALCULATED'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ECG_ALERT_ENGINE_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ECG_RISK_ENGINE_RECALCULATED';

ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "alertCode" "EcgAlertCode";
ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "alertSeverity" "EcgAlertSeverity";
ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "supportingFindings" JSONB;
ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "evidence" JSONB;
ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "engineVersion" TEXT;
ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "sourceEngine" TEXT;
ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "status" "EcgAlertStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "generatedById" TEXT;
ALTER TABLE "ECGClinicalAlert" ADD COLUMN IF NOT EXISTS "supersededAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ECGClinicalAlert_alertCode_idx" ON "ECGClinicalAlert"("alertCode");
CREATE INDEX IF NOT EXISTS "ECGClinicalAlert_alertSeverity_idx" ON "ECGClinicalAlert"("alertSeverity");
CREATE INDEX IF NOT EXISTS "ECGClinicalAlert_status_idx" ON "ECGClinicalAlert"("status");
CREATE INDEX IF NOT EXISTS "ECGClinicalAlert_sourceEngine_idx" ON "ECGClinicalAlert"("sourceEngine");

ALTER TABLE "ECGClinicalAlert" ADD CONSTRAINT "ECGClinicalAlert_generatedById_fkey"
  FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ECGRiskAssessment" (
  "id" TEXT NOT NULL,
  "assessmentGroupId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "riskScore" DOUBLE PRECISION NOT NULL,
  "riskCategory" "EcgRiskCategory" NOT NULL,
  "clinicalPriority" "EcgClinicalPriority" NOT NULL,
  "urgency" "EcgUrgencyLevel" NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "supportingFindings" JSONB NOT NULL,
  "engineVersion" TEXT NOT NULL,
  "calculatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ECGRiskAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ECGRiskFactor" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL,
  "contribution" DOUBLE PRECISION NOT NULL,
  "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECGRiskFactor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ECGAlertHistory" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "eventType" "EcgAlertHistoryEventType" NOT NULL,
  "alertId" TEXT,
  "assessmentId" TEXT,
  "payload" JSONB NOT NULL,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECGAlertHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ECGRiskAssessment_assessmentGroupId_versionNumber_key" ON "ECGRiskAssessment"("assessmentGroupId", "versionNumber");
CREATE INDEX "ECGRiskAssessment_caseId_idx" ON "ECGRiskAssessment"("caseId");
CREATE INDEX "ECGRiskAssessment_patientId_idx" ON "ECGRiskAssessment"("patientId");
CREATE INDEX "ECGRiskAssessment_assessmentGroupId_idx" ON "ECGRiskAssessment"("assessmentGroupId");
CREATE INDEX "ECGRiskAssessment_riskCategory_idx" ON "ECGRiskAssessment"("riskCategory");
CREATE INDEX "ECGRiskAssessment_createdAt_idx" ON "ECGRiskAssessment"("createdAt");

CREATE INDEX "ECGRiskFactor_assessmentId_idx" ON "ECGRiskFactor"("assessmentId");
CREATE INDEX "ECGRiskFactor_code_idx" ON "ECGRiskFactor"("code");

CREATE INDEX "ECGAlertHistory_caseId_idx" ON "ECGAlertHistory"("caseId");
CREATE INDEX "ECGAlertHistory_patientId_idx" ON "ECGAlertHistory"("patientId");
CREATE INDEX "ECGAlertHistory_eventType_idx" ON "ECGAlertHistory"("eventType");
CREATE INDEX "ECGAlertHistory_alertId_idx" ON "ECGAlertHistory"("alertId");
CREATE INDEX "ECGAlertHistory_assessmentId_idx" ON "ECGAlertHistory"("assessmentId");
CREATE INDEX "ECGAlertHistory_createdAt_idx" ON "ECGAlertHistory"("createdAt");

ALTER TABLE "ECGRiskAssessment" ADD CONSTRAINT "ECGRiskAssessment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGRiskAssessment" ADD CONSTRAINT "ECGRiskAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGRiskAssessment" ADD CONSTRAINT "ECGRiskAssessment_calculatedById_fkey" FOREIGN KEY ("calculatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ECGRiskFactor" ADD CONSTRAINT "ECGRiskFactor_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ECGRiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ECGAlertHistory" ADD CONSTRAINT "ECGAlertHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGAlertHistory" ADD CONSTRAINT "ECGAlertHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGAlertHistory" ADD CONSTRAINT "ECGAlertHistory_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "ECGClinicalAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGAlertHistory" ADD CONSTRAINT "ECGAlertHistory_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ECGRiskAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGAlertHistory" ADD CONSTRAINT "ECGAlertHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
