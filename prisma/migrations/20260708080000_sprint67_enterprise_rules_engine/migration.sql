-- Sprint 67 — Enterprise Clinical Rules Engine

CREATE TYPE "EnterpriseRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "EnterpriseRuleField" AS ENUM (
  'QT_INTERVAL',
  'QTC_INTERVAL',
  'HEART_RATE',
  'QRS_DURATION',
  'PR_INTERVAL',
  'ST_DEVIATION',
  'ST_ELEVATION',
  'RISK_SCORE',
  'CLINICAL_PRIORITY',
  'PVC_COUNT',
  'AF_DETECTED',
  'BBB_DETECTED'
);
CREATE TYPE "EnterpriseRuleOperator" AS ENUM ('GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ', 'CONTAINS', 'IS_TRUE', 'IS_FALSE');
CREATE TYPE "EnterpriseRuleLogic" AS ENUM ('AND', 'OR');
CREATE TYPE "EnterpriseRuleActionType" AS ENUM (
  'GENERATE_ALERT',
  'CREATE_RECOMMENDATION',
  'SCHEDULE_FOLLOW_UP',
  'NOTIFY_PHYSICIAN',
  'NOTIFY_ADMIN',
  'ESCALATE_CASE',
  'MARK_CRITICAL',
  'REQUIRE_MANUAL_REVIEW'
);
CREATE TYPE "EnterpriseRuleExecutionStatus" AS ENUM ('MATCHED', 'NOT_MATCHED', 'ERROR');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ENTERPRISE_RULE_EXECUTED';

CREATE TABLE "ClinicalRule" (
  "id" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "status" "EnterpriseRuleStatus" NOT NULL DEFAULT 'ACTIVE',
  "conditionRootLogic" "EnterpriseRuleLogic" NOT NULL DEFAULT 'AND',
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "organizationId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RuleVersion" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "status" "EnterpriseRuleStatus" NOT NULL,
  "conditionRootLogic" "EnterpriseRuleLogic" NOT NULL,
  "snapshotJson" JSONB NOT NULL,
  "changeNotes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuleVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RuleCondition" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL DEFAULT 'default',
  "groupLogic" "EnterpriseRuleLogic" NOT NULL DEFAULT 'AND',
  "field" "EnterpriseRuleField" NOT NULL,
  "operator" "EnterpriseRuleOperator" NOT NULL,
  "threshold" DOUBLE PRECISION,
  "stringValue" TEXT,
  "boolValue" BOOLEAN,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuleCondition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RuleAction" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "actionType" "EnterpriseRuleActionType" NOT NULL,
  "payload" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuleAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RuleExecution" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "ruleVersion" INTEGER NOT NULL,
  "caseId" TEXT,
  "patientId" TEXT,
  "status" "EnterpriseRuleExecutionStatus" NOT NULL,
  "matched" BOOLEAN NOT NULL,
  "inputSnapshot" JSONB NOT NULL,
  "outputSnapshot" JSONB,
  "executedById" TEXT,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuleExecution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalRule_ruleKey_key" ON "ClinicalRule"("ruleKey");
CREATE INDEX "ClinicalRule_category_idx" ON "ClinicalRule"("category");
CREATE INDEX "ClinicalRule_enabled_idx" ON "ClinicalRule"("enabled");
CREATE INDEX "ClinicalRule_status_idx" ON "ClinicalRule"("status");
CREATE INDEX "ClinicalRule_priority_idx" ON "ClinicalRule"("priority");
CREATE INDEX "ClinicalRule_organizationId_idx" ON "ClinicalRule"("organizationId");

CREATE UNIQUE INDEX "RuleVersion_ruleId_versionNumber_key" ON "RuleVersion"("ruleId", "versionNumber");
CREATE INDEX "RuleVersion_ruleId_idx" ON "RuleVersion"("ruleId");
CREATE INDEX "RuleVersion_createdAt_idx" ON "RuleVersion"("createdAt");

CREATE INDEX "RuleCondition_ruleId_idx" ON "RuleCondition"("ruleId");
CREATE INDEX "RuleCondition_groupId_idx" ON "RuleCondition"("groupId");
CREATE INDEX "RuleCondition_field_idx" ON "RuleCondition"("field");

CREATE INDEX "RuleAction_ruleId_idx" ON "RuleAction"("ruleId");
CREATE INDEX "RuleAction_actionType_idx" ON "RuleAction"("actionType");

CREATE INDEX "RuleExecution_ruleId_idx" ON "RuleExecution"("ruleId");
CREATE INDEX "RuleExecution_caseId_idx" ON "RuleExecution"("caseId");
CREATE INDEX "RuleExecution_patientId_idx" ON "RuleExecution"("patientId");
CREATE INDEX "RuleExecution_status_idx" ON "RuleExecution"("status");
CREATE INDEX "RuleExecution_matched_idx" ON "RuleExecution"("matched");
CREATE INDEX "RuleExecution_executedAt_idx" ON "RuleExecution"("executedAt");

ALTER TABLE "ClinicalRule" ADD CONSTRAINT "ClinicalRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RuleVersion" ADD CONSTRAINT "RuleVersion_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ClinicalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuleVersion" ADD CONSTRAINT "RuleVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RuleCondition" ADD CONSTRAINT "RuleCondition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ClinicalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuleAction" ADD CONSTRAINT "RuleAction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ClinicalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuleExecution" ADD CONSTRAINT "RuleExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ClinicalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuleExecution" ADD CONSTRAINT "RuleExecution_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RuleExecution" ADD CONSTRAINT "RuleExecution_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
