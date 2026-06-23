CREATE TYPE "TrendMetric" AS ENUM ('EF', 'HEART_RATE', 'QTC', 'BLOOD_PRESSURE', 'WEIGHT');
CREATE TYPE "RiskAssessmentType" AS ENUM ('SUDDEN_CARDIAC_DEATH', 'MAJOR_CARDIAC_EVENT', 'OCCUPATIONAL_UNFITNESS', 'ARRHYTHMIA');
CREATE TYPE "ClinicalDecisionAlertType" AS ENUM ('EF_BELOW_35', 'NEW_STEMI', 'LONG_QT', 'CRITICAL_ARRHYTHMIA', 'EXPIRING_CERTIFICATE');
CREATE TYPE "ClinicalDecisionAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CLINICAL_CONVERSATION_CREATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'PATIENT_TREND_RECORDED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'RISK_ASSESSMENT_COMPLETED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINICAL_CONVERSATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PATIENT_TREND_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RISK_ASSESSMENT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLINICAL_DECISION_ALERT_CREATED';

CREATE TABLE "ClinicalConversation" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientTrend" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "metric" "TrendMetric" NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "measuredAt" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientTrend_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskAssessment" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "riskType" "RiskAssessmentType" NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "riskLevel" "AISeverity" NOT NULL,
  "reasoning" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "references" TEXT[],
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalAlert" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "organizationId" TEXT,
  "departmentId" TEXT,
  "contractorCompanyId" TEXT,
  "alertType" "ClinicalDecisionAlertType" NOT NULL,
  "status" "ClinicalDecisionAlertStatus" NOT NULL DEFAULT 'OPEN',
  "severity" "AISeverity" NOT NULL DEFAULT 'SEVERE',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "reasoning" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "references" TEXT[],
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "createdById" TEXT NOT NULL,
  "acknowledgedById" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClinicalConversation_patientId_idx" ON "ClinicalConversation"("patientId");
CREATE INDEX "ClinicalConversation_userId_idx" ON "ClinicalConversation"("userId");
CREATE INDEX "ClinicalConversation_createdAt_idx" ON "ClinicalConversation"("createdAt");
CREATE INDEX "PatientTrend_patientId_idx" ON "PatientTrend"("patientId");
CREATE INDEX "PatientTrend_metric_idx" ON "PatientTrend"("metric");
CREATE INDEX "PatientTrend_measuredAt_idx" ON "PatientTrend"("measuredAt");
CREATE INDEX "RiskAssessment_patientId_idx" ON "RiskAssessment"("patientId");
CREATE INDEX "RiskAssessment_userId_idx" ON "RiskAssessment"("userId");
CREATE INDEX "RiskAssessment_riskType_idx" ON "RiskAssessment"("riskType");
CREATE INDEX "RiskAssessment_riskLevel_idx" ON "RiskAssessment"("riskLevel");
CREATE INDEX "RiskAssessment_createdAt_idx" ON "RiskAssessment"("createdAt");
CREATE INDEX "ClinicalAlert_patientId_idx" ON "ClinicalAlert"("patientId");
CREATE INDEX "ClinicalAlert_organizationId_idx" ON "ClinicalAlert"("organizationId");
CREATE INDEX "ClinicalAlert_departmentId_idx" ON "ClinicalAlert"("departmentId");
CREATE INDEX "ClinicalAlert_contractorCompanyId_idx" ON "ClinicalAlert"("contractorCompanyId");
CREATE INDEX "ClinicalAlert_alertType_idx" ON "ClinicalAlert"("alertType");
CREATE INDEX "ClinicalAlert_status_idx" ON "ClinicalAlert"("status");
CREATE INDEX "ClinicalAlert_severity_idx" ON "ClinicalAlert"("severity");
CREATE INDEX "ClinicalAlert_createdAt_idx" ON "ClinicalAlert"("createdAt");

ALTER TABLE "ClinicalConversation" ADD CONSTRAINT "ClinicalConversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalConversation" ADD CONSTRAINT "ClinicalConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientTrend" ADD CONSTRAINT "PatientTrend_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_contractorCompanyId_fkey" FOREIGN KEY ("contractorCompanyId") REFERENCES "ContractorCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
