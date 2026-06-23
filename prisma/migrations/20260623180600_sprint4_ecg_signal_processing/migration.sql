CREATE TYPE "SignalQuality" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

CREATE TABLE "ECGMeasurement" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "heartRate" INTEGER NOT NULL,
  "prInterval" INTEGER NOT NULL,
  "qrsDuration" INTEGER NOT NULL,
  "qtInterval" INTEGER NOT NULL,
  "qtcInterval" INTEGER NOT NULL,
  "stDeviation" DOUBLE PRECISION NOT NULL,
  "rhythmRegularity" DOUBLE PRECISION NOT NULL,
  "signalQuality" "SignalQuality" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECGMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ECGMeasurement_caseId_idx" ON "ECGMeasurement"("caseId");
CREATE INDEX "ECGMeasurement_signalQuality_idx" ON "ECGMeasurement"("signalQuality");
CREATE INDEX "ECGMeasurement_createdAt_idx" ON "ECGMeasurement"("createdAt");

ALTER TABLE "ECGMeasurement" ADD CONSTRAINT "ECGMeasurement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
