-- Sprint 87 — Clinical Case Management lifecycle + note types

ALTER TYPE "CaseManagementStatus" ADD VALUE IF NOT EXISTS 'UPLOADED';
ALTER TYPE "CaseManagementStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "CaseManagementStatus" ADD VALUE IF NOT EXISTS 'FINALIZED';

CREATE TYPE "CaseCommentNoteType" AS ENUM ('CLINICAL', 'DOCTOR', 'INTERNAL');

ALTER TABLE "CaseComment" ADD COLUMN IF NOT EXISTS "noteType" "CaseCommentNoteType" NOT NULL DEFAULT 'DOCTOR';

CREATE INDEX IF NOT EXISTS "CaseComment_noteType_idx" ON "CaseComment"("noteType");
