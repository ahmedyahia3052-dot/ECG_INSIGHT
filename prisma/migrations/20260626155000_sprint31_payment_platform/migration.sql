-- Sprint 31 Enterprise Payment & Financial Platform

ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_RENEWED';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'INVOICE_GENERATED';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'REFUND_PROCESSED';

CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REMOVED', 'BLOCKED');
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'REFUNDED', 'FAILED');
CREATE TYPE "FinancialAuditAction" AS ENUM (
  'CHECKOUT_CREATED',
  'WEBHOOK_RECEIVED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'PAYMENT_RETRIED',
  'REFUND_REQUESTED',
  'REFUND_APPROVED',
  'REFUND_REJECTED',
  'MANUAL_PAYMENT_APPROVED',
  'SUBSCRIPTION_RENEWED',
  'SUBSCRIPTION_CHANGED',
  'SUBSCRIPTION_CANCELED',
  'FRAUD_REVIEW_FLAGGED'
);

ALTER TABLE "Payment"
  ADD COLUMN "paymentMethodId" TEXT,
  ADD COLUMN "checkoutSessionId" TEXT,
  ADD COLUMN "gatewayReference" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "fraudScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3);

ALTER TABLE "PaymentTransaction"
  ADD COLUMN "paymentId" TEXT,
  ADD COLUMN "invoiceId" TEXT,
  ADD COLUMN "subscriptionId" TEXT,
  ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'CARD',
  ADD COLUMN "gatewayEventId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "providerPayload" JSONB,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "PaymentMethod" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fingerprint" TEXT,
  "last4" TEXT,
  "expMonth" INTEGER,
  "expYear" INTEGER,
  "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "providerToken" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "reason" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerRefundId" TEXT,
  "requestedById" TEXT,
  "processedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "userId" TEXT,
  "action" "FinancialAuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "amountCents" INTEGER,
  "currency" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentIdempotencyKey" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseJson" JSONB,
  "statusCode" INTEGER,
  "userId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentIdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_paymentMethodId_idx" ON "Payment"("paymentMethodId");
CREATE INDEX "Payment_idempotencyKey_idx" ON "Payment"("idempotencyKey");

CREATE INDEX "PaymentTransaction_paymentId_idx" ON "PaymentTransaction"("paymentId");
CREATE INDEX "PaymentTransaction_invoiceId_idx" ON "PaymentTransaction"("invoiceId");
CREATE INDEX "PaymentTransaction_subscriptionId_idx" ON "PaymentTransaction"("subscriptionId");
CREATE INDEX "PaymentTransaction_provider_idx" ON "PaymentTransaction"("provider");
CREATE INDEX "PaymentTransaction_idempotencyKey_idx" ON "PaymentTransaction"("idempotencyKey");

CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");
CREATE INDEX "PaymentMethod_provider_idx" ON "PaymentMethod"("provider");
CREATE INDEX "PaymentMethod_status_idx" ON "PaymentMethod"("status");
CREATE INDEX "PaymentMethod_isDefault_idx" ON "PaymentMethod"("isDefault");
CREATE UNIQUE INDEX "PaymentMethod_userId_fingerprint_key" ON "PaymentMethod"("userId", "fingerprint");

CREATE INDEX "Refund_userId_idx" ON "Refund"("userId");
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE INDEX "Refund_invoiceId_idx" ON "Refund"("invoiceId");
CREATE INDEX "Refund_status_idx" ON "Refund"("status");
CREATE INDEX "Refund_processedById_idx" ON "Refund"("processedById");
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt");

CREATE INDEX "FinancialAuditLog_actorId_idx" ON "FinancialAuditLog"("actorId");
CREATE INDEX "FinancialAuditLog_userId_idx" ON "FinancialAuditLog"("userId");
CREATE INDEX "FinancialAuditLog_action_idx" ON "FinancialAuditLog"("action");
CREATE INDEX "FinancialAuditLog_entityType_idx" ON "FinancialAuditLog"("entityType");
CREATE INDEX "FinancialAuditLog_entityId_idx" ON "FinancialAuditLog"("entityId");
CREATE INDEX "FinancialAuditLog_createdAt_idx" ON "FinancialAuditLog"("createdAt");

CREATE UNIQUE INDEX "PaymentIdempotencyKey_key_route_key" ON "PaymentIdempotencyKey"("key", "route");
CREATE INDEX "PaymentIdempotencyKey_userId_idx" ON "PaymentIdempotencyKey"("userId");
CREATE INDEX "PaymentIdempotencyKey_expiresAt_idx" ON "PaymentIdempotencyKey"("expiresAt");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentTransaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentMethod"
  ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Refund_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialAuditLog"
  ADD CONSTRAINT "FinancialAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentIdempotencyKey"
  ADD CONSTRAINT "PaymentIdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
