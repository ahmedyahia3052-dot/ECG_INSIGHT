-- Sprint 32 Enterprise Communication & Notification Center

CREATE TYPE "NotificationCategory" AS ENUM (
  'CRITICAL_ECG_ALERT',
  'SUBSCRIPTION_EVENT',
  'PAYMENT_EVENT',
  'REPORT_GENERATION',
  'USER_INVITATION',
  'OCCUPATIONAL_CLEARANCE',
  'SYSTEM_ALERT'
);

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'SMS');
CREATE TYPE "NotificationFrequency" AS ENUM ('IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST', 'MUTED');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "NotificationProvider" AS ENUM ('IN_APP', 'SMTP', 'SENDGRID', 'FIREBASE_PUSH', 'TWILIO_SMS');

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM_ALERT',
  "titleTemplate" TEXT NOT NULL,
  "bodyTemplate" TEXT NOT NULL,
  "htmlTemplate" TEXT,
  "smsTemplate" TEXT,
  "pushTemplate" TEXT,
  "variables" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "frequency" "NotificationFrequency" NOT NULL DEFAULT 'IMMEDIATE',
  "quietHoursJson" JSONB,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDeliveryLog" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "provider" "NotificationProvider" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "recipient" TEXT,
  "subject" TEXT,
  "payloadJson" JSONB,
  "errorMessage" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification"
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM_ALERT',
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "NotificationTemplate_key_locale_key" ON "NotificationTemplate"("key", "locale");
CREATE INDEX "NotificationTemplate_category_idx" ON "NotificationTemplate"("category");
CREATE INDEX "NotificationTemplate_active_idx" ON "NotificationTemplate"("active");

CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
CREATE INDEX "NotificationPreference_category_idx" ON "NotificationPreference"("category");
CREATE INDEX "NotificationPreference_frequency_idx" ON "NotificationPreference"("frequency");

CREATE INDEX "NotificationDeliveryLog_notificationId_idx" ON "NotificationDeliveryLog"("notificationId");
CREATE INDEX "NotificationDeliveryLog_userId_idx" ON "NotificationDeliveryLog"("userId");
CREATE INDEX "NotificationDeliveryLog_channel_idx" ON "NotificationDeliveryLog"("channel");
CREATE INDEX "NotificationDeliveryLog_provider_idx" ON "NotificationDeliveryLog"("provider");
CREATE INDEX "NotificationDeliveryLog_status_idx" ON "NotificationDeliveryLog"("status");
CREATE INDEX "NotificationDeliveryLog_createdAt_idx" ON "NotificationDeliveryLog"("createdAt");

CREATE INDEX "Notification_templateId_idx" ON "Notification"("templateId");
CREATE INDEX "Notification_category_idx" ON "Notification"("category");
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
CREATE INDEX "Notification_scheduledAt_idx" ON "Notification"("scheduledAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDeliveryLog"
  ADD CONSTRAINT "NotificationDeliveryLog_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "NotificationDeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
