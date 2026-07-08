-- Sprint 66: Enterprise Notification & Clinical Event Engine

ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'HIGH_RISK_ECG';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'PHYSICIAN_REVIEW_REQUIRED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_DUE';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_OVERDUE';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'AI_ANALYSIS_COMPLETED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'REPORT_APPROVED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'REPORT_REJECTED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'CASE_ARCHIVED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'CASE_RESTORED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'TIMELINE_UPDATED';

CREATE TYPE "ClinicalEventType" AS ENUM (
  'CRITICAL_ECG',
  'HIGH_RISK_ECG',
  'PHYSICIAN_REVIEW_REQUIRED',
  'FOLLOW_UP_DUE',
  'FOLLOW_UP_OVERDUE',
  'AI_ANALYSIS_COMPLETED',
  'REPORT_APPROVED',
  'REPORT_REJECTED',
  'REPORT_EXPORTED',
  'CASE_ARCHIVED',
  'CASE_RESTORED',
  'TIMELINE_UPDATED'
);

CREATE TYPE "EnterpriseDeliveryMode" AS ENUM (
  'IN_APP',
  'EMAIL_READY',
  'WEBHOOK_READY',
  'PUSH_READY',
  'SMS_READY'
);

CREATE TYPE "NotificationRecipientStatus" AS ENUM (
  'PENDING',
  'DELIVERED',
  'READ',
  'FAILED'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINICAL_EVENT_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'NOTIFICATION_ENGINE_DELIVERED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'NOTIFICATION_ENGINE_READ';

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "clinicalEventId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "engineVersion" TEXT DEFAULT 'sprint66-v1';

CREATE TABLE "ClinicalEvent" (
  "id" TEXT NOT NULL,
  "eventType" "ClinicalEventType" NOT NULL,
  "caseId" TEXT,
  "patientId" TEXT,
  "actorId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payloadJson" JSONB,
  "engineVersion" TEXT NOT NULL DEFAULT 'sprint66-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationRecipient" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deliveryMode" "EnterpriseDeliveryMode" NOT NULL DEFAULT 'IN_APP',
  "status" "NotificationRecipientStatus" NOT NULL DEFAULT 'PENDING',
  "readAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationRule" (
  "id" TEXT NOT NULL,
  "ruleCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "eventType" "ClinicalEventType" NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "notificationType" "NotificationType" NOT NULL DEFAULT 'INFO',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "deliveryModes" "EnterpriseDeliveryMode"[],
  "templateKey" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "criteriaJson" JSONB,
  "version" TEXT NOT NULL DEFAULT 'sprint66-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationRule_ruleCode_key" ON "NotificationRule"("ruleCode");
CREATE INDEX "NotificationRule_eventType_idx" ON "NotificationRule"("eventType");
CREATE INDEX "NotificationRule_enabled_idx" ON "NotificationRule"("enabled");
CREATE INDEX "NotificationRule_category_idx" ON "NotificationRule"("category");

CREATE INDEX "ClinicalEvent_eventType_idx" ON "ClinicalEvent"("eventType");
CREATE INDEX "ClinicalEvent_caseId_idx" ON "ClinicalEvent"("caseId");
CREATE INDEX "ClinicalEvent_patientId_idx" ON "ClinicalEvent"("patientId");
CREATE INDEX "ClinicalEvent_actorId_idx" ON "ClinicalEvent"("actorId");
CREATE INDEX "ClinicalEvent_createdAt_idx" ON "ClinicalEvent"("createdAt");

CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_deliveryMode_key"
  ON "NotificationRecipient"("notificationId", "userId", "deliveryMode");
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");
CREATE INDEX "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");
CREATE INDEX "NotificationRecipient_status_idx" ON "NotificationRecipient"("status");
CREATE INDEX "NotificationRecipient_readAt_idx" ON "NotificationRecipient"("readAt");

CREATE INDEX "Notification_clinicalEventId_idx" ON "Notification"("clinicalEventId");

ALTER TABLE "ClinicalEvent"
  ADD CONSTRAINT "ClinicalEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicalEvent"
  ADD CONSTRAINT "ClinicalEvent_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalEvent"
  ADD CONSTRAINT "ClinicalEvent_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationRecipient"
  ADD CONSTRAINT "NotificationRecipient_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationRecipient"
  ADD CONSTRAINT "NotificationRecipient_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_clinicalEventId_fkey"
  FOREIGN KEY ("clinicalEventId") REFERENCES "ClinicalEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InteroperabilityLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "InteroperabilityLog_organizationId_idx" ON "InteroperabilityLog"("organizationId");
ALTER TABLE "InteroperabilityLog"
  ADD CONSTRAINT "InteroperabilityLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
