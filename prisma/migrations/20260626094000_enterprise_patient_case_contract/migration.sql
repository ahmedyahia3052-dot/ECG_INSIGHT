ALTER TABLE "Patient"
  ADD COLUMN IF NOT EXISTS "cardiovascularHistory" TEXT;

ALTER TABLE "ECGCase"
  ADD COLUMN IF NOT EXISTS "aiModelVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "explainabilityData" JSONB;
