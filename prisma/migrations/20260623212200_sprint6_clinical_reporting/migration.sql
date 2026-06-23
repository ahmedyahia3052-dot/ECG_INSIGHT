CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'FINALIZED', 'SIGNED', 'ARCHIVED');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_FINALIZED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_SIGNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_ARCHIVED';

ALTER TABLE "User" ADD COLUMN "licenseNumber" TEXT;

CREATE TABLE "ClinicalReport" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
  "reportNumber" TEXT NOT NULL,
  "organizationName" TEXT,
  "contractorName" TEXT,
  "acquisitionDate" TIMESTAMP(3) NOT NULL,
  "reportingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referringPhysician" TEXT,
  "clinicalIndication" TEXT,
  "aiFindings" TEXT,
  "ecgMeasurements" JSONB,
  "rhythmInterpretation" TEXT,
  "severityClassification" TEXT,
  "differentialDiagnosis" TEXT[],
  "recommendations" TEXT[],
  "urgentActions" TEXT[],
  "finalPhysicianImpression" TEXT,
  "physicianName" TEXT NOT NULL,
  "physicianSpecialty" TEXT,
  "physicianLicenseNumber" TEXT,
  "electronicSignaturePath" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "authorId" TEXT NOT NULL,
  "finalizedById" TEXT,
  "signedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportVersion" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "authorId" TEXT NOT NULL,
  "modifications" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportSignature" (
  "id" TEXT NOT NULL,
  "physicianId" TEXT NOT NULL,
  "imagePath" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportSignature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailLog" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "metadata" JSONB,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalReport_reportNumber_key" ON "ClinicalReport"("reportNumber");
CREATE INDEX "ClinicalReport_caseId_idx" ON "ClinicalReport"("caseId");
CREATE INDEX "ClinicalReport_patientId_idx" ON "ClinicalReport"("patientId");
CREATE INDEX "ClinicalReport_status_idx" ON "ClinicalReport"("status");
CREATE INDEX "ClinicalReport_authorId_idx" ON "ClinicalReport"("authorId");
CREATE INDEX "ClinicalReport_createdAt_idx" ON "ClinicalReport"("createdAt");

CREATE INDEX "ReportVersion_reportId_idx" ON "ReportVersion"("reportId");
CREATE INDEX "ReportVersion_authorId_idx" ON "ReportVersion"("authorId");
CREATE UNIQUE INDEX "ReportVersion_reportId_versionNumber_key" ON "ReportVersion"("reportId", "versionNumber");

CREATE INDEX "ReportSignature_physicianId_idx" ON "ReportSignature"("physicianId");
CREATE UNIQUE INDEX "ReportSignature_physicianId_key" ON "ReportSignature"("physicianId");

CREATE INDEX "EmailLog_reportId_idx" ON "EmailLog"("reportId");
CREATE INDEX "EmailLog_recipient_idx" ON "EmailLog"("recipient");
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ClinicalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportSignature" ADD CONSTRAINT "ReportSignature_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ClinicalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
