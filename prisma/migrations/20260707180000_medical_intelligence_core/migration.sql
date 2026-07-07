-- Sprint 40 — Medical Intelligence Core (MIC) normalized catalog
-- Additive-only migration

CREATE TABLE "MicDiagnosisEntry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "diagnosticCriteria" TEXT[],
    "typicalFindings" TEXT[],
    "clinicalSignificance" TEXT NOT NULL,
    "differentialDiagnosis" TEXT[],
    "possibleCauses" TEXT[],
    "associatedSymptoms" TEXT[],
    "severity" TEXT NOT NULL,
    "emergencyLevel" TEXT NOT NULL,
    "recommendedNextSteps" TEXT[],
    "references" JSONB NOT NULL,
    "icd10Code" TEXT,
    "snomedCode" TEXT,
    "libraryTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicDiagnosisEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MicArrhythmiaEntity" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diagnosisCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keyFeatures" TEXT[],
    "emergencyLevel" TEXT NOT NULL,
    "treatmentNotes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicArrhythmiaEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MicIschemiaEntity" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "territory" TEXT,
    "diagnosisCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedLeads" TEXT[],
    "stCriteria" TEXT[],
    "emergencyLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicIschemiaEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MicMeasurementReference" (
    "id" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "normalMin" DOUBLE PRECISION,
    "normalMax" DOUBLE PRECISION,
    "borderlineLow" DOUBLE PRECISION,
    "borderlineHigh" DOUBLE PRECISION,
    "notes" TEXT[],
    "hypertrophyCriteria" TEXT[],
    "references" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicMeasurementReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MicGuidelineEntry" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT,
    "year" INTEGER,
    "url" TEXT,
    "applicableCategories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicGuidelineEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MicRecommendationMapping" (
    "id" TEXT NOT NULL,
    "diagnosisCode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicRecommendationMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MicRiskRule" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "criteriaJson" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicRiskRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MicDiagnosisEntry_code_key" ON "MicDiagnosisEntry"("code");
CREATE INDEX "MicDiagnosisEntry_category_idx" ON "MicDiagnosisEntry"("category");
CREATE INDEX "MicDiagnosisEntry_name_idx" ON "MicDiagnosisEntry"("name");

CREATE UNIQUE INDEX "MicArrhythmiaEntity_code_key" ON "MicArrhythmiaEntity"("code");
CREATE INDEX "MicArrhythmiaEntity_diagnosisCode_idx" ON "MicArrhythmiaEntity"("diagnosisCode");

CREATE UNIQUE INDEX "MicIschemiaEntity_code_key" ON "MicIschemiaEntity"("code");
CREATE INDEX "MicIschemiaEntity_pattern_idx" ON "MicIschemiaEntity"("pattern");
CREATE INDEX "MicIschemiaEntity_diagnosisCode_idx" ON "MicIschemiaEntity"("diagnosisCode");

CREATE UNIQUE INDEX "MicMeasurementReference_parameter_key" ON "MicMeasurementReference"("parameter");

CREATE INDEX "MicGuidelineEntry_organization_idx" ON "MicGuidelineEntry"("organization");

CREATE INDEX "MicRecommendationMapping_diagnosisCode_idx" ON "MicRecommendationMapping"("diagnosisCode");
CREATE INDEX "MicRecommendationMapping_type_idx" ON "MicRecommendationMapping"("type");

CREATE UNIQUE INDEX "MicRiskRule_ruleId_key" ON "MicRiskRule"("ruleId");
CREATE INDEX "MicRiskRule_level_idx" ON "MicRiskRule"("level");
CREATE INDEX "MicRiskRule_enabled_idx" ON "MicRiskRule"("enabled");
