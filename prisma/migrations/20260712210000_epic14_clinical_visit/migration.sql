-- Epic 14: ClinicalVisit model + ECGCase.visitId

CREATE TYPE "ClinicalVisitStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "ClinicalVisit" (
    "id" TEXT NOT NULL,
    "visitNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT,
    "reason" TEXT,
    "status" "ClinicalVisitStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalVisit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalVisit_visitNumber_key" ON "ClinicalVisit"("visitNumber");
CREATE INDEX "ClinicalVisit_patientId_createdAt_idx" ON "ClinicalVisit"("patientId", "createdAt");
CREATE INDEX "ClinicalVisit_organizationId_idx" ON "ClinicalVisit"("organizationId");
CREATE INDEX "ClinicalVisit_status_idx" ON "ClinicalVisit"("status");

ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ECGCase" ADD COLUMN "visitId" TEXT;
CREATE INDEX "ECGCase_visitId_idx" ON "ECGCase"("visitId");
ALTER TABLE "ECGCase" ADD CONSTRAINT "ECGCase_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicalVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
