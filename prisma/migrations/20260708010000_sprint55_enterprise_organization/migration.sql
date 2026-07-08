-- Sprint 55: Enterprise Organization & Multi-Tenant Platform

-- OrganizationType extensions
ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'MEDICAL_CENTER';
ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'OCCUPATIONAL_HEALTH_CENTER';
ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'INSURANCE_PROVIDER';
ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'UNIVERSITY';
ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'RESEARCH_CENTER';

-- AuditAction extensions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRANCH_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRANCH_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRANCH_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_INVITED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_ROLE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SETTINGS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BILLING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRANDING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_CHANGED';

-- New enums
CREATE TYPE "EnterpriseNotificationCategory" AS ENUM ('SYSTEM', 'SECURITY', 'CLINICAL', 'AI', 'BILLING', 'LICENSE', 'MAINTENANCE');
CREATE TYPE "EnterpriseRoleScope" AS ENUM ('PLATFORM', 'ORGANIZATION');
CREATE TYPE "DepartmentCategory" AS ENUM ('CARDIOLOGY', 'EMERGENCY', 'ICU', 'CCU', 'INTERNAL_MEDICINE', 'OCCUPATIONAL_MEDICINE', 'OUTPATIENT_CLINIC', 'ADMINISTRATION', 'CUSTOM');
CREATE TYPE "OrganizationMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED');

-- Organization extensions
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "brandColor" TEXT DEFAULT '#0F766E';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "taxNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "storageQuotaMb" INTEGER DEFAULT 10240;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "aiQuotaMonthly" INTEGER DEFAULT 100;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Organization_deletedAt_idx" ON "Organization"("deletedAt");
CREATE INDEX IF NOT EXISTS "Organization_country_city_idx" ON "Organization"("country", "city");

-- Department extensions
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "category" "DepartmentCategory" NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Department_category_idx" ON "Department"("category");
CREATE INDEX IF NOT EXISTS "Department_deletedAt_idx" ON "Department"("deletedAt");

-- OrganizationBranch
CREATE TABLE IF NOT EXISTS "OrganizationBranch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT,
  "gpsLatitude" DOUBLE PRECISION,
  "gpsLongitude" DOUBLE PRECISION,
  "managerUserId" TEXT,
  "departmentId" TEXT,
  "deviceCount" INTEGER NOT NULL DEFAULT 0,
  "doctorCount" INTEGER NOT NULL DEFAULT 0,
  "patientCount" INTEGER NOT NULL DEFAULT 0,
  "caseCount" INTEGER NOT NULL DEFAULT 0,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationBranch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationBranch_organizationId_name_key" ON "OrganizationBranch"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "OrganizationBranch_organizationId_idx" ON "OrganizationBranch"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationBranch_managerUserId_idx" ON "OrganizationBranch"("managerUserId");
CREATE INDEX IF NOT EXISTS "OrganizationBranch_status_idx" ON "OrganizationBranch"("status");
CREATE INDEX IF NOT EXISTS "OrganizationBranch_deletedAt_idx" ON "OrganizationBranch"("deletedAt");

ALTER TABLE "OrganizationBranch" ADD CONSTRAINT "OrganizationBranch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationBranch" ADD CONSTRAINT "OrganizationBranch_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationBranch" ADD CONSTRAINT "OrganizationBranch_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- OrganizationSubscription
CREATE TABLE IF NOT EXISTS "OrganizationSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "storageLimitMb" INTEGER NOT NULL DEFAULT 10240,
  "aiCreditsMonthly" INTEGER NOT NULL DEFAULT 100,
  "ecgAnalysisLimit" INTEGER NOT NULL DEFAULT 500,
  "teamLimit" INTEGER NOT NULL DEFAULT 10,
  "featureFlags" JSONB,
  "licenseExpiresAt" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationSubscription_organizationId_key" ON "OrganizationSubscription"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationSubscription_tier_idx" ON "OrganizationSubscription"("tier");
CREATE INDEX IF NOT EXISTS "OrganizationSubscription_status_idx" ON "OrganizationSubscription"("status");
CREATE INDEX IF NOT EXISTS "OrganizationSubscription_licenseExpiresAt_idx" ON "OrganizationSubscription"("licenseExpiresAt");

ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrganizationBranding
CREATE TABLE IF NOT EXISTS "OrganizationBranding" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "logoUrl" TEXT,
  "primaryColor" TEXT DEFAULT '#0F766E',
  "secondaryColor" TEXT DEFAULT '#134E4A',
  "faviconUrl" TEXT,
  "pdfHeaderHtml" TEXT,
  "pdfFooterHtml" TEXT,
  "emailBranding" JSONB,
  "loginBranding" JSONB,
  "reportHeader" TEXT,
  "reportFooter" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationBranding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationBranding_organizationId_key" ON "OrganizationBranding"("organizationId");
ALTER TABLE "OrganizationBranding" ADD CONSTRAINT "OrganizationBranding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnterpriseRole
CREATE TABLE IF NOT EXISTS "EnterpriseRole" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "scope" "EnterpriseRoleScope" NOT NULL DEFAULT 'ORGANIZATION',
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "permissions" JSONB NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseRole_organizationId_slug_key" ON "EnterpriseRole"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "EnterpriseRole_organizationId_idx" ON "EnterpriseRole"("organizationId");
CREATE INDEX IF NOT EXISTS "EnterpriseRole_scope_idx" ON "EnterpriseRole"("scope");
CREATE INDEX IF NOT EXISTS "EnterpriseRole_isSystem_idx" ON "EnterpriseRole"("isSystem");

ALTER TABLE "EnterpriseRole" ADD CONSTRAINT "EnterpriseRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrganizationMember
CREATE TABLE IF NOT EXISTS "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enterpriseRoleId" TEXT,
  "departmentId" TEXT,
  "branchId" TEXT,
  "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "invitedAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_enterpriseRoleId_idx" ON "OrganizationMember"("enterpriseRoleId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_status_idx" ON "OrganizationMember"("status");
CREATE INDEX IF NOT EXISTS "OrganizationMember_deletedAt_idx" ON "OrganizationMember"("deletedAt");

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_enterpriseRoleId_fkey" FOREIGN KEY ("enterpriseRoleId") REFERENCES "EnterpriseRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- LoginHistory
CREATE TABLE IF NOT EXISTS "LoginHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "deviceId" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoginHistory_userId_idx" ON "LoginHistory"("userId");
CREATE INDEX IF NOT EXISTS "LoginHistory_organizationId_idx" ON "LoginHistory"("organizationId");
CREATE INDEX IF NOT EXISTS "LoginHistory_success_idx" ON "LoginHistory"("success");
CREATE INDEX IF NOT EXISTS "LoginHistory_createdAt_idx" ON "LoginHistory"("createdAt");

ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- OrganizationNotification
CREATE TABLE IF NOT EXISTS "OrganizationNotification" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "category" "EnterpriseNotificationCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrganizationNotification_organizationId_idx" ON "OrganizationNotification"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationNotification_userId_idx" ON "OrganizationNotification"("userId");
CREATE INDEX IF NOT EXISTS "OrganizationNotification_category_idx" ON "OrganizationNotification"("category");
CREATE INDEX IF NOT EXISTS "OrganizationNotification_read_idx" ON "OrganizationNotification"("read");
CREATE INDEX IF NOT EXISTS "OrganizationNotification_createdAt_idx" ON "OrganizationNotification"("createdAt");

ALTER TABLE "OrganizationNotification" ADD CONSTRAINT "OrganizationNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationNotification" ADD CONSTRAINT "OrganizationNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
