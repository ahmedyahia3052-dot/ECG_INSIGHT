CREATE TYPE "MFAType" AS ENUM ('EMAIL_OTP', 'TOTP');
CREATE TYPE "SecurityEventType" AS ENUM ('MULTIPLE_FAILED_LOGINS', 'PRIVILEGE_ESCALATION', 'SUSPICIOUS_ACCESS', 'BRUTE_FORCE_ATTEMPT', 'UNUSUAL_IP_ACCESS', 'DEVICE_REVOKED');
CREATE TYPE "SecurityEventSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SecurityEventStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED');
CREATE TYPE "ConsentType" AS ENUM ('TREATMENT', 'DATA_PROCESSING', 'OCCUPATIONAL_HEALTH', 'RESEARCH', 'DATA_SHARING');
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'ERASURE', 'ACCESS', 'RECTIFICATION');
CREATE TYPE "DataRequestStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
CREATE TYPE "BackupJobStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'RESTORED');

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'SECURITY_EVENT_CREATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'COMPLIANCE_REQUEST_CREATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'BACKUP_JOB_CREATED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PATIENT_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_DOWNLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SECURITY_EVENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMPLIANCE_REQUEST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BACKUP_JOB_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PERMISSION_CHANGED';

ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "forcePasswordReset" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "entityType" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "entityId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "oldValue" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "newValue" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "deviceFingerprint" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserMFA" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "MFAType" NOT NULL,
  "secretHash" TEXT,
  "emailOtpHash" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserMFA_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrustedDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceName" TEXT NOT NULL,
  "deviceFingerprint" TEXT NOT NULL,
  "ipAddress" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trusted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
  "id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientConsent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT NOT NULL,
  "consentType" "ConsentType" NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataRequest" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT NOT NULL,
  "requestType" "DataRequestType" NOT NULL,
  "status" "DataRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "responseJson" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "organizationId" TEXT,
  "eventType" "SecurityEventType" NOT NULL,
  "severity" "SecurityEventSeverity" NOT NULL,
  "status" "SecurityEventStatus" NOT NULL DEFAULT 'OPEN',
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackupJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT NOT NULL,
  "status" "BackupJobStatus" NOT NULL DEFAULT 'SCHEDULED',
  "backupType" TEXT NOT NULL,
  "retentionDays" INTEGER NOT NULL DEFAULT 30,
  "storageLocation" TEXT,
  "checksum" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackupJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_sessionId_idx" ON "UserSession"("sessionId");
CREATE INDEX "UserSession_active_idx" ON "UserSession"("active");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE INDEX "UserMFA_userId_idx" ON "UserMFA"("userId");
CREATE INDEX "UserMFA_type_idx" ON "UserMFA"("type");
CREATE INDEX "UserMFA_enabled_idx" ON "UserMFA"("enabled");
CREATE INDEX "PasswordHistory_userId_idx" ON "PasswordHistory"("userId");
CREATE INDEX "PasswordHistory_createdAt_idx" ON "PasswordHistory"("createdAt");
CREATE UNIQUE INDEX "TrustedDevice_userId_deviceFingerprint_key" ON "TrustedDevice"("userId", "deviceFingerprint");
CREATE INDEX "TrustedDevice_userId_idx" ON "TrustedDevice"("userId");
CREATE INDEX "TrustedDevice_trusted_idx" ON "TrustedDevice"("trusted");
CREATE INDEX "TrustedDevice_lastSeenAt_idx" ON "TrustedDevice"("lastSeenAt");
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE INDEX "Permission_key_idx" ON "Permission"("key");
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
CREATE INDEX "PatientConsent_patientId_idx" ON "PatientConsent"("patientId");
CREATE INDEX "PatientConsent_organizationId_idx" ON "PatientConsent"("organizationId");
CREATE INDEX "PatientConsent_consentType_idx" ON "PatientConsent"("consentType");
CREATE INDEX "PatientConsent_granted_idx" ON "PatientConsent"("granted");
CREATE INDEX "DataRequest_patientId_idx" ON "DataRequest"("patientId");
CREATE INDEX "DataRequest_organizationId_idx" ON "DataRequest"("organizationId");
CREATE INDEX "DataRequest_requestType_idx" ON "DataRequest"("requestType");
CREATE INDEX "DataRequest_status_idx" ON "DataRequest"("status");
CREATE INDEX "SecurityEvent_userId_idx" ON "SecurityEvent"("userId");
CREATE INDEX "SecurityEvent_organizationId_idx" ON "SecurityEvent"("organizationId");
CREATE INDEX "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");
CREATE INDEX "SecurityEvent_status_idx" ON "SecurityEvent"("status");
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");
CREATE INDEX "BackupJob_organizationId_idx" ON "BackupJob"("organizationId");
CREATE INDEX "BackupJob_userId_idx" ON "BackupJob"("userId");
CREATE INDEX "BackupJob_status_idx" ON "BackupJob"("status");
CREATE INDEX "BackupJob_createdAt_idx" ON "BackupJob"("createdAt");

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMFA" ADD CONSTRAINT "UserMFA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordHistory" ADD CONSTRAINT "PasswordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BackupJob" ADD CONSTRAINT "BackupJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BackupJob" ADD CONSTRAINT "BackupJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
