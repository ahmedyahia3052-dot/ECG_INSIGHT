CREATE TYPE "OrganizationType" AS ENUM ('HOSPITAL', 'CLINIC', 'COMPANY', 'CONTRACTOR', 'GOVERNMENT', 'OTHER');
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "SmokingStatus" AS ENUM ('NEVER', 'FORMER', 'CURRENT', 'UNKNOWN');
CREATE TYPE "ProcedureType" AS ENUM ('CORONARY_ANGIOGRAPHY', 'PCI_STENTS', 'CABG', 'VALVE_SURGERY', 'PACEMAKER', 'ICD', 'ABLATION', 'OPEN_HEART_SURGERY');
CREATE TYPE "DocumentCategory" AS ENUM ('ECG', 'ECHOCARDIOGRAPHY', 'STRESS_ECG', 'HOLTER', 'CARDIAC_CT', 'CARDIAC_MRI', 'ANGIOGRAPHY', 'CATH_REPORTS', 'LABORATORY_RESULTS', 'SURGERY_REPORTS', 'DISCHARGE_SUMMARY', 'OTHER');
CREATE TYPE "TimelineEventType" AS ENUM ('ECG_UPLOADED', 'AI_ANALYSIS_COMPLETED', 'ECHO_UPLOADED', 'PROCEDURE_ADDED', 'SURGERY_ADDED', 'CLINICAL_NOTE_ADDED', 'DOCUMENT_UPLOADED', 'FITNESS_DECISION_ADDED');
CREATE TYPE "FitnessDecisionValue" AS ENUM ('FIT', 'FIT_WITH_RESTRICTIONS', 'TEMPORARILY_UNFIT', 'PERMANENTLY_UNFIT', 'REFER_TO_CARDIOLOGIST');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROCEDURE_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FITNESS_DECISION_ADDED';

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL DEFAULT 'COMPANY',
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "logo" TEXT,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contractor" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Patient"
  ADD COLUMN "employeeId" TEXT,
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "contractorId" TEXT,
  ADD COLUMN "occupation" TEXT,
  ADD COLUMN "hireDate" TIMESTAMP(3),
  ADD COLUMN "smokingStatus" "SmokingStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "hypertension" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "diabetes" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dyslipidemia" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "obesity" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "familyHistory" TEXT;

CREATE TABLE "CardiacHistory" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "coronaryArteryDisease" BOOLEAN NOT NULL DEFAULT false,
  "heartFailure" BOOLEAN NOT NULL DEFAULT false,
  "arrhythmia" BOOLEAN NOT NULL DEFAULT false,
  "valvularDisease" BOOLEAN NOT NULL DEFAULT false,
  "congenitalHeartDisease" BOOLEAN NOT NULL DEFAULT false,
  "myocardialInfarctionHistory" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardiacHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcedureHistory" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "procedureType" "ProcedureType" NOT NULL,
  "procedureDate" TIMESTAMP(3) NOT NULL,
  "hospital" TEXT,
  "notes" TEXT,
  "attachments" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcedureHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalDocument" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "caseId" TEXT,
  "category" "DocumentCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimelineEvent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "caseId" TEXT,
  "type" "TimelineEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FitnessDecision" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "decision" "FitnessDecisionValue" NOT NULL,
  "restrictions" TEXT,
  "notes" TEXT,
  "decidedById" TEXT NOT NULL,
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FitnessDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Organization_name_idx" ON "Organization"("name");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");
CREATE UNIQUE INDEX "Department_organizationId_name_key" ON "Department"("organizationId", "name");

CREATE INDEX "Contractor_organizationId_idx" ON "Contractor"("organizationId");
CREATE UNIQUE INDEX "Contractor_organizationId_name_key" ON "Contractor"("organizationId", "name");

CREATE INDEX "Patient_employeeId_idx" ON "Patient"("employeeId");
CREATE INDEX "Patient_organizationId_idx" ON "Patient"("organizationId");
CREATE INDEX "Patient_departmentId_idx" ON "Patient"("departmentId");
CREATE INDEX "Patient_contractorId_idx" ON "Patient"("contractorId");
CREATE UNIQUE INDEX "Patient_organizationId_employeeId_key" ON "Patient"("organizationId", "employeeId");

CREATE UNIQUE INDEX "CardiacHistory_patientId_key" ON "CardiacHistory"("patientId");

CREATE INDEX "ProcedureHistory_patientId_idx" ON "ProcedureHistory"("patientId");
CREATE INDEX "ProcedureHistory_procedureType_idx" ON "ProcedureHistory"("procedureType");
CREATE INDEX "ProcedureHistory_procedureDate_idx" ON "ProcedureHistory"("procedureDate");

CREATE INDEX "ClinicalDocument_patientId_idx" ON "ClinicalDocument"("patientId");
CREATE INDEX "ClinicalDocument_caseId_idx" ON "ClinicalDocument"("caseId");
CREATE INDEX "ClinicalDocument_category_idx" ON "ClinicalDocument"("category");
CREATE INDEX "ClinicalDocument_createdAt_idx" ON "ClinicalDocument"("createdAt");

CREATE INDEX "TimelineEvent_patientId_idx" ON "TimelineEvent"("patientId");
CREATE INDEX "TimelineEvent_caseId_idx" ON "TimelineEvent"("caseId");
CREATE INDEX "TimelineEvent_type_idx" ON "TimelineEvent"("type");
CREATE INDEX "TimelineEvent_createdAt_idx" ON "TimelineEvent"("createdAt");

CREATE INDEX "FitnessDecision_patientId_idx" ON "FitnessDecision"("patientId");
CREATE INDEX "FitnessDecision_decision_idx" ON "FitnessDecision"("decision");
CREATE INDEX "FitnessDecision_createdAt_idx" ON "FitnessDecision"("createdAt");

ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contractor" ADD CONSTRAINT "Contractor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CardiacHistory" ADD CONSTRAINT "CardiacHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcedureHistory" ADD CONSTRAINT "ProcedureHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalDocument" ADD CONSTRAINT "ClinicalDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalDocument" ADD CONSTRAINT "ClinicalDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FitnessDecision" ADD CONSTRAINT "FitnessDecision_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FitnessDecision" ADD CONSTRAINT "FitnessDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
