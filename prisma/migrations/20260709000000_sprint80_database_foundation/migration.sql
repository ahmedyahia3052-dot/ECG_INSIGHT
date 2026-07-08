-- Sprint 80 — Database foundation: normalized audit fields, soft delete, UUID record identifiers.
-- Safe additive migration — no column drops, no data loss.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Patient
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "recordUuid" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
UPDATE "Patient" SET "recordUuid" = gen_random_uuid()::text WHERE "recordUuid" IS NULL;
ALTER TABLE "Patient" ALTER COLUMN "recordUuid" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_recordUuid_key" ON "Patient"("recordUuid");
CREATE INDEX IF NOT EXISTS "Patient_deletedAt_idx" ON "Patient"("deletedAt");
CREATE INDEX IF NOT EXISTS "Patient_updatedById_idx" ON "Patient"("updatedById");
CREATE INDEX IF NOT EXISTS "Patient_recordUuid_idx" ON "Patient"("recordUuid");

-- Null orphaned audit references before adding FK constraints (Sprint 91 stabilization).
UPDATE "Patient" SET "createdById" = NULL
WHERE "createdById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "Patient"."createdById");
UPDATE "Patient" SET "updatedById" = NULL
WHERE "updatedById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "Patient"."updatedById");

DO $$ BEGIN
  ALTER TABLE "Patient" ADD CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Patient" ADD CONSTRAINT "Patient_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "recordUuid" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
UPDATE "Organization" SET "recordUuid" = gen_random_uuid()::text WHERE "recordUuid" IS NULL;
ALTER TABLE "Organization" ALTER COLUMN "recordUuid" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_recordUuid_key" ON "Organization"("recordUuid");
CREATE INDEX IF NOT EXISTS "Organization_createdById_idx" ON "Organization"("createdById");
CREATE INDEX IF NOT EXISTS "Organization_updatedById_idx" ON "Organization"("updatedById");
CREATE INDEX IF NOT EXISTS "Organization_recordUuid_idx" ON "Organization"("recordUuid");

UPDATE "Organization" SET "createdById" = NULL
WHERE "createdById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "Organization"."createdById");
UPDATE "Organization" SET "updatedById" = NULL
WHERE "updatedById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "Organization"."updatedById");

DO $$ BEGIN
  ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Organization" ADD CONSTRAINT "Organization_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Department
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "recordUuid" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Department" SET "recordUuid" = gen_random_uuid()::text WHERE "recordUuid" IS NULL;
ALTER TABLE "Department" ALTER COLUMN "recordUuid" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Department_recordUuid_key" ON "Department"("recordUuid");
CREATE INDEX IF NOT EXISTS "Department_createdById_idx" ON "Department"("createdById");
CREATE INDEX IF NOT EXISTS "Department_updatedById_idx" ON "Department"("updatedById");
CREATE INDEX IF NOT EXISTS "Department_recordUuid_idx" ON "Department"("recordUuid");

UPDATE "Department" SET "createdById" = NULL
WHERE "createdById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "Department"."createdById");
UPDATE "Department" SET "updatedById" = NULL
WHERE "updatedById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "Department"."updatedById");

DO $$ BEGIN
  ALTER TABLE "Department" ADD CONSTRAINT "Department_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Department" ADD CONSTRAINT "Department_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ECGCase
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "recordUuid" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
UPDATE "ECGCase" SET "recordUuid" = gen_random_uuid()::text WHERE "recordUuid" IS NULL;
UPDATE "ECGCase" SET "createdById" = "uploadedById" WHERE "createdById" IS NULL;
ALTER TABLE "ECGCase" ALTER COLUMN "recordUuid" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ECGCase_recordUuid_key" ON "ECGCase"("recordUuid");
CREATE INDEX IF NOT EXISTS "ECGCase_deletedAt_idx" ON "ECGCase"("deletedAt");
CREATE INDEX IF NOT EXISTS "ECGCase_createdById_idx" ON "ECGCase"("createdById");
CREATE INDEX IF NOT EXISTS "ECGCase_updatedById_idx" ON "ECGCase"("updatedById");
CREATE INDEX IF NOT EXISTS "ECGCase_recordUuid_idx" ON "ECGCase"("recordUuid");

UPDATE "ECGCase" SET "createdById" = NULL
WHERE "createdById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "ECGCase"."createdById");
UPDATE "ECGCase" SET "updatedById" = NULL
WHERE "updatedById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "ECGCase"."updatedById");

DO $$ BEGIN
  ALTER TABLE "ECGCase" ADD CONSTRAINT "ECGCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ECGCase" ADD CONSTRAINT "ECGCase_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ClinicalDocument
ALTER TABLE "ClinicalDocument" ADD COLUMN IF NOT EXISTS "recordUuid" TEXT;
ALTER TABLE "ClinicalDocument" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "ClinicalDocument" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ClinicalDocument" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "ClinicalDocument" SET "recordUuid" = gen_random_uuid()::text WHERE "recordUuid" IS NULL;
ALTER TABLE "ClinicalDocument" ALTER COLUMN "recordUuid" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalDocument_recordUuid_key" ON "ClinicalDocument"("recordUuid");
CREATE INDEX IF NOT EXISTS "ClinicalDocument_deletedAt_idx" ON "ClinicalDocument"("deletedAt");
CREATE INDEX IF NOT EXISTS "ClinicalDocument_uploadedById_idx" ON "ClinicalDocument"("uploadedById");
CREATE INDEX IF NOT EXISTS "ClinicalDocument_updatedById_idx" ON "ClinicalDocument"("updatedById");
CREATE INDEX IF NOT EXISTS "ClinicalDocument_recordUuid_idx" ON "ClinicalDocument"("recordUuid");

UPDATE "ClinicalDocument" SET "uploadedById" = NULL
WHERE "uploadedById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "ClinicalDocument"."uploadedById");
UPDATE "ClinicalDocument" SET "updatedById" = NULL
WHERE "updatedById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = "ClinicalDocument"."updatedById");

DO $$ BEGIN
  ALTER TABLE "ClinicalDocument" ADD CONSTRAINT "ClinicalDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClinicalDocument" ADD CONSTRAINT "ClinicalDocument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ClinicalReport
ALTER TABLE "ClinicalReport" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ClinicalReport_deletedAt_idx" ON "ClinicalReport"("deletedAt");

-- AIAnalysis
ALTER TABLE "AIAnalysis" ADD COLUMN IF NOT EXISTS "recordUuid" TEXT;
ALTER TABLE "AIAnalysis" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "AIAnalysis" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "AIAnalysis" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "AIAnalysis" SET "recordUuid" = gen_random_uuid()::text WHERE "recordUuid" IS NULL;
ALTER TABLE "AIAnalysis" ALTER COLUMN "recordUuid" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "AIAnalysis_recordUuid_key" ON "AIAnalysis"("recordUuid");
CREATE INDEX IF NOT EXISTS "AIAnalysis_deletedAt_idx" ON "AIAnalysis"("deletedAt");
CREATE INDEX IF NOT EXISTS "AIAnalysis_createdById_idx" ON "AIAnalysis"("createdById");
CREATE INDEX IF NOT EXISTS "AIAnalysis_recordUuid_idx" ON "AIAnalysis"("recordUuid");

DO $$ BEGIN
  ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Notification_deletedAt_idx" ON "Notification"("deletedAt");
