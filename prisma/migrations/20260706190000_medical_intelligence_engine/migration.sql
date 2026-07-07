-- Medical Intelligence Engine — additive-only migration
-- Safe: no drops, no renames, no column type changes on existing tables

-- CreateEnum
CREATE TYPE "MedicalConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MedicalReportSeverity" AS ENUM ('NORMAL', 'MINOR', 'ABNORMAL', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MedicalReportUrgency" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENT', 'CRITICAL');

-- CreateTable
CREATE TABLE "MedicalKnowledgeBaseEntry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "diagnosticCriteria" TEXT[],
    "ecgCharacteristics" TEXT[],
    "measurements" TEXT[],
    "differentialDiagnosis" TEXT[],
    "pitfalls" TEXT[],
    "clinicalNotes" TEXT[],
    "guidelineReferences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalKnowledgeBaseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRuleDefinition" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "criteriaJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRuleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalIntelligenceReport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "patientId" TEXT,
    "evaluatedById" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "primaryDiagnosisCode" TEXT,
    "primaryDiagnosisLabel" TEXT NOT NULL,
    "overallSeverity" "MedicalReportSeverity" NOT NULL,
    "overallUrgency" "MedicalReportUrgency" NOT NULL,
    "overallConfidenceLevel" "MedicalConfidenceLevel" NOT NULL,
    "overallConfidenceScore" DOUBLE PRECISION NOT NULL,
    "reportJson" JSONB NOT NULL,
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "criticalFindingsCount" INTEGER NOT NULL DEFAULT 0,
    "explainabilitySummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalIntelligenceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDiagnosisFinding" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "diagnosisCode" TEXT NOT NULL,
    "diagnosisLabel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "MedicalReportSeverity" NOT NULL,
    "urgency" "MedicalReportUrgency" NOT NULL,
    "confidenceLevel" "MedicalConfidenceLevel" NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "explainabilityJson" JSONB NOT NULL,
    "differentialJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalDiagnosisFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalKnowledgeBaseEntry_code_key" ON "MedicalKnowledgeBaseEntry"("code");

-- CreateIndex
CREATE INDEX "MedicalKnowledgeBaseEntry_category_idx" ON "MedicalKnowledgeBaseEntry"("category");

-- CreateIndex
CREATE INDEX "MedicalKnowledgeBaseEntry_label_idx" ON "MedicalKnowledgeBaseEntry"("label");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRuleDefinition_ruleId_key" ON "MedicalRuleDefinition"("ruleId");

-- CreateIndex
CREATE INDEX "MedicalRuleDefinition_category_idx" ON "MedicalRuleDefinition"("category");

-- CreateIndex
CREATE INDEX "MedicalRuleDefinition_enabled_idx" ON "MedicalRuleDefinition"("enabled");

-- CreateIndex
CREATE INDEX "MedicalIntelligenceReport_caseId_idx" ON "MedicalIntelligenceReport"("caseId");

-- CreateIndex
CREATE INDEX "MedicalIntelligenceReport_patientId_idx" ON "MedicalIntelligenceReport"("patientId");

-- CreateIndex
CREATE INDEX "MedicalIntelligenceReport_evaluatedById_idx" ON "MedicalIntelligenceReport"("evaluatedById");

-- CreateIndex
CREATE INDEX "MedicalIntelligenceReport_primaryDiagnosisCode_idx" ON "MedicalIntelligenceReport"("primaryDiagnosisCode");

-- CreateIndex
CREATE INDEX "MedicalIntelligenceReport_overallSeverity_idx" ON "MedicalIntelligenceReport"("overallSeverity");

-- CreateIndex
CREATE INDEX "MedicalIntelligenceReport_createdAt_idx" ON "MedicalIntelligenceReport"("createdAt");

-- CreateIndex
CREATE INDEX "MedicalDiagnosisFinding_reportId_idx" ON "MedicalDiagnosisFinding"("reportId");

-- CreateIndex
CREATE INDEX "MedicalDiagnosisFinding_diagnosisCode_idx" ON "MedicalDiagnosisFinding"("diagnosisCode");

-- CreateIndex
CREATE INDEX "MedicalDiagnosisFinding_severity_idx" ON "MedicalDiagnosisFinding"("severity");

-- AddForeignKey
ALTER TABLE "MedicalIntelligenceReport" ADD CONSTRAINT "MedicalIntelligenceReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalIntelligenceReport" ADD CONSTRAINT "MedicalIntelligenceReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalIntelligenceReport" ADD CONSTRAINT "MedicalIntelligenceReport_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDiagnosisFinding" ADD CONSTRAINT "MedicalDiagnosisFinding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MedicalIntelligenceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
