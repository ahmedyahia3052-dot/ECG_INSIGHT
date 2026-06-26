-- Sprint 33 Enterprise Real-Time Collaboration Platform

ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'AWAITING_SECOND_OPINION';
ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'SIGNED';
ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COLLABORATION_NOTE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COLLABORATION_NOTE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COLLABORATION_MESSAGE_SENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COLLABORATION_ASSIGNMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COLLABORATION_LOCK_ACQUIRED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COLLABORATION_LOCK_RELEASED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COLLABORATION_VERSION_RESTORED';

CREATE TYPE "CollaborationPresenceStatus" AS ENUM ('ONLINE', 'IDLE', 'OFFLINE');
CREATE TYPE "CollaborationActivityType" AS ENUM (
  'ECG_UPLOADED',
  'AI_ANALYSIS_COMPLETED',
  'REPORT_EDITED',
  'REPORT_SIGNED',
  'COMMENT_ADDED',
  'CASE_REASSIGNED',
  'STATUS_CHANGED',
  'FINAL_APPROVAL',
  'NOTE_ADDED',
  'LOCK_ACQUIRED',
  'LOCK_RELEASED',
  'VERSION_RESTORED'
);
CREATE TYPE "CollaborationAssignmentType" AS ENUM ('PRIMARY_REVIEW', 'REASSIGNMENT', 'ESCALATION', 'MULTI_REVIEW', 'SECOND_OPINION');
CREATE TYPE "CollaborationAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED', 'ESCALATED');
CREATE TYPE "CollaborationLockStatus" AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED');

CREATE TABLE "CasePresence" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "CollaborationPresenceStatus" NOT NULL DEFAULT 'ONLINE',
  "currentSection" TEXT,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnectedAt" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "CasePresence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseClinicalNote" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "richText" TEXT NOT NULL,
  "plainText" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseClinicalNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseClinicalNoteEdit" (
  "id" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "editorId" TEXT NOT NULL,
  "previousRichText" TEXT NOT NULL,
  "nextRichText" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseClinicalNoteEdit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseActivity" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "CollaborationActivityType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseDiscussionThread" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseDiscussionThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseDiscussionMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "parentId" TEXT,
  "body" TEXT NOT NULL,
  "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "attachments" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseDiscussionMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseDiscussionReadReceipt" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseDiscussionReadReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseAssignment" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "assignedToId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "type" "CollaborationAssignmentType" NOT NULL DEFAULT 'PRIMARY_REVIEW',
  "status" "CollaborationAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "CaseAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseLock" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "status" "CollaborationLockStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseLock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseVersion" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "reason" TEXT,
  "restoredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CasePresence_caseId_userId_key" ON "CasePresence"("caseId", "userId");
CREATE INDEX "CasePresence_caseId_idx" ON "CasePresence"("caseId");
CREATE INDEX "CasePresence_userId_idx" ON "CasePresence"("userId");
CREATE INDEX "CasePresence_status_idx" ON "CasePresence"("status");
CREATE INDEX "CasePresence_lastActivityAt_idx" ON "CasePresence"("lastActivityAt");

CREATE INDEX "CaseClinicalNote_caseId_idx" ON "CaseClinicalNote"("caseId");
CREATE INDEX "CaseClinicalNote_authorId_idx" ON "CaseClinicalNote"("authorId");
CREATE INDEX "CaseClinicalNote_createdAt_idx" ON "CaseClinicalNote"("createdAt");
CREATE INDEX "CaseClinicalNoteEdit_noteId_idx" ON "CaseClinicalNoteEdit"("noteId");
CREATE INDEX "CaseClinicalNoteEdit_editorId_idx" ON "CaseClinicalNoteEdit"("editorId");
CREATE INDEX "CaseClinicalNoteEdit_createdAt_idx" ON "CaseClinicalNoteEdit"("createdAt");

CREATE INDEX "CaseActivity_caseId_idx" ON "CaseActivity"("caseId");
CREATE INDEX "CaseActivity_actorId_idx" ON "CaseActivity"("actorId");
CREATE INDEX "CaseActivity_type_idx" ON "CaseActivity"("type");
CREATE INDEX "CaseActivity_createdAt_idx" ON "CaseActivity"("createdAt");

CREATE INDEX "CaseDiscussionThread_caseId_idx" ON "CaseDiscussionThread"("caseId");
CREATE INDEX "CaseDiscussionThread_resolved_idx" ON "CaseDiscussionThread"("resolved");
CREATE INDEX "CaseDiscussionThread_updatedAt_idx" ON "CaseDiscussionThread"("updatedAt");
CREATE INDEX "CaseDiscussionMessage_threadId_idx" ON "CaseDiscussionMessage"("threadId");
CREATE INDEX "CaseDiscussionMessage_authorId_idx" ON "CaseDiscussionMessage"("authorId");
CREATE INDEX "CaseDiscussionMessage_parentId_idx" ON "CaseDiscussionMessage"("parentId");
CREATE INDEX "CaseDiscussionMessage_createdAt_idx" ON "CaseDiscussionMessage"("createdAt");
CREATE UNIQUE INDEX "CaseDiscussionReadReceipt_messageId_userId_key" ON "CaseDiscussionReadReceipt"("messageId", "userId");
CREATE INDEX "CaseDiscussionReadReceipt_userId_idx" ON "CaseDiscussionReadReceipt"("userId");
CREATE INDEX "CaseDiscussionReadReceipt_readAt_idx" ON "CaseDiscussionReadReceipt"("readAt");

CREATE INDEX "CaseAssignment_caseId_idx" ON "CaseAssignment"("caseId");
CREATE INDEX "CaseAssignment_assignedToId_idx" ON "CaseAssignment"("assignedToId");
CREATE INDEX "CaseAssignment_assignedById_idx" ON "CaseAssignment"("assignedById");
CREATE INDEX "CaseAssignment_type_idx" ON "CaseAssignment"("type");
CREATE INDEX "CaseAssignment_status_idx" ON "CaseAssignment"("status");
CREATE INDEX "CaseAssignment_createdAt_idx" ON "CaseAssignment"("createdAt");

CREATE INDEX "CaseLock_caseId_idx" ON "CaseLock"("caseId");
CREATE INDEX "CaseLock_userId_idx" ON "CaseLock"("userId");
CREATE INDEX "CaseLock_resource_idx" ON "CaseLock"("resource");
CREATE INDEX "CaseLock_status_idx" ON "CaseLock"("status");
CREATE INDEX "CaseLock_expiresAt_idx" ON "CaseLock"("expiresAt");

CREATE UNIQUE INDEX "CaseVersion_caseId_version_key" ON "CaseVersion"("caseId", "version");
CREATE INDEX "CaseVersion_caseId_idx" ON "CaseVersion"("caseId");
CREATE INDEX "CaseVersion_createdById_idx" ON "CaseVersion"("createdById");
CREATE INDEX "CaseVersion_createdAt_idx" ON "CaseVersion"("createdAt");

ALTER TABLE "CasePresence"
  ADD CONSTRAINT "CasePresence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CasePresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseClinicalNote"
  ADD CONSTRAINT "CaseClinicalNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseClinicalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CaseClinicalNoteEdit"
  ADD CONSTRAINT "CaseClinicalNoteEdit_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "CaseClinicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseClinicalNoteEdit_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CaseActivity"
  ADD CONSTRAINT "CaseActivity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseDiscussionThread"
  ADD CONSTRAINT "CaseDiscussionThread_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseDiscussionMessage"
  ADD CONSTRAINT "CaseDiscussionMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CaseDiscussionThread"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseDiscussionMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseDiscussionMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CaseDiscussionMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseDiscussionReadReceipt"
  ADD CONSTRAINT "CaseDiscussionReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CaseDiscussionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseDiscussionReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseAssignment"
  ADD CONSTRAINT "CaseAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CaseLock"
  ADD CONSTRAINT "CaseLock_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseVersion"
  ADD CONSTRAINT "CaseVersion_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CaseVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
