-- Sprint 83 — Authentication backend: enterprise roles + refresh token version tracking

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ORGANIZATION_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TECHNICIAN';

ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "Session_replacedById_idx" ON "Session"("replacedById");
