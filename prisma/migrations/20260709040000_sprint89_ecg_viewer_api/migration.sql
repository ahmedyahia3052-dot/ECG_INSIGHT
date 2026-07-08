-- Sprint 89 — ECG Viewer Backend API

CREATE TABLE IF NOT EXISTS "EcgViewerPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "defaultZoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "zoomPresets" JSONB NOT NULL DEFAULT '[0.5,1,2,4,8,16]',
  "gainMmPerMv" INTEGER NOT NULL DEFAULT 10,
  "paperSpeedMmSec" INTEGER NOT NULL DEFAULT 25,
  "layoutJson" JSONB,
  "overlayDefaults" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcgViewerPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EcgViewerPreference_userId_key" ON "EcgViewerPreference"("userId");
CREATE INDEX IF NOT EXISTS "EcgViewerPreference_userId_idx" ON "EcgViewerPreference"("userId");

CREATE TABLE IF NOT EXISTS "EcgPhysicianAnnotation" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "ecgFileId" TEXT,
  "authorId" TEXT NOT NULL,
  "lead" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "geometry" JSONB NOT NULL,
  "label" TEXT,
  "color" TEXT,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcgPhysicianAnnotation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EcgPhysicianAnnotation_caseId_idx" ON "EcgPhysicianAnnotation"("caseId");
CREATE INDEX IF NOT EXISTS "EcgPhysicianAnnotation_authorId_idx" ON "EcgPhysicianAnnotation"("authorId");
CREATE INDEX IF NOT EXISTS "EcgPhysicianAnnotation_ecgFileId_idx" ON "EcgPhysicianAnnotation"("ecgFileId");
CREATE INDEX IF NOT EXISTS "EcgPhysicianAnnotation_lead_idx" ON "EcgPhysicianAnnotation"("lead");

CREATE TABLE IF NOT EXISTS "EcgViewerCaseOverlay" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcgViewerCaseOverlay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EcgViewerCaseOverlay_caseId_key" ON "EcgViewerCaseOverlay"("caseId");
CREATE INDEX IF NOT EXISTS "EcgViewerCaseOverlay_caseId_idx" ON "EcgViewerCaseOverlay"("caseId");

ALTER TABLE "EcgViewerPreference" DROP CONSTRAINT IF EXISTS "EcgViewerPreference_userId_fkey";
ALTER TABLE "EcgViewerPreference" ADD CONSTRAINT "EcgViewerPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EcgPhysicianAnnotation" DROP CONSTRAINT IF EXISTS "EcgPhysicianAnnotation_caseId_fkey";
ALTER TABLE "EcgPhysicianAnnotation" ADD CONSTRAINT "EcgPhysicianAnnotation_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EcgPhysicianAnnotation" DROP CONSTRAINT IF EXISTS "EcgPhysicianAnnotation_authorId_fkey";
ALTER TABLE "EcgPhysicianAnnotation" ADD CONSTRAINT "EcgPhysicianAnnotation_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EcgViewerCaseOverlay" DROP CONSTRAINT IF EXISTS "EcgViewerCaseOverlay_caseId_fkey";
ALTER TABLE "EcgViewerCaseOverlay" ADD CONSTRAINT "EcgViewerCaseOverlay_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
