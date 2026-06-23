CREATE TYPE "CardiacProcedureType" AS ENUM ('CORONARY_ANGIOGRAPHY', 'PCI', 'CABG', 'OPEN_HEART_SURGERY', 'VALVE_REPLACEMENT', 'PACEMAKER', 'ICD', 'CRT', 'ABLATION', 'CARDIAC_CATHETERIZATION');
CREATE TYPE "CardiacImagingType" AS ENUM ('ECHOCARDIOGRAPHY', 'STRESS_ECG', 'HOLTER_ECG', 'CARDIAC_CT', 'CARDIAC_MRI', 'CORONARY_CTA', 'ANGIOGRAPHY_IMAGES', 'CHEST_XRAY');
CREATE TYPE "MedicationCategory" AS ENUM ('ACE_INHIBITOR', 'ARB', 'BETA_BLOCKER', 'CALCIUM_CHANNEL_BLOCKER', 'DIURETIC', 'ANTIPLATELET', 'ANTICOAGULANT', 'STATIN', 'ANTIARRHYTHMIC', 'NITRATE', 'SGLT2_INHIBITOR', 'OTHER');

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CARDIAC_PROCEDURE_ADDED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CARDIAC_IMAGING_UPLOADED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'MEDICATION_ADDED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'MEDICATION_UPDATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'HOSPITALIZATION_ADDED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CARDIAC_PROCEDURE_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CARDIAC_IMAGING_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICATION_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICATION_UPDATED';

ALTER TABLE "CardiacHistory"
  ADD COLUMN "hypertension" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "diabetesMellitus" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dyslipidemia" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smokingStatus" "SmokingStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "obesity" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "familyHistoryHeartDisease" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "previousStroke" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "arrhythmiaHistory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rheumaticHeartDisease" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CardiacProcedure" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "procedureType" "CardiacProcedureType" NOT NULL,
  "procedureDate" TIMESTAMP(3) NOT NULL,
  "hospital" TEXT,
  "operatorPhysician" TEXT,
  "findings" TEXT,
  "documents" TEXT[],
  "images" TEXT[],
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardiacProcedure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CardiacImaging" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "imagingType" "CardiacImagingType" NOT NULL,
  "title" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3),
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "findings" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardiacImaging_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationHistory" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "drugName" TEXT NOT NULL,
  "category" "MedicationCategory" NOT NULL DEFAULT 'OTHER',
  "dose" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "stopDate" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CardiacProcedure_patientId_idx" ON "CardiacProcedure"("patientId");
CREATE INDEX "CardiacProcedure_procedureType_idx" ON "CardiacProcedure"("procedureType");
CREATE INDEX "CardiacProcedure_procedureDate_idx" ON "CardiacProcedure"("procedureDate");

CREATE INDEX "CardiacImaging_patientId_idx" ON "CardiacImaging"("patientId");
CREATE INDEX "CardiacImaging_imagingType_idx" ON "CardiacImaging"("imagingType");
CREATE INDEX "CardiacImaging_createdAt_idx" ON "CardiacImaging"("createdAt");

CREATE INDEX "MedicationHistory_patientId_idx" ON "MedicationHistory"("patientId");
CREATE INDEX "MedicationHistory_drugName_idx" ON "MedicationHistory"("drugName");
CREATE INDEX "MedicationHistory_category_idx" ON "MedicationHistory"("category");
CREATE INDEX "MedicationHistory_active_idx" ON "MedicationHistory"("active");
CREATE INDEX "MedicationHistory_startDate_idx" ON "MedicationHistory"("startDate");

ALTER TABLE "CardiacProcedure" ADD CONSTRAINT "CardiacProcedure_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardiacImaging" ADD CONSTRAINT "CardiacImaging_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationHistory" ADD CONSTRAINT "MedicationHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
