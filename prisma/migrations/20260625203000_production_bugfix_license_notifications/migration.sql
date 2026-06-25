ALTER TYPE "Gender" ADD VALUE IF NOT EXISTS 'CHILD_MALE';
ALTER TYPE "Gender" ADD VALUE IF NOT EXISTS 'CHILD_FEMALE';

ALTER TYPE "LicenseStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "LicenseStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "patientId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "reportId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "actionUrl" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId" TEXT;

UPDATE "Notification"
SET
  "entityType" = CASE
    WHEN "caseId" IS NOT NULL THEN 'ecg_case'
    ELSE "entityType"
  END,
  "entityId" = COALESCE("entityId", "caseId"),
  "actionUrl" = COALESCE("actionUrl", CASE WHEN "caseId" IS NOT NULL THEN '/ecg-cases/' || "caseId" ELSE NULL END);

CREATE INDEX IF NOT EXISTS "Notification_patientId_idx" ON "Notification"("patientId");
CREATE INDEX IF NOT EXISTS "Notification_reportId_idx" ON "Notification"("reportId");
