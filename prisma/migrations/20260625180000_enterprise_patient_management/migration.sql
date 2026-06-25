CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "Patient"
  ADD COLUMN "patientCode" TEXT,
  ADD COLUMN "middleName" TEXT,
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "passportNumber" TEXT,
  ADD COLUMN "company" TEXT,
  ADD COLUMN "departmentName" TEXT,
  ADD COLUMN "contractorName" TEXT,
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "bloodGroup" TEXT,
  ADD COLUMN "maritalStatus" TEXT,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "heightCm" DOUBLE PRECISION,
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "bmi" DOUBLE PRECISION,
  ADD COLUMN "alcoholStatus" TEXT,
  ADD COLUMN "ischemicHeartDisease" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "heartFailure" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "arrhythmiaHistoryFlag" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "previousMI" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "previousCABG" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "previousPCI" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stentsHistory" TEXT,
  ADD COLUMN "knownAllergies" TEXT,
  ADD COLUMN "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "updatedById" TEXT;

WITH numbered AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "Patient"
)
UPDATE "Patient"
SET
  "patientCode" = 'ECG-' || lpad(numbered.rn::text, 6, '0'),
  "fullName" = trim(concat_ws(' ', "Patient"."firstName", "Patient"."lastName")),
  "knownAllergies" = "Patient"."allergies",
  "company" = "Patient"."occupation",
  "jobTitle" = "Patient"."occupation"
FROM numbered
WHERE "Patient"."id" = numbered."id"
  AND "Patient"."patientCode" IS NULL;

CREATE UNIQUE INDEX "Patient_patientCode_key" ON "Patient"("patientCode");
CREATE UNIQUE INDEX "Patient_passportNumber_key" ON "Patient"("passportNumber");
CREATE INDEX "Patient_patientCode_idx" ON "Patient"("patientCode");
CREATE INDEX "Patient_status_idx" ON "Patient"("status");
CREATE INDEX "Patient_createdById_idx" ON "Patient"("createdById");
