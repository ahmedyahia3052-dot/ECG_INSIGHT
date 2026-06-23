CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');
CREATE TYPE "ECGCaseStatus" AS ENUM ('PENDING', 'PROCESSING', 'REVIEWED', 'FINALIZED');
CREATE TYPE "ECGPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AIStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "AuditAction" AS ENUM (
  'CASE_CREATED',
  'CASE_UPDATED',
  'CASE_ASSIGNED',
  'CASE_STATUS_CHANGED',
  'ECG_UPLOADED',
  'DIAGNOSIS_CHANGED',
  'PATIENT_CREATED',
  'PATIENT_UPDATED',
  'PATIENT_ARCHIVED'
);

CREATE TABLE "Patient" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
  "dateOfBirth" TIMESTAMP(3) NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "medicalRecordNumber" TEXT NOT NULL,
  "nationalId" TEXT,
  "address" TEXT,
  "emergencyContact" TEXT,
  "allergies" TEXT,
  "medicalHistory" TEXT,
  "medications" TEXT,
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ECGCase" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "assignedDoctorId" TEXT,
  "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ecgType" TEXT NOT NULL,
  "status" "ECGCaseStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "ECGPriority" NOT NULL DEFAULT 'MEDIUM',
  "aiStatus" "AIStatus" NOT NULL DEFAULT 'QUEUED',
  "finalDiagnosis" TEXT,
  "clinicalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ECGCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ECGFile" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECGFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "actorId" TEXT NOT NULL,
  "caseId" TEXT,
  "patientId" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Patient_medicalRecordNumber_key" ON "Patient"("medicalRecordNumber");
CREATE UNIQUE INDEX "Patient_nationalId_key" ON "Patient"("nationalId");
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");
CREATE INDEX "Patient_medicalRecordNumber_idx" ON "Patient"("medicalRecordNumber");
CREATE INDEX "Patient_archivedAt_idx" ON "Patient"("archivedAt");

CREATE UNIQUE INDEX "ECGCase_caseId_key" ON "ECGCase"("caseId");
CREATE INDEX "ECGCase_patientId_idx" ON "ECGCase"("patientId");
CREATE INDEX "ECGCase_uploadedById_idx" ON "ECGCase"("uploadedById");
CREATE INDEX "ECGCase_assignedDoctorId_idx" ON "ECGCase"("assignedDoctorId");
CREATE INDEX "ECGCase_status_idx" ON "ECGCase"("status");
CREATE INDEX "ECGCase_priority_idx" ON "ECGCase"("priority");
CREATE INDEX "ECGCase_uploadDate_idx" ON "ECGCase"("uploadDate");

CREATE INDEX "ECGFile_caseId_idx" ON "ECGFile"("caseId");
CREATE INDEX "ECGFile_uploadedById_idx" ON "ECGFile"("uploadedById");

CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_caseId_idx" ON "AuditLog"("caseId");
CREATE INDEX "AuditLog_patientId_idx" ON "AuditLog"("patientId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "ECGCase" ADD CONSTRAINT "ECGCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ECGCase" ADD CONSTRAINT "ECGCase_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ECGCase" ADD CONSTRAINT "ECGCase_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGFile" ADD CONSTRAINT "ECGFile_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD COLUMN "caseId" TEXT;
CREATE INDEX "Notification_caseId_idx" ON "Notification"("caseId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
