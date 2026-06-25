ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'UPLOADED';
ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'AI_COMPLETED';
ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ECGCaseStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ECGCaseSeverity') THEN
    CREATE TYPE "ECGCaseSeverity" AS ENUM ('NORMAL', 'ABNORMAL', 'CRITICAL');
  END IF;
END $$;

ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "caseNumber" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "acquisitionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "severity" "ECGCaseSeverity" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "imagePath" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "pdfPath" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "preprocessedImagePath" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "heartRate" INTEGER;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "prInterval" INTEGER;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "qrsDuration" INTEGER;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "qtInterval" INTEGER;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "qtcInterval" INTEGER;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "rhythm" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "aiDiagnosis" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "doctorDiagnosis" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "clinicalComments" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "recommendations" TEXT;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "confidenceScore" DOUBLE PRECISION;
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "ECGCase" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "ECGCase"
  WHERE "caseNumber" IS NULL
)
UPDATE "ECGCase"
SET "caseNumber" = 'ECGCASE-' || LPAD(numbered.rn::TEXT, 6, '0')
FROM numbered
WHERE "ECGCase".id = numbered.id;

UPDATE "ECGCase"
SET
  "aiDiagnosis" = COALESCE("aiDiagnosis", "finalDiagnosis"),
  "doctorDiagnosis" = COALESCE("doctorDiagnosis", "finalDiagnosis"),
  "clinicalComments" = COALESCE("clinicalComments", "clinicalNotes"),
  "reviewedAt" = CASE WHEN status IN ('REVIEWED', 'FINALIZED') AND "reviewedAt" IS NULL THEN "updatedAt" ELSE "reviewedAt" END,
  "approvedAt" = CASE WHEN status = 'FINALIZED' AND "approvedAt" IS NULL THEN "updatedAt" ELSE "approvedAt" END,
  "finalizedAt" = CASE WHEN status = 'FINALIZED' AND "finalizedAt" IS NULL THEN "updatedAt" ELSE "finalizedAt" END,
  "severity" = CASE
    WHEN priority = 'CRITICAL' THEN 'CRITICAL'::"ECGCaseSeverity"
    WHEN priority IN ('HIGH', 'MEDIUM') OR "finalDiagnosis" IS NOT NULL THEN 'ABNORMAL'::"ECGCaseSeverity"
    ELSE 'NORMAL'::"ECGCaseSeverity"
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ECGCase_reviewedById_fkey'
  ) THEN
    ALTER TABLE "ECGCase"
      ADD CONSTRAINT "ECGCase_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ECGCase_caseNumber_key" ON "ECGCase"("caseNumber");
CREATE INDEX IF NOT EXISTS "ECGCase_reviewedById_idx" ON "ECGCase"("reviewedById");
CREATE INDEX IF NOT EXISTS "ECGCase_severity_idx" ON "ECGCase"("severity");
CREATE INDEX IF NOT EXISTS "ECGCase_caseNumber_idx" ON "ECGCase"("caseNumber");
CREATE INDEX IF NOT EXISTS "ECGCase_acquisitionDate_idx" ON "ECGCase"("acquisitionDate");
