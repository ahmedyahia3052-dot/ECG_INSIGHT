ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'BASIC';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'UNLIMITED';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'LIFETIME';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LICENSE_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PAYMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USAGE_RECORDED';

CREATE TYPE "BillingCycle" AS ENUM ('DAILY', 'MONTHLY', 'YEARLY', 'LIFETIME');
CREATE TYPE "LicenseType" AS ENUM ('LIFETIME', 'ENTERPRISE_SEAT');
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "PaymentProvider" AS ENUM ('PAYMOB', 'INSTAPAY', 'WALLET', 'CARD', 'STRIPE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'PAID', 'REFUNDED');
CREATE TYPE "BillingEventType" AS ENUM (
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_CANCELED',
  'LICENSE_GRANTED',
  'LICENSE_REVOKED',
  'PAYMENT_INITIATED',
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'QUOTA_WARNING',
  'QUOTA_EXHAUSTED',
  'USAGE_RECORDED'
);

CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "code" "SubscriptionTier" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "analysisQuota" INTEGER,
  "quotaWindowHours" INTEGER,
  "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "multiUser" BOOLEAN NOT NULL DEFAULT false,
  "teamManagement" BOOLEAN NOT NULL DEFAULT false,
  "ownerConfigurable" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3),
  "renewalDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "License" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "LicenseType" NOT NULL DEFAULT 'LIFETIME',
  "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "grantedById" TEXT,
  "reason" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "transactionId" TEXT,
  "paymentMethod" TEXT,
  "receiptUrl" TEXT,
  "callbackPayload" JSONB,
  "providerPayload" JSONB,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "action" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "subscriptionId" TEXT,
  "type" "BillingEventType" NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
CREATE INDEX "SubscriptionPlan_active_idx" ON "SubscriptionPlan"("active");
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");
CREATE INDEX "UserSubscription_planId_idx" ON "UserSubscription"("planId");
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");
CREATE INDEX "UserSubscription_renewalDate_idx" ON "UserSubscription"("renewalDate");
CREATE INDEX "UserSubscription_expirationDate_idx" ON "UserSubscription"("expirationDate");
CREATE INDEX "License_userId_idx" ON "License"("userId");
CREATE INDEX "License_status_idx" ON "License"("status");
CREATE INDEX "License_type_idx" ON "License"("type");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_transactionId_idx" ON "Payment"("transactionId");
CREATE INDEX "UsageRecord_userId_idx" ON "UsageRecord"("userId");
CREATE INDEX "UsageRecord_subscriptionId_idx" ON "UsageRecord"("subscriptionId");
CREATE INDEX "UsageRecord_action_idx" ON "UsageRecord"("action");
CREATE INDEX "UsageRecord_windowStart_idx" ON "UsageRecord"("windowStart");
CREATE INDEX "UsageRecord_windowEnd_idx" ON "UsageRecord"("windowEnd");
CREATE INDEX "BillingEvent_userId_idx" ON "BillingEvent"("userId");
CREATE INDEX "BillingEvent_subscriptionId_idx" ON "BillingEvent"("subscriptionId");
CREATE INDEX "BillingEvent_type_idx" ON "BillingEvent"("type");
CREATE INDEX "BillingEvent_createdAt_idx" ON "BillingEvent"("createdAt");

ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "License" ADD CONSTRAINT "License_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "License" ADD CONSTRAINT "License_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SubscriptionPlan" ("id", "code", "name", "description", "priceCents", "currency", "analysisQuota", "quotaWindowHours", "billingCycle", "multiUser", "teamManagement", "ownerConfigurable", "active", "updatedAt")
VALUES
  ('plan_free_default', 'FREE', 'Free', 'Free ECG Insight plan with 5 analyses every 24 hours.', 0, 'USD', 5, 24, 'DAILY', false, false, true, true, CURRENT_TIMESTAMP),
  ('plan_basic_default', 'BASIC', 'Basic', 'Basic commercial plan with 100 ECG analyses per month.', 1900, 'USD', 100, 720, 'MONTHLY', false, false, true, true, CURRENT_TIMESTAMP),
  ('plan_professional_default', 'PROFESSIONAL', 'Professional', 'Professional plan with 500 ECG analyses per month.', 4900, 'USD', 500, 720, 'MONTHLY', false, false, true, true, CURRENT_TIMESTAMP),
  ('plan_unlimited_default', 'UNLIMITED', 'Unlimited', 'Unlimited ECG analyses for high-volume clinicians.', 9900, 'USD', NULL, 720, 'MONTHLY', false, false, true, true, CURRENT_TIMESTAMP),
  ('plan_lifetime_default', 'LIFETIME', 'Lifetime', 'Owner-granted permanent unlimited access.', 0, 'USD', NULL, NULL, 'LIFETIME', false, false, false, true, CURRENT_TIMESTAMP),
  ('plan_enterprise_default', 'ENTERPRISE', 'Enterprise', 'Unlimited ECG analyses with multi-user team management.', 19900, 'USD', NULL, 720, 'MONTHLY', true, true, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
