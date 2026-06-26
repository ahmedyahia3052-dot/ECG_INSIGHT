-- Sprint 36: enterprise security, compliance, and hardening platform

ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'REQUEST_SIGNATURE_FAILED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'CSRF_VALIDATION_FAILED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'PASSWORD_POLICY_VIOLATION';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'PHI_ACCESS_ANOMALY';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'KEY_ROTATION_COMPLETED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FAILED_LOGIN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_EDITED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DATA_EXPORTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DATA_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MFA_RECOVERY_CODE_USED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TRUSTED_DEVICE_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SESSION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SECURITY_POLICY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PHI_FIELD_ENCRYPTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEY_ROTATED';

DO $$ BEGIN
  CREATE TYPE "SecurityPolicyType" AS ENUM ('PASSWORD', 'SESSION', 'RATE_LIMIT', 'DATA_RETENTION', 'DEVICE_TRUST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EncryptionKeyStatus" AS ENUM ('ACTIVE', 'ROTATING', 'RETIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TrustedDevice" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
ALTER TABLE "TrustedDevice" ADD COLUMN IF NOT EXISTS "revokedById" TEXT;

CREATE TABLE IF NOT EXISTS "MFARecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mfaMethodId" TEXT,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "MFARecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MFARecoveryCode_userId_idx" ON "MFARecoveryCode"("userId");
CREATE INDEX IF NOT EXISTS "MFARecoveryCode_mfaMethodId_idx" ON "MFARecoveryCode"("mfaMethodId");
CREATE INDEX IF NOT EXISTS "MFARecoveryCode_usedAt_idx" ON "MFARecoveryCode"("usedAt");

DO $$ BEGIN
  ALTER TABLE "MFARecoveryCode" ADD CONSTRAINT "MFARecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MFARecoveryCode" ADD CONSTRAINT "MFARecoveryCode_mfaMethodId_fkey" FOREIGN KEY ("mfaMethodId") REFERENCES "UserMFA"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SecurityPolicy" (
  "id" TEXT NOT NULL,
  "policyType" "SecurityPolicyType" NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "organizationId" TEXT,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityPolicy_policyType_idx" ON "SecurityPolicy"("policyType");
CREATE INDEX IF NOT EXISTS "SecurityPolicy_enabled_idx" ON "SecurityPolicy"("enabled");
CREATE INDEX IF NOT EXISTS "SecurityPolicy_organizationId_idx" ON "SecurityPolicy"("organizationId");

DO $$ BEGIN
  ALTER TABLE "SecurityPolicy" ADD CONSTRAINT "SecurityPolicy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SecurityPolicy" ADD CONSTRAINT "SecurityPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PHIEncryptionRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "keyVersion" INTEGER NOT NULL,
  "encryptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotatedAt" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "PHIEncryptionRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PHIEncryptionRecord_entityType_entityId_fieldName_key" ON "PHIEncryptionRecord"("entityType", "entityId", "fieldName");
CREATE INDEX IF NOT EXISTS "PHIEncryptionRecord_organizationId_idx" ON "PHIEncryptionRecord"("organizationId");
CREATE INDEX IF NOT EXISTS "PHIEncryptionRecord_entityType_idx" ON "PHIEncryptionRecord"("entityType");
CREATE INDEX IF NOT EXISTS "PHIEncryptionRecord_keyVersion_idx" ON "PHIEncryptionRecord"("keyVersion");

DO $$ BEGIN
  ALTER TABLE "PHIEncryptionRecord" ADD CONSTRAINT "PHIEncryptionRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "KeyRotationEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "keyVersion" INTEGER NOT NULL,
  "status" "EncryptionKeyStatus" NOT NULL DEFAULT 'ACTIVE',
  "rotatedById" TEXT NOT NULL,
  "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousVersion" INTEGER,
  "metadata" JSONB,
  CONSTRAINT "KeyRotationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "KeyRotationEvent_organizationId_idx" ON "KeyRotationEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "KeyRotationEvent_keyVersion_idx" ON "KeyRotationEvent"("keyVersion");
CREATE INDEX IF NOT EXISTS "KeyRotationEvent_status_idx" ON "KeyRotationEvent"("status");
CREATE INDEX IF NOT EXISTS "KeyRotationEvent_rotatedAt_idx" ON "KeyRotationEvent"("rotatedAt");

DO $$ BEGIN
  ALTER TABLE "KeyRotationEvent" ADD CONSTRAINT "KeyRotationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "KeyRotationEvent" ADD CONSTRAINT "KeyRotationEvent_rotatedById_fkey" FOREIGN KEY ("rotatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
