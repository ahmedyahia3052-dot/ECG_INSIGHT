ALTER TABLE "ClinicalReport"
  ADD COLUMN IF NOT EXISTS "pdfStoragePath" TEXT,
  ADD COLUMN IF NOT EXISTS "htmlStoragePath" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationToken" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "qrCodeData" TEXT;

UPDATE "ClinicalReport"
SET "verificationToken" = COALESCE("verificationToken", id)
WHERE "verificationToken" IS NULL;

ALTER TABLE "ClinicalReport"
  ALTER COLUMN "verificationToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalReport_verificationToken_key" ON "ClinicalReport"("verificationToken");
CREATE INDEX IF NOT EXISTS "ClinicalReport_verificationToken_idx" ON "ClinicalReport"("verificationToken");
