CREATE TYPE "ECGFileType" AS ENUM ('DICOM_ECG', 'SCP_ECG', 'EDF', 'XML_ECG', 'HL7_ECG', 'PHILIPS_XML', 'GE_MUSE_XML', 'IMAGE', 'PDF_REPORT', 'WAVEFORM', 'UNKNOWN');
CREATE TYPE "ECGAnnotationType" AS ENUM ('P_WAVE', 'QRS_COMPLEX', 'T_WAVE', 'R_PEAK');
CREATE TYPE "PACSModality" AS ENUM ('ECG', 'WAVEFORM', 'SR', 'OT');
CREATE TYPE "HospitalIntegrationProtocol" AS ENUM ('HL7', 'FHIR');
CREATE TYPE "TelecardiologyReviewStatus" AS ENUM ('REQUESTED', 'IN_REVIEW', 'SIGNED_OFF', 'CANCELLED');
CREATE TYPE "ClinicalAlertType" AS ENUM ('STEMI', 'VENTRICULAR_TACHYCARDIA', 'AF_RVR', 'COMPLETE_HEART_BLOCK', 'EXTREME_BRADYCARDIA');

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'ECG_FILE_PARSED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'ECG_MEASURED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'ECG_COMPARISON_COMPLETED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CLINICAL_ALERT_CREATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'TELECARDIOLOGY_REVIEW_REQUESTED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'TELECARDIOLOGY_REVIEW_SIGNED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ECG_FILE_PARSED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ECG_MEASURED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ECG_COMPARISON_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINICAL_ALERT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PACS_OPERATION';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FHIR_OPERATION';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TELECARDIOLOGY_REVIEW_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TELECARDIOLOGY_REVIEW_SIGNED';

ALTER TABLE "ECGFile" ALTER COLUMN "caseId" DROP NOT NULL;
ALTER TABLE "ECGFile" ADD COLUMN "patientId" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN "fileName" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN "fileType" "ECGFileType" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "ECGFile" ADD COLUMN "storedPath" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN "deviceModel" TEXT;
ALTER TABLE "ECGFile" ADD COLUMN "samplingRate" INTEGER;
ALTER TABLE "ECGFile" ADD COLUMN "duration" DOUBLE PRECISION;
ALTER TABLE "ECGFile" ADD COLUMN "numberOfLeads" INTEGER;
ALTER TABLE "ECGFile" ADD COLUMN "acquisitionDate" TIMESTAMP(3);
ALTER TABLE "ECGFile" ADD COLUMN "metadataJson" JSONB;
ALTER TABLE "ECGMeasurement" ADD COLUMN "rrInterval" INTEGER;
ALTER TABLE "ECGMeasurement" ADD COLUMN "pDuration" INTEGER;
ALTER TABLE "ECGMeasurement" ADD COLUMN "electricalAxis" DOUBLE PRECISION;

UPDATE "ECGFile" SET "fileName" = "originalName", "storedPath" = "storagePath" WHERE "fileName" IS NULL;

CREATE TABLE "ECGLeadSignal" (
  "id" TEXT NOT NULL,
  "ecgFileId" TEXT NOT NULL,
  "leadName" TEXT NOT NULL,
  "signalData" DOUBLE PRECISION[],
  "samplingRate" INTEGER NOT NULL,
  "duration" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECGLeadSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ECGAnnotation" (
  "id" TEXT NOT NULL,
  "ecgFileId" TEXT NOT NULL,
  "leadName" TEXT NOT NULL,
  "annotationType" "ECGAnnotationType" NOT NULL,
  "startIndex" INTEGER NOT NULL,
  "peakIndex" INTEGER NOT NULL,
  "endIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECGAnnotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PACSConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "aeTitle" TEXT NOT NULL,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL,
  "modality" "PACSModality" NOT NULL DEFAULT 'ECG',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PACSConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HospitalIntegrationLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "protocol" "HospitalIntegrationProtocol" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HospitalIntegrationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelecardiologyReview" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "ecgFileId" TEXT,
  "requestedById" TEXT NOT NULL,
  "assignedDoctorId" TEXT,
  "signedById" TEXT,
  "status" "TelecardiologyReviewStatus" NOT NULL DEFAULT 'REQUESTED',
  "secondOpinion" TEXT,
  "consultationNotes" TEXT,
  "remoteSignoff" BOOLEAN NOT NULL DEFAULT false,
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelecardiologyReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ECGClinicalAlert" (
  "id" TEXT NOT NULL,
  "caseId" TEXT,
  "patientId" TEXT NOT NULL,
  "organizationId" TEXT,
  "ecgFileId" TEXT,
  "alertType" "ClinicalAlertType" NOT NULL,
  "severity" "AISeverity" NOT NULL DEFAULT 'CRITICAL',
  "message" TEXT NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECGClinicalAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ECGFile_patientId_idx" ON "ECGFile"("patientId");
CREATE INDEX "ECGFile_organizationId_idx" ON "ECGFile"("organizationId");
CREATE INDEX "ECGFile_fileType_idx" ON "ECGFile"("fileType");
CREATE UNIQUE INDEX "ECGLeadSignal_ecgFileId_leadName_key" ON "ECGLeadSignal"("ecgFileId", "leadName");
CREATE INDEX "ECGLeadSignal_ecgFileId_idx" ON "ECGLeadSignal"("ecgFileId");
CREATE INDEX "ECGLeadSignal_leadName_idx" ON "ECGLeadSignal"("leadName");
CREATE INDEX "ECGAnnotation_ecgFileId_idx" ON "ECGAnnotation"("ecgFileId");
CREATE INDEX "ECGAnnotation_leadName_idx" ON "ECGAnnotation"("leadName");
CREATE INDEX "ECGAnnotation_annotationType_idx" ON "ECGAnnotation"("annotationType");
CREATE INDEX "PACSConnection_organizationId_idx" ON "PACSConnection"("organizationId");
CREATE INDEX "PACSConnection_aeTitle_idx" ON "PACSConnection"("aeTitle");
CREATE INDEX "PACSConnection_modality_idx" ON "PACSConnection"("modality");
CREATE INDEX "HospitalIntegrationLog_organizationId_idx" ON "HospitalIntegrationLog"("organizationId");
CREATE INDEX "HospitalIntegrationLog_protocol_idx" ON "HospitalIntegrationLog"("protocol");
CREATE INDEX "HospitalIntegrationLog_resourceType_idx" ON "HospitalIntegrationLog"("resourceType");
CREATE INDEX "HospitalIntegrationLog_createdAt_idx" ON "HospitalIntegrationLog"("createdAt");
CREATE INDEX "TelecardiologyReview_caseId_idx" ON "TelecardiologyReview"("caseId");
CREATE INDEX "TelecardiologyReview_patientId_idx" ON "TelecardiologyReview"("patientId");
CREATE INDEX "TelecardiologyReview_ecgFileId_idx" ON "TelecardiologyReview"("ecgFileId");
CREATE INDEX "TelecardiologyReview_status_idx" ON "TelecardiologyReview"("status");
CREATE INDEX "ECGClinicalAlert_caseId_idx" ON "ECGClinicalAlert"("caseId");
CREATE INDEX "ECGClinicalAlert_patientId_idx" ON "ECGClinicalAlert"("patientId");
CREATE INDEX "ECGClinicalAlert_organizationId_idx" ON "ECGClinicalAlert"("organizationId");
CREATE INDEX "ECGClinicalAlert_ecgFileId_idx" ON "ECGClinicalAlert"("ecgFileId");
CREATE INDEX "ECGClinicalAlert_alertType_idx" ON "ECGClinicalAlert"("alertType");
CREATE INDEX "ECGClinicalAlert_createdAt_idx" ON "ECGClinicalAlert"("createdAt");

ALTER TABLE "ECGFile" ADD CONSTRAINT "ECGFile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGFile" ADD CONSTRAINT "ECGFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGLeadSignal" ADD CONSTRAINT "ECGLeadSignal_ecgFileId_fkey" FOREIGN KEY ("ecgFileId") REFERENCES "ECGFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGAnnotation" ADD CONSTRAINT "ECGAnnotation_ecgFileId_fkey" FOREIGN KEY ("ecgFileId") REFERENCES "ECGFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PACSConnection" ADD CONSTRAINT "PACSConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PACSConnection" ADD CONSTRAINT "PACSConnection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HospitalIntegrationLog" ADD CONSTRAINT "HospitalIntegrationLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HospitalIntegrationLog" ADD CONSTRAINT "HospitalIntegrationLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TelecardiologyReview" ADD CONSTRAINT "TelecardiologyReview_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelecardiologyReview" ADD CONSTRAINT "TelecardiologyReview_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelecardiologyReview" ADD CONSTRAINT "TelecardiologyReview_ecgFileId_fkey" FOREIGN KEY ("ecgFileId") REFERENCES "ECGFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TelecardiologyReview" ADD CONSTRAINT "TelecardiologyReview_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TelecardiologyReview" ADD CONSTRAINT "TelecardiologyReview_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TelecardiologyReview" ADD CONSTRAINT "TelecardiologyReview_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGClinicalAlert" ADD CONSTRAINT "ECGClinicalAlert_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGClinicalAlert" ADD CONSTRAINT "ECGClinicalAlert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECGClinicalAlert" ADD CONSTRAINT "ECGClinicalAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ECGClinicalAlert" ADD CONSTRAINT "ECGClinicalAlert_ecgFileId_fkey" FOREIGN KEY ("ecgFileId") REFERENCES "ECGFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
