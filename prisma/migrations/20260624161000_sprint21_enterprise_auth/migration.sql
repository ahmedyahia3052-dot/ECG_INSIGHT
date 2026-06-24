ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CORPORATE_CLIENT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER';

CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'APPLE', 'MICROSOFT');
CREATE TYPE "PhoneOtpPurpose" AS ENUM ('LOGIN', 'REGISTER');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "deviceName" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNumber_key" ON "User"("phoneNumber");

CREATE TABLE "OAuthIdentity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "OAuthProvider" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OAuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhoneOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "phoneNumber" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "purpose" "PhoneOtpPurpose" NOT NULL DEFAULT 'LOGIN',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthIdentity_provider_providerUserId_key" ON "OAuthIdentity"("provider", "providerUserId");
CREATE INDEX "OAuthIdentity_userId_idx" ON "OAuthIdentity"("userId");
CREATE INDEX "OAuthIdentity_provider_idx" ON "OAuthIdentity"("provider");
CREATE INDEX "PhoneOtp_userId_idx" ON "PhoneOtp"("userId");
CREATE INDEX "PhoneOtp_phoneNumber_idx" ON "PhoneOtp"("phoneNumber");
CREATE INDEX "PhoneOtp_expiresAt_idx" ON "PhoneOtp"("expiresAt");

ALTER TABLE "OAuthIdentity" ADD CONSTRAINT "OAuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhoneOtp" ADD CONSTRAINT "PhoneOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
