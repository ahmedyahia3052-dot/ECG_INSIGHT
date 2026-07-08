-- Sprint 59 — AI Report Generator Enterprise

CREATE TYPE "ClinicalGeneratedReportStatus" AS ENUM (
  'GENERATED',
  'REGENERATED'
);

CREATE TYPE "ClinicalRiskLevel" AS ENUM (
  'LOW',
  'INTERMEDIATE',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "ClinicalReportFlagType" AS ENUM (
  'URGENT',
  'NEEDS_REVIEW',
  'ARTIFACT',
  'POOR_QUALITY',
  'MANUAL_REVIEW_REQUIRED'
);

CREATE TYPE "ClinicalRecommendationCategory" AS ENUM (
  'IMMEDIATE_ACTION',
  'CLINICAL_RECOMMENDATION',
  'FOLLOW_UP',
  'FURTHER_INVESTIGATION'
);

CREATE TABLE "ClinicalGeneratedReport" (
  "id" TEXT NOT NULL,
  "reportGroupId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "caseId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "status" "ClinicalGeneratedReportStatus" NOT NULL DEFAULT 'GENERATED',
  "executiveSummary" JSONB NOT NULL,
  "fullInterpretation" JSONB NOT NULL,
  "riskLevel" "ClinicalRiskLevel" NOT NULL,
  "primaryDiagnosis" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "clinicalUrgency" TEXT NOT NULL,
  "aiConfidence" DOUBLE PRECISION NOT NULL,
  "acquisitionQuality" TEXT NOT NULL,
  "clinicalIndication" TEXT,
  "overallImpression" TEXT NOT NULL,
  "emergencyWarning" TEXT,
  "clinicalFlags" "ClinicalReportFlagType"[],
  "generatedById" TEXT,
  "sourceEngineVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalGeneratedReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalRecommendation" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "category" "ClinicalRecommendationCategory" NOT NULL,
  "priority" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "rationale" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalFinding" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalExplanation" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "findingCode" TEXT,
  "whyText" TEXT NOT NULL,
  "howText" TEXT NOT NULL,
  "supportingEvidence" TEXT[],
  "clinicalReferences" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalExplanation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalGeneratedReport_reportGroupId_versionNumber_key" ON "ClinicalGeneratedReport"("reportGroupId", "versionNumber");
CREATE INDEX "ClinicalGeneratedReport_caseId_idx" ON "ClinicalGeneratedReport"("caseId");
CREATE INDEX "ClinicalGeneratedReport_patientId_idx" ON "ClinicalGeneratedReport"("patientId");
CREATE INDEX "ClinicalGeneratedReport_reportGroupId_idx" ON "ClinicalGeneratedReport"("reportGroupId");
CREATE INDEX "ClinicalGeneratedReport_riskLevel_idx" ON "ClinicalGeneratedReport"("riskLevel");
CREATE INDEX "ClinicalGeneratedReport_createdAt_idx" ON "ClinicalGeneratedReport"("createdAt");

CREATE INDEX "ClinicalRecommendation_reportId_idx" ON "ClinicalRecommendation"("reportId");
CREATE INDEX "ClinicalRecommendation_category_idx" ON "ClinicalRecommendation"("category");

CREATE INDEX "ClinicalFinding_reportId_idx" ON "ClinicalFinding"("reportId");
CREATE INDEX "ClinicalFinding_code_idx" ON "ClinicalFinding"("code");
CREATE INDEX "ClinicalFinding_severity_idx" ON "ClinicalFinding"("severity");

CREATE INDEX "ClinicalExplanation_reportId_idx" ON "ClinicalExplanation"("reportId");
CREATE INDEX "ClinicalExplanation_findingCode_idx" ON "ClinicalExplanation"("findingCode");

ALTER TABLE "ClinicalGeneratedReport" ADD CONSTRAINT "ClinicalGeneratedReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalGeneratedReport" ADD CONSTRAINT "ClinicalGeneratedReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalGeneratedReport" ADD CONSTRAINT "ClinicalGeneratedReport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicalRecommendation" ADD CONSTRAINT "ClinicalRecommendation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ClinicalGeneratedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalFinding" ADD CONSTRAINT "ClinicalFinding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ClinicalGeneratedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalExplanation" ADD CONSTRAINT "ClinicalExplanation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ClinicalGeneratedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
