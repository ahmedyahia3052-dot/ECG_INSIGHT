-- Sprint 34 Enterprise Clinical Decision Support Engine

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CDSS_DECISION_GENERATED';

CREATE TYPE "CDSSRuleCategory" AS ENUM (
  'RHYTHM',
  'QT_INTERVAL',
  'ISCHEMIA',
  'ARRHYTHMIA',
  'CONDUCTION',
  'RISK',
  'OCCUPATIONAL_FITNESS',
  'RECOMMENDATION',
  'RED_FLAG',
  'TREND'
);

CREATE TYPE "CDSSRiskCategory" AS ENUM ('LOW_RISK', 'MODERATE_RISK', 'HIGH_RISK', 'CRITICAL');
CREATE TYPE "CDSSRecommendationPriority" AS ENUM ('ROUTINE', 'SOON', 'URGENT', 'EMERGENCY');
CREATE TYPE "CDSSOccupationalDecision" AS ENUM ('FIT', 'FIT_WITH_RESTRICTIONS', 'TEMPORARILY_UNFIT', 'PERMANENTLY_UNFIT');
CREATE TYPE "CDSSRunStatus" AS ENUM ('COMPLETED', 'FAILED');
CREATE TYPE "CDSSFindingType" AS ENUM (
  'RULE_TRIGGER',
  'RISK_FACTOR',
  'RECOMMENDATION',
  'RED_FLAG',
  'OCCUPATIONAL_DECISION',
  'TREND'
);

CREATE TABLE "ClinicalDecisionRule" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "category" "CDSSRuleCategory" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "thresholdJson" JSONB,
  "evidenceLevel" TEXT NOT NULL DEFAULT 'enterprise-consensus',
  "version" TEXT NOT NULL DEFAULT '1.0',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalDecisionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalDecisionSupportRun" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "evaluatedById" TEXT NOT NULL,
  "status" "CDSSRunStatus" NOT NULL DEFAULT 'COMPLETED',
  "riskCategory" "CDSSRiskCategory" NOT NULL,
  "riskScore" DOUBLE PRECISION NOT NULL,
  "occupationalDecision" "CDSSOccupationalDecision" NOT NULL,
  "occupationalProfile" TEXT,
  "summary" TEXT NOT NULL,
  "trendSummary" TEXT,
  "explainabilityJson" JSONB NOT NULL,
  "inputSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalDecisionSupportRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalDecisionFinding" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "findingType" "CDSSFindingType" NOT NULL,
  "ruleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "AISeverity" NOT NULL DEFAULT 'MILD',
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "evidence" JSONB NOT NULL,
  "recommendation" TEXT,
  "priority" "CDSSRecommendationPriority",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalDecisionFinding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalDecisionRule_ruleId_key" ON "ClinicalDecisionRule"("ruleId");
CREATE INDEX "ClinicalDecisionRule_ruleId_idx" ON "ClinicalDecisionRule"("ruleId");
CREATE INDEX "ClinicalDecisionRule_category_idx" ON "ClinicalDecisionRule"("category");
CREATE INDEX "ClinicalDecisionRule_enabled_idx" ON "ClinicalDecisionRule"("enabled");

CREATE INDEX "ClinicalDecisionSupportRun_caseId_idx" ON "ClinicalDecisionSupportRun"("caseId");
CREATE INDEX "ClinicalDecisionSupportRun_patientId_idx" ON "ClinicalDecisionSupportRun"("patientId");
CREATE INDEX "ClinicalDecisionSupportRun_evaluatedById_idx" ON "ClinicalDecisionSupportRun"("evaluatedById");
CREATE INDEX "ClinicalDecisionSupportRun_riskCategory_idx" ON "ClinicalDecisionSupportRun"("riskCategory");
CREATE INDEX "ClinicalDecisionSupportRun_createdAt_idx" ON "ClinicalDecisionSupportRun"("createdAt");

CREATE INDEX "ClinicalDecisionFinding_runId_idx" ON "ClinicalDecisionFinding"("runId");
CREATE INDEX "ClinicalDecisionFinding_findingType_idx" ON "ClinicalDecisionFinding"("findingType");
CREATE INDEX "ClinicalDecisionFinding_ruleId_idx" ON "ClinicalDecisionFinding"("ruleId");
CREATE INDEX "ClinicalDecisionFinding_severity_idx" ON "ClinicalDecisionFinding"("severity");
CREATE INDEX "ClinicalDecisionFinding_priority_idx" ON "ClinicalDecisionFinding"("priority");

ALTER TABLE "ClinicalDecisionRule"
  ADD CONSTRAINT "ClinicalDecisionRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicalDecisionSupportRun"
  ADD CONSTRAINT "ClinicalDecisionSupportRun_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalDecisionSupportRun_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalDecisionSupportRun_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClinicalDecisionFinding"
  ADD CONSTRAINT "ClinicalDecisionFinding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ClinicalDecisionSupportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
