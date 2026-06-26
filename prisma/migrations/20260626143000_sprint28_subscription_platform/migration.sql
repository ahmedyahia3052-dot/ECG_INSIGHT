ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'CLINIC';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'HOSPITAL';

ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRED';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'TRIAL_ENDING';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_REQUIRED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'IMPERSONATION_STARTED';

ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxUsers" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxOrganizations" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "storageQuotaMb" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "aiFeatureAccess" JSONB;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "gracePeriodDays" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "UserSubscription" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "UserSubscription" ADD COLUMN "graceEndsAt" TIMESTAMP(3);
ALTER TABLE "UserSubscription" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "UserSubscription" ADD COLUMN "manuallyActivatedById" TEXT;

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "planId" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "lineItems" JSONB NOT NULL,
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageTracking" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "metric" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "quota" INTEGER,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "exceeded" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageTracking_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment" ADD COLUMN "invoiceId" TEXT;

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");
CREATE INDEX "Invoice_planId_idx" ON "Invoice"("planId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");
CREATE INDEX "Invoice_dueAt_idx" ON "Invoice"("dueAt");
CREATE UNIQUE INDEX "UsageTracking_userId_metric_windowStart_windowEnd_key" ON "UsageTracking"("userId", "metric", "windowStart", "windowEnd");
CREATE INDEX "UsageTracking_userId_idx" ON "UsageTracking"("userId");
CREATE INDEX "UsageTracking_subscriptionId_idx" ON "UsageTracking"("subscriptionId");
CREATE INDEX "UsageTracking_metric_idx" ON "UsageTracking"("metric");
CREATE INDEX "UsageTracking_exceeded_idx" ON "UsageTracking"("exceeded");
CREATE INDEX "UsageTracking_windowStart_idx" ON "UsageTracking"("windowStart");
CREATE INDEX "UsageTracking_windowEnd_idx" ON "UsageTracking"("windowEnd");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "UserSubscription_trialEndsAt_idx" ON "UserSubscription"("trialEndsAt");
CREATE INDEX "UserSubscription_graceEndsAt_idx" ON "UserSubscription"("graceEndsAt");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageTracking" ADD CONSTRAINT "UsageTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageTracking" ADD CONSTRAINT "UsageTracking_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
