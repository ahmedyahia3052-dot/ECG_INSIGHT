-- Sprint 85 — ECG Storage Engine

ALTER TABLE "ECGFile" ADD COLUMN IF NOT EXISTS "checksum" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN IF NOT EXISTS "storageProvider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "ECGFile" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ECGFile" ADD COLUMN IF NOT EXISTS "recordUuid" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "ECGFile_recordUuid_key" ON "ECGFile"("recordUuid");
CREATE INDEX IF NOT EXISTS "ECGFile_checksum_idx" ON "ECGFile"("checksum");
CREATE INDEX IF NOT EXISTS "ECGFile_storageProvider_idx" ON "ECGFile"("storageProvider");
CREATE INDEX IF NOT EXISTS "ECGFile_deletedAt_idx" ON "ECGFile"("deletedAt");

CREATE TABLE IF NOT EXISTS "ECGFileVersion" (
  "id" TEXT NOT NULL,
  "ecgFileId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "storagePath" TEXT,
  "checksum" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECGFileVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ECGFileVersion_ecgFileId_version_key" ON "ECGFileVersion"("ecgFileId", "version");
CREATE INDEX IF NOT EXISTS "ECGFileVersion_ecgFileId_idx" ON "ECGFileVersion"("ecgFileId");
CREATE INDEX IF NOT EXISTS "ECGFileVersion_checksum_idx" ON "ECGFileVersion"("checksum");

ALTER TABLE "ECGFileVersion" DROP CONSTRAINT IF EXISTS "ECGFileVersion_ecgFileId_fkey";
ALTER TABLE "ECGFileVersion" ADD CONSTRAINT "ECGFileVersion_ecgFileId_fkey"
  FOREIGN KEY ("ecgFileId") REFERENCES "ECGFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
