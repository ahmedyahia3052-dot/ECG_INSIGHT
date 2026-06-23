CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED', 'TERMINATED', 'ON_LEAVE');
CREATE TYPE "MedicalFitnessStatus" AS ENUM ('FIT', 'FIT_WITH_RESTRICTIONS', 'TEMPORARILY_UNFIT', 'PERMANENTLY_UNFIT', 'REFER_TO_CARDIOLOGIST', 'UNKNOWN');

CREATE TABLE "ContractorCompany" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractorCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Employee" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "contractorCompanyId" TEXT,
  "employeeId" TEXT NOT NULL,
  "nationalId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
  "dateOfBirth" TIMESTAMP(3) NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "jobTitle" TEXT,
  "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "hiringDate" TIMESTAMP(3),
  "retirementDate" TIMESTAMP(3),
  "medicalFitnessStatus" "MedicalFitnessStatus" NOT NULL DEFAULT 'UNKNOWN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Patient"
  ADD COLUMN "employeeProfileId" TEXT,
  ADD COLUMN "contractorCompanyId" TEXT;

CREATE INDEX "ContractorCompany_organizationId_idx" ON "ContractorCompany"("organizationId");
CREATE INDEX "ContractorCompany_status_idx" ON "ContractorCompany"("status");
CREATE UNIQUE INDEX "ContractorCompany_organizationId_name_key" ON "ContractorCompany"("organizationId", "name");

CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");
CREATE INDEX "Employee_contractorCompanyId_idx" ON "Employee"("contractorCompanyId");
CREATE INDEX "Employee_employmentStatus_idx" ON "Employee"("employmentStatus");
CREATE INDEX "Employee_medicalFitnessStatus_idx" ON "Employee"("medicalFitnessStatus");
CREATE INDEX "Employee_nationalId_idx" ON "Employee"("nationalId");
CREATE UNIQUE INDEX "Employee_organizationId_employeeId_key" ON "Employee"("organizationId", "employeeId");
CREATE UNIQUE INDEX "Employee_nationalId_key" ON "Employee"("nationalId");

CREATE UNIQUE INDEX "Patient_employeeProfileId_key" ON "Patient"("employeeProfileId");
CREATE INDEX "Patient_contractorCompanyId_idx" ON "Patient"("contractorCompanyId");

ALTER TABLE "ContractorCompany" ADD CONSTRAINT "ContractorCompany_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_contractorCompanyId_fkey" FOREIGN KEY ("contractorCompanyId") REFERENCES "ContractorCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_contractorCompanyId_fkey" FOREIGN KEY ("contractorCompanyId") REFERENCES "ContractorCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
