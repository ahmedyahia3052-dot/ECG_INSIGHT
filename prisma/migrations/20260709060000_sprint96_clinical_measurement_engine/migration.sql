-- Sprint 96 — Clinical Measurement Engine

CREATE TYPE "ClinicalMeasurementSource" AS ENUM ('AUTO', 'MANUAL', 'HYBRID');

CREATE TABLE "ClinicalMeasurementRecord" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdById" TEXT,
    "source" "ClinicalMeasurementSource" NOT NULL DEFAULT 'AUTO',
    "heartRate" INTEGER,
    "rrIntervalMs" INTEGER,
    "prIntervalMs" INTEGER,
    "qrsDurationMs" INTEGER,
    "qtIntervalMs" INTEGER,
    "qtcIntervalMs" INTEGER,
    "pDurationMs" INTEGER,
    "stLevelMm" DOUBLE PRECISION,
    "tWaveDurationMs" INTEGER,
    "pAxisDeg" DOUBLE PRECISION,
    "qrsAxisDeg" DOUBLE PRECISION,
    "tAxisDeg" DOUBLE PRECISION,
    "electricalAxisDeg" DOUBLE PRECISION,
    "calipersJson" JSONB,
    "autoDetailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalMeasurementRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClinicalMeasurementRecord_caseId_idx" ON "ClinicalMeasurementRecord"("caseId");
CREATE INDEX "ClinicalMeasurementRecord_caseId_createdAt_idx" ON "ClinicalMeasurementRecord"("caseId", "createdAt");
CREATE INDEX "ClinicalMeasurementRecord_source_idx" ON "ClinicalMeasurementRecord"("source");

ALTER TABLE "ClinicalMeasurementRecord" ADD CONSTRAINT "ClinicalMeasurementRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalMeasurementRecord" ADD CONSTRAINT "ClinicalMeasurementRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
