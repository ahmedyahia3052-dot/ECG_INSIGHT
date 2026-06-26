CREATE TYPE "OccupationalRiskProfileType" AS ENUM (
  'DRIVER',
  'CRANE_OPERATOR',
  'HEAVY_EQUIPMENT_OPERATOR',
  'WORK_AT_HEIGHTS',
  'CONFINED_SPACES',
  'OFFICE_WORKER',
  'FOOD_HANDLER',
  'CUSTOM'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMPANY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMPANY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMPANY_DELETED';

CREATE TABLE "Company" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "registrationNumber" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Department" ADD COLUMN "companyId" TEXT;
ALTER TABLE "ContractorCompany" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "workLocation" TEXT;
ALTER TABLE "Employee" ADD COLUMN "riskCategory" TEXT;
ALTER TABLE "Employee" ADD COLUMN "medicalRestrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Patient" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "workLocation" TEXT;
ALTER TABLE "Patient" ADD COLUMN "riskCategory" TEXT;
ALTER TABLE "Patient" ADD COLUMN "fitnessStatus" TEXT;
ALTER TABLE "Patient" ADD COLUMN "medicalRestrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "OccupationalRiskProfile" ADD COLUMN "profileType" "OccupationalRiskProfileType" NOT NULL DEFAULT 'OFFICE_WORKER';
ALTER TABLE "OccupationalRiskProfile" ADD COLUMN "customProfileName" TEXT;

CREATE INDEX "Company_organizationId_idx" ON "Company"("organizationId");
CREATE INDEX "Company_status_idx" ON "Company"("status");
CREATE UNIQUE INDEX "Company_organizationId_name_key" ON "Company"("organizationId", "name");
CREATE INDEX "Department_companyId_idx" ON "Department"("companyId");
CREATE INDEX "ContractorCompany_companyId_idx" ON "ContractorCompany"("companyId");
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");
CREATE INDEX "Patient_companyId_idx" ON "Patient"("companyId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractorCompany" ADD CONSTRAINT "ContractorCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
