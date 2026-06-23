CREATE TYPE "WorkCategory" AS ENUM ('ADMINISTRATIVE', 'LIGHT', 'MODERATE', 'HEAVY', 'SAFETY_CRITICAL', 'OFFSHORE', 'EMERGENCY_RESPONSE');
CREATE TYPE "OccupationalFitnessDecision" AS ENUM ('FIT_FOR_WORK', 'FIT_WITH_RESTRICTIONS', 'TEMPORARILY_UNFIT', 'PERMANENTLY_UNFIT', 'SPECIALIST_REVIEW_REQUIRED');
CREATE TYPE "RestrictionType" AS ENUM ('NO_WORK_AT_HEIGHT', 'NO_DRIVING', 'NO_CONFINED_SPACE', 'NO_NIGHT_SHIFTS', 'NO_OFFSHORE_DUTY', 'SEDENTARY_WORK_ONLY', 'NO_HEAVY_EQUIPMENT', 'NO_EMERGENCY_RESPONSE');

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'FITNESS_ASSESSMENT_COMPLETED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'WORK_RESTRICTION_ADDED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'RETURN_TO_WORK_DECISION_ADDED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FITNESS_ASSESSMENT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WORK_RESTRICTION_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RETURN_TO_WORK_DECISION_ADDED';

ALTER TABLE "Employee"
  ADD COLUMN "workCategory" "WorkCategory" NOT NULL DEFAULT 'MODERATE',
  ADD COLUMN "criticalJob" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shiftWorker" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "drivingDuty" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "workAtHeight" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "confinedSpace" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "heavyEquipmentOperator" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "offshoreWorker" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "firefighter" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emergencyResponder" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ClinicalReport" ADD COLUMN "occupationalReportSection" JSONB;

CREATE TABLE "OccupationalRiskProfile" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "smoking" BOOLEAN NOT NULL DEFAULT false,
  "diabetes" BOOLEAN NOT NULL DEFAULT false,
  "hypertension" BOOLEAN NOT NULL DEFAULT false,
  "dyslipidemia" BOOLEAN NOT NULL DEFAULT false,
  "obesity" BOOLEAN NOT NULL DEFAULT false,
  "familyHistory" BOOLEAN NOT NULL DEFAULT false,
  "previousMI" BOOLEAN NOT NULL DEFAULT false,
  "previousStroke" BOOLEAN NOT NULL DEFAULT false,
  "occupationalExposure" JSONB,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "highRisk" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OccupationalRiskProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FitnessAssessment" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "patientId" TEXT,
  "assessedById" TEXT NOT NULL,
  "finalDecision" "OccupationalFitnessDecision" NOT NULL,
  "recommendation" "OccupationalFitnessDecision" NOT NULL,
  "reviewDate" TIMESTAMP(3),
  "physicianJustification" TEXT NOT NULL,
  "occupationalReportSection" JSONB NOT NULL,
  "inputSummary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FitnessAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkRestriction" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "patientId" TEXT,
  "assessmentId" TEXT,
  "type" "RestrictionType" NOT NULL,
  "description" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkRestriction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnToWorkDecision" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "patientId" TEXT,
  "assessmentId" TEXT,
  "decision" "OccupationalFitnessDecision" NOT NULL,
  "reviewDate" TIMESTAMP(3),
  "physicianJustification" TEXT NOT NULL,
  "decidedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnToWorkDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OccupationalRiskProfile_employeeId_key" ON "OccupationalRiskProfile"("employeeId");
CREATE INDEX "OccupationalRiskProfile_highRisk_idx" ON "OccupationalRiskProfile"("highRisk");
CREATE INDEX "OccupationalRiskProfile_riskScore_idx" ON "OccupationalRiskProfile"("riskScore");

CREATE INDEX "FitnessAssessment_employeeId_idx" ON "FitnessAssessment"("employeeId");
CREATE INDEX "FitnessAssessment_patientId_idx" ON "FitnessAssessment"("patientId");
CREATE INDEX "FitnessAssessment_finalDecision_idx" ON "FitnessAssessment"("finalDecision");
CREATE INDEX "FitnessAssessment_createdAt_idx" ON "FitnessAssessment"("createdAt");

CREATE INDEX "WorkRestriction_employeeId_idx" ON "WorkRestriction"("employeeId");
CREATE INDEX "WorkRestriction_patientId_idx" ON "WorkRestriction"("patientId");
CREATE INDEX "WorkRestriction_assessmentId_idx" ON "WorkRestriction"("assessmentId");
CREATE INDEX "WorkRestriction_type_idx" ON "WorkRestriction"("type");
CREATE INDEX "WorkRestriction_active_idx" ON "WorkRestriction"("active");

CREATE INDEX "ReturnToWorkDecision_employeeId_idx" ON "ReturnToWorkDecision"("employeeId");
CREATE INDEX "ReturnToWorkDecision_patientId_idx" ON "ReturnToWorkDecision"("patientId");
CREATE INDEX "ReturnToWorkDecision_assessmentId_idx" ON "ReturnToWorkDecision"("assessmentId");
CREATE INDEX "ReturnToWorkDecision_decision_idx" ON "ReturnToWorkDecision"("decision");
CREATE INDEX "ReturnToWorkDecision_createdAt_idx" ON "ReturnToWorkDecision"("createdAt");

CREATE INDEX "Employee_workCategory_idx" ON "Employee"("workCategory");
CREATE INDEX "Employee_criticalJob_idx" ON "Employee"("criticalJob");

ALTER TABLE "OccupationalRiskProfile" ADD CONSTRAINT "OccupationalRiskProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FitnessAssessment" ADD CONSTRAINT "FitnessAssessment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FitnessAssessment" ADD CONSTRAINT "FitnessAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FitnessAssessment" ADD CONSTRAINT "FitnessAssessment_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkRestriction" ADD CONSTRAINT "WorkRestriction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkRestriction" ADD CONSTRAINT "WorkRestriction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkRestriction" ADD CONSTRAINT "WorkRestriction_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "FitnessAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToWorkDecision" ADD CONSTRAINT "ReturnToWorkDecision_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnToWorkDecision" ADD CONSTRAINT "ReturnToWorkDecision_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToWorkDecision" ADD CONSTRAINT "ReturnToWorkDecision_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "FitnessAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToWorkDecision" ADD CONSTRAINT "ReturnToWorkDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
