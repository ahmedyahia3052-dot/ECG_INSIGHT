-- Sprint 57 — Enterprise Report Engine

CREATE TYPE "EnterpriseReportType" AS ENUM (
  'PROFESSIONAL_ECG',
  'HOSPITAL',
  'OCCUPATIONAL_ECG',
  'MEDICAL_FITNESS',
  'EMERGENCY',
  'FOLLOW_UP',
  'COMPARISON',
  'AI_DIAGNOSTIC',
  'TEACHING'
);

CREATE TYPE "ReportTemplateCategory" AS ENUM (
  'HOSPITAL',
  'CLINIC',
  'EMERGENCY',
  'OCCUPATIONAL_MEDICINE',
  'SPORTS_MEDICINE',
  'INSURANCE',
  'PRE_EMPLOYMENT',
  'ANNUAL_CHECKUP',
  'TEACHING'
);

CREATE TYPE "ReportExportFormat" AS ENUM (
  'PDF',
  'HTML',
  'PNG',
  'JPEG',
  'JSON',
  'FHIR',
  'PRINT',
  'EMAIL',
  'CLIPBOARD',
  'SHARE'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_EXPORTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_PRINTED';

ALTER TABLE "ClinicalReport"
  ADD COLUMN "reportType" "EnterpriseReportType" NOT NULL DEFAULT 'PROFESSIONAL_ECG',
  ADD COLUMN "templateCategory" "ReportTemplateCategory",
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "reportUuid" TEXT,
  ADD COLUMN "verificationHash" TEXT,
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "departmentName" TEXT,
  ADD COLUMN "attachmentManifest" JSONB,
  ADD COLUMN "brandingSnapshot" JSONB,
  ADD COLUMN "medicalIntelligenceReportId" TEXT;

UPDATE "ClinicalReport" SET "reportUuid" = md5(random()::text || clock_timestamp()::text || id) WHERE "reportUuid" IS NULL;
ALTER TABLE "ClinicalReport" ALTER COLUMN "reportUuid" SET NOT NULL;

CREATE UNIQUE INDEX "ClinicalReport_reportUuid_key" ON "ClinicalReport"("reportUuid");
CREATE INDEX "ClinicalReport_reportType_idx" ON "ClinicalReport"("reportType");
CREATE INDEX "ClinicalReport_templateCategory_idx" ON "ClinicalReport"("templateCategory");
CREATE INDEX "ClinicalReport_contentHash_idx" ON "ClinicalReport"("contentHash");

CREATE TABLE "EnterpriseReportTemplate" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "ReportTemplateCategory" NOT NULL,
  "reportType" "EnterpriseReportType" NOT NULL,
  "description" TEXT,
  "sections" JSONB NOT NULL,
  "branding" JSONB,
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "organizationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseReportTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseReportTemplate_slug_key" ON "EnterpriseReportTemplate"("slug");
CREATE INDEX "EnterpriseReportTemplate_category_idx" ON "EnterpriseReportTemplate"("category");
CREATE INDEX "EnterpriseReportTemplate_reportType_idx" ON "EnterpriseReportTemplate"("reportType");
CREATE INDEX "EnterpriseReportTemplate_organizationId_idx" ON "EnterpriseReportTemplate"("organizationId");

ALTER TABLE "ClinicalReport"
  ADD CONSTRAINT "ClinicalReport_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "EnterpriseReportTemplate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReportExportLog" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "format" "ReportExportFormat" NOT NULL,
  "exportedById" TEXT NOT NULL,
  "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "ReportExportLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportExportLog_reportId_idx" ON "ReportExportLog"("reportId");
CREATE INDEX "ReportExportLog_exportedById_idx" ON "ReportExportLog"("exportedById");
CREATE INDEX "ReportExportLog_format_idx" ON "ReportExportLog"("format");
CREATE INDEX "ReportExportLog_exportedAt_idx" ON "ReportExportLog"("exportedAt");

ALTER TABLE "ReportExportLog"
  ADD CONSTRAINT "ReportExportLog_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "ClinicalReport"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportExportLog"
  ADD CONSTRAINT "ReportExportLog_exportedById_fkey"
  FOREIGN KEY ("exportedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReportHistoryEvent" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "details" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportHistoryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportHistoryEvent_reportId_idx" ON "ReportHistoryEvent"("reportId");
CREATE INDEX "ReportHistoryEvent_actorId_idx" ON "ReportHistoryEvent"("actorId");
CREATE INDEX "ReportHistoryEvent_action_idx" ON "ReportHistoryEvent"("action");
CREATE INDEX "ReportHistoryEvent_createdAt_idx" ON "ReportHistoryEvent"("createdAt");

ALTER TABLE "ReportHistoryEvent"
  ADD CONSTRAINT "ReportHistoryEvent_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "ClinicalReport"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportHistoryEvent"
  ADD CONSTRAINT "ReportHistoryEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
