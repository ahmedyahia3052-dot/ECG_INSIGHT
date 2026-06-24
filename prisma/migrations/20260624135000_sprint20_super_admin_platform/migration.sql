CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isLifetime" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lifetimeGrantedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lifetimeGrantedBy" TEXT;

ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "features" JSONB;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "monthlyQuota" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
UPDATE "SubscriptionPlan" SET "monthlyQuota" = "analysisQuota" WHERE "monthlyQuota" IS NULL AND "analysisQuota" IS NOT NULL;
UPDATE "SubscriptionPlan" SET "isActive" = "active" WHERE "isActive" IS DISTINCT FROM "active";

CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "paymentMethod" TEXT NOT NULL,
  "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "referenceNumber" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GiftLicense" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "giftedById" TEXT NOT NULL,
  "giftedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "GiftLicense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentTransaction_userId_idx" ON "PaymentTransaction"("userId");
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
CREATE INDEX "PaymentTransaction_paymentMethod_idx" ON "PaymentTransaction"("paymentMethod");
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");
CREATE INDEX "GiftLicense_userId_idx" ON "GiftLicense"("userId");
CREATE INDEX "GiftLicense_giftedById_idx" ON "GiftLicense"("giftedById");
CREATE INDEX "GiftLicense_giftedAt_idx" ON "GiftLicense"("giftedAt");
CREATE INDEX "GiftLicense_expiresAt_idx" ON "GiftLicense"("expiresAt");

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftLicense" ADD CONSTRAINT "GiftLicense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftLicense" ADD CONSTRAINT "GiftLicense_giftedById_fkey" FOREIGN KEY ("giftedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
