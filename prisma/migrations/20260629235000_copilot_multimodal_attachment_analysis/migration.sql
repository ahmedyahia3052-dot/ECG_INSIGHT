ALTER TABLE "CopilotAttachment"
  ADD COLUMN IF NOT EXISTS "documentType" TEXT,
  ADD COLUMN IF NOT EXISTS "extractedText" TEXT,
  ADD COLUMN IF NOT EXISTS "analysisSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "medicalAnalysis" JSONB,
  ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "warnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "recommendations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "CopilotAttachment_documentType_idx" ON "CopilotAttachment"("documentType");
