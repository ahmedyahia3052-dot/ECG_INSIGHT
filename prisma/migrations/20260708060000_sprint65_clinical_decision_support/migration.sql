-- Sprint 65: Clinical Decision Support & Follow-up Engine

CREATE TYPE "ClinicalRecommendationType" AS ENUM (
  'REPEAT_ECG',
  'HOLTER_MONITOR',
  'ECHOCARDIOGRAPHY',
  'TROPONIN',
  'ELECTROLYTES',
  'CARDIOLOGY_REFERRAL',
  'EMERGENCY_EVALUATION',
  'HOSPITAL_ADMISSION',
  'OBSERVATION',
  'REPEAT_MEASUREMENTS',
  'MANUAL_REVIEW_REQUIRED'
);

CREATE TYPE "ClinicalRecommendationStatus" AS ENUM (
  'GENERATED',
  'ACCEPTED',
  'REJECTED',
  'SUPERSEDED'
);

CREATE TYPE "FollowUpPriority" AS ENUM (
  'ROUTINE',
  'URGENT',
  'EMERGENT',
  'CRITICAL'
);

CREATE TYPE "FollowUpReviewStatus" AS ENUM (
  'PENDING',
  'SCHEDULED',
  'IN_REVIEW',
  'COMPLETED',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE "FollowUpReminderStatus" AS ENUM (
  'PENDING',
  'SENT',
  'ACKNOWLEDGED',
  'DISMISSED'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINICAL_RECOMMENDATION_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINICAL_RECOMMENDATION_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINICAL_RECOMMENDATION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_PLAN_CREATED';

CREATE TABLE "DecisionSupportRule" (
  "id" TEXT NOT NULL,
  "ruleCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "recommendationTypes" "ClinicalRecommendationType"[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priorityWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "criteriaJson" JSONB,
  "evidenceLevel" TEXT NOT NULL DEFAULT 'guideline',
  "version" TEXT NOT NULL DEFAULT 'sprint65-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DecisionSupportRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DecisionSupportRule_ruleCode_key" ON "DecisionSupportRule"("ruleCode");
CREATE INDEX "DecisionSupportRule_enabled_idx" ON "DecisionSupportRule"("enabled");
CREATE INDEX "DecisionSupportRule_ruleCode_idx" ON "DecisionSupportRule"("ruleCode");

CREATE TABLE "CaseClinicalRecommendation" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "recommendationType" "ClinicalRecommendationType" NOT NULL,
  "title" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reasoning" TEXT NOT NULL,
  "supportingFindings" JSONB NOT NULL,
  "clinicalEvidence" JSONB NOT NULL,
  "priorityScore" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "status" "ClinicalRecommendationStatus" NOT NULL DEFAULT 'GENERATED',
  "ruleCode" TEXT,
  "generatedById" TEXT,
  "acceptedById" TEXT,
  "rejectedById" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CaseClinicalRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaseClinicalRecommendation_caseId_idx" ON "CaseClinicalRecommendation"("caseId");
CREATE INDEX "CaseClinicalRecommendation_patientId_idx" ON "CaseClinicalRecommendation"("patientId");
CREATE INDEX "CaseClinicalRecommendation_recommendationType_idx" ON "CaseClinicalRecommendation"("recommendationType");
CREATE INDEX "CaseClinicalRecommendation_status_idx" ON "CaseClinicalRecommendation"("status");
CREATE INDEX "CaseClinicalRecommendation_priorityScore_idx" ON "CaseClinicalRecommendation"("priorityScore");
CREATE INDEX "CaseClinicalRecommendation_createdAt_idx" ON "CaseClinicalRecommendation"("createdAt");

CREATE TABLE "FollowUpPlan" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "nextEcgDate" TIMESTAMP(3),
  "recommendedIntervalDays" INTEGER NOT NULL,
  "priority" "FollowUpPriority" NOT NULL,
  "reviewStatus" "FollowUpReviewStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "reasoning" TEXT,
  "generatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FollowUpPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FollowUpPlan_caseId_idx" ON "FollowUpPlan"("caseId");
CREATE INDEX "FollowUpPlan_patientId_idx" ON "FollowUpPlan"("patientId");
CREATE INDEX "FollowUpPlan_priority_idx" ON "FollowUpPlan"("priority");
CREATE INDEX "FollowUpPlan_reviewStatus_idx" ON "FollowUpPlan"("reviewStatus");
CREATE INDEX "FollowUpPlan_nextEcgDate_idx" ON "FollowUpPlan"("nextEcgDate");
CREATE INDEX "FollowUpPlan_createdAt_idx" ON "FollowUpPlan"("createdAt");

CREATE TABLE "FollowUpReminder" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "reminderDate" TIMESTAMP(3) NOT NULL,
  "status" "FollowUpReminderStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FollowUpReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FollowUpReminder_planId_idx" ON "FollowUpReminder"("planId");
CREATE INDEX "FollowUpReminder_caseId_idx" ON "FollowUpReminder"("caseId");
CREATE INDEX "FollowUpReminder_patientId_idx" ON "FollowUpReminder"("patientId");
CREATE INDEX "FollowUpReminder_reminderDate_idx" ON "FollowUpReminder"("reminderDate");
CREATE INDEX "FollowUpReminder_status_idx" ON "FollowUpReminder"("status");

ALTER TABLE "CaseClinicalRecommendation" ADD CONSTRAINT "CaseClinicalRecommendation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseClinicalRecommendation" ADD CONSTRAINT "CaseClinicalRecommendation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseClinicalRecommendation" ADD CONSTRAINT "CaseClinicalRecommendation_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseClinicalRecommendation" ADD CONSTRAINT "CaseClinicalRecommendation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseClinicalRecommendation" ADD CONSTRAINT "CaseClinicalRecommendation_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseClinicalRecommendation" ADD CONSTRAINT "CaseClinicalRecommendation_ruleCode_fkey" FOREIGN KEY ("ruleCode") REFERENCES "DecisionSupportRule"("ruleCode") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FollowUpReminder" ADD CONSTRAINT "FollowUpReminder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "FollowUpPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpReminder" ADD CONSTRAINT "FollowUpReminder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpReminder" ADD CONSTRAINT "FollowUpReminder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
