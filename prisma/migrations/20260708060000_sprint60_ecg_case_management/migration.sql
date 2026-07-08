-- Sprint 60: Enterprise ECG Case Management Engine

DO $$ BEGIN
  CREATE TYPE "CaseManagementStatus" AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'REVIEWED',
    'CONFIRMED',
    'SIGNED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CaseHistoryEventType" AS ENUM (
    'CREATED',
    'UPDATED',
    'STATUS_CHANGED',
    'MANAGEMENT_STATUS_CHANGED',
    'ASSIGNED',
    'REVIEWER_ASSIGNED',
    'COMMENT_ADDED',
    'ATTACHMENT_ADDED',
    'VERSION_CREATED',
    'VERSION_RESTORED',
    'LOCKED',
    'UNLOCKED',
    'ARCHIVED',
    'RESTORED',
    'DUPLICATE_DETECTED',
    'PRIORITY_CHANGED',
    'TAG_ADDED',
    'CLINICAL_NOTE_ADDED',
    'DELETED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CaseAttachmentCategory" AS ENUM (
    'ECG_IMAGE',
    'PDF',
    'CLINICAL_DOCUMENT',
    'REPORT',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "managementStatus" "CaseManagementStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "reviewerId" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "duplicateOfCaseId" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "restoredAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ECGCase_managementStatus_idx" ON "ECGCase"("managementStatus");
CREATE INDEX IF NOT EXISTS "ECGCase_reviewerId_idx" ON "ECGCase"("reviewerId");
CREATE INDEX IF NOT EXISTS "ECGCase_archivedAt_idx" ON "ECGCase"("archivedAt");
CREATE INDEX IF NOT EXISTS "ECGCase_duplicateOfCaseId_idx" ON "ECGCase"("duplicateOfCaseId");

DO $$ BEGIN
  ALTER TABLE "ECGCase" ADD CONSTRAINT "ECGCase_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ECGCase" ADD CONSTRAINT "ECGCase_duplicateOfCaseId_fkey"
    FOREIGN KEY ("duplicateOfCaseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CaseHistory" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "actorId" TEXT,
  "eventType" "CaseHistoryEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "payload" JSONB,
  "fromStatus" "CaseManagementStatus",
  "toStatus" "CaseManagementStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CaseComment" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "parentId" TEXT,
  "body" TEXT NOT NULL,
  "mentions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isClinical" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CaseAttachment" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "sizeBytes" INTEGER,
  "category" "CaseAttachmentCategory" NOT NULL DEFAULT 'OTHER',
  "checksum" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CaseAudit" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL DEFAULT 'Case',
  "entityId" TEXT,
  "message" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CaseHistory_caseId_idx" ON "CaseHistory"("caseId");
CREATE INDEX IF NOT EXISTS "CaseHistory_actorId_idx" ON "CaseHistory"("actorId");
CREATE INDEX IF NOT EXISTS "CaseHistory_eventType_idx" ON "CaseHistory"("eventType");
CREATE INDEX IF NOT EXISTS "CaseHistory_createdAt_idx" ON "CaseHistory"("createdAt");

CREATE INDEX IF NOT EXISTS "CaseComment_caseId_idx" ON "CaseComment"("caseId");
CREATE INDEX IF NOT EXISTS "CaseComment_authorId_idx" ON "CaseComment"("authorId");
CREATE INDEX IF NOT EXISTS "CaseComment_parentId_idx" ON "CaseComment"("parentId");
CREATE INDEX IF NOT EXISTS "CaseComment_isClinical_idx" ON "CaseComment"("isClinical");
CREATE INDEX IF NOT EXISTS "CaseComment_createdAt_idx" ON "CaseComment"("createdAt");

CREATE INDEX IF NOT EXISTS "CaseAttachment_caseId_idx" ON "CaseAttachment"("caseId");
CREATE INDEX IF NOT EXISTS "CaseAttachment_uploadedById_idx" ON "CaseAttachment"("uploadedById");
CREATE INDEX IF NOT EXISTS "CaseAttachment_category_idx" ON "CaseAttachment"("category");
CREATE INDEX IF NOT EXISTS "CaseAttachment_createdAt_idx" ON "CaseAttachment"("createdAt");

CREATE INDEX IF NOT EXISTS "CaseAudit_caseId_idx" ON "CaseAudit"("caseId");
CREATE INDEX IF NOT EXISTS "CaseAudit_actorId_idx" ON "CaseAudit"("actorId");
CREATE INDEX IF NOT EXISTS "CaseAudit_action_idx" ON "CaseAudit"("action");
CREATE INDEX IF NOT EXISTS "CaseAudit_entityType_idx" ON "CaseAudit"("entityType");
CREATE INDEX IF NOT EXISTS "CaseAudit_createdAt_idx" ON "CaseAudit"("createdAt");

DO $$ BEGIN
  ALTER TABLE "CaseHistory" ADD CONSTRAINT "CaseHistory_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseHistory" ADD CONSTRAINT "CaseHistory_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "CaseComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseAttachment" ADD CONSTRAINT "CaseAttachment_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseAttachment" ADD CONSTRAINT "CaseAttachment_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseAudit" ADD CONSTRAINT "CaseAudit_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseAudit" ADD CONSTRAINT "CaseAudit_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_MANAGEMENT_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_MANAGEMENT_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_MANAGEMENT_VERSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_MANAGEMENT_COMMENT_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_MANAGEMENT_ATTACHMENT_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_MANAGEMENT_LOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_MANAGEMENT_UNLOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_MANAGEMENT_DUPLICATE_DETECTED';

UPDATE "ECGCase"
SET "managementStatus" = CASE
  WHEN "status" = 'ARCHIVED' THEN 'ARCHIVED'::"CaseManagementStatus"
  WHEN "status" = 'SIGNED' THEN 'SIGNED'::"CaseManagementStatus"
  WHEN "status" IN ('APPROVED', 'FINALIZED') THEN 'CONFIRMED'::"CaseManagementStatus"
  WHEN "status" = 'REVIEWED' THEN 'REVIEWED'::"CaseManagementStatus"
  WHEN "status" IN ('UNDER_REVIEW', 'AWAITING_SECOND_OPINION', 'ESCALATED', 'AI_COMPLETED') THEN 'PENDING_REVIEW'::"CaseManagementStatus"
  ELSE 'DRAFT'::"CaseManagementStatus"
END
WHERE "managementStatus" = 'DRAFT';

UPDATE "ECGCase"
SET "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED' AND "archivedAt" IS NULL;
