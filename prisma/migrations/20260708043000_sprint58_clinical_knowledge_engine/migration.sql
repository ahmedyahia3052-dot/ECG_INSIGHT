-- Sprint 58 — ECG Clinical Knowledge Engine

CREATE TYPE "EcgClinicalKnowledgeCategory" AS ENUM (
  'RHYTHM',
  'ARRHYTHMIA',
  'CONDUCTION',
  'ISCHEMIA',
  'ELECTROLYTE',
  'HYPERTROPHY',
  'CHANNELOPATHY',
  'OTHER'
);

CREATE TYPE "EcgClinicalKnowledgeSeverity" AS ENUM (
  'NORMAL',
  'MINOR',
  'ABNORMAL',
  'URGENT',
  'CRITICAL'
);

CREATE TYPE "EcgClinicalKnowledgeEmergencyLevel" AS ENUM (
  'ROUTINE',
  'URGENT',
  'EMERGENT',
  'CRITICAL'
);

CREATE TABLE "EcgClinicalKnowledgeDiagnosis" (
  "id" TEXT NOT NULL,
  "diagnosisId" TEXT NOT NULL,
  "clinicalName" TEXT NOT NULL,
  "category" "EcgClinicalKnowledgeCategory" NOT NULL,
  "severity" "EcgClinicalKnowledgeSeverity" NOT NULL,
  "emergencyLevel" "EcgClinicalKnowledgeEmergencyLevel" NOT NULL,
  "description" TEXT NOT NULL,
  "ecgCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "diagnosticFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "supportingLeads" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "differentialDiagnoses" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "recommendedNextTests" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "recommendedManagement" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "contraindications" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "clinicalNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "references" JSONB NOT NULL,
  "icd10Code" TEXT,
  "snomedCode" TEXT,
  "guidelineReferences" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcgClinicalKnowledgeDiagnosis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EcgClinicalKnowledgeDiagnosis_diagnosisId_key" ON "EcgClinicalKnowledgeDiagnosis"("diagnosisId");
CREATE INDEX "EcgClinicalKnowledgeDiagnosis_category_idx" ON "EcgClinicalKnowledgeDiagnosis"("category");
CREATE INDEX "EcgClinicalKnowledgeDiagnosis_severity_idx" ON "EcgClinicalKnowledgeDiagnosis"("severity");
CREATE INDEX "EcgClinicalKnowledgeDiagnosis_emergencyLevel_idx" ON "EcgClinicalKnowledgeDiagnosis"("emergencyLevel");
CREATE INDEX "EcgClinicalKnowledgeDiagnosis_clinicalName_idx" ON "EcgClinicalKnowledgeDiagnosis"("clinicalName");
CREATE INDEX "EcgClinicalKnowledgeDiagnosis_deletedAt_idx" ON "EcgClinicalKnowledgeDiagnosis"("deletedAt");
