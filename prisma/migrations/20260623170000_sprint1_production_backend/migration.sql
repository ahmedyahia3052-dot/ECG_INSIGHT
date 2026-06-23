CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STUDENT');
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'CRITICAL');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'STUDENT',
  "specialization" TEXT,
  "institution" TEXT,
  "avatarInitials" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerificationTokenHash" TEXT,
  "emailVerificationExpiresAt" TIMESTAMP(3),
  "passwordResetTokenHash" TEXT,
  "passwordResetExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "rememberMe" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedById" TEXT,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "targetRole" "Role",
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE INDEX "Subscription_tier_idx" ON "Subscription"("tier");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_targetRole_idx" ON "Notification"("targetRole");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
