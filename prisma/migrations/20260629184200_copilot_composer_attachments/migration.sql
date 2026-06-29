CREATE TABLE IF NOT EXISTS "CopilotAttachment" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT,
  "messageId" TEXT,
  "userId" TEXT NOT NULL,
  "patientId" TEXT,
  "caseId" TEXT,
  "kind" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopilotAttachment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopilotAttachment_conversationId_fkey') THEN
    ALTER TABLE "CopilotAttachment"
      ADD CONSTRAINT "CopilotAttachment_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "CopilotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopilotAttachment_messageId_fkey') THEN
    ALTER TABLE "CopilotAttachment"
      ADD CONSTRAINT "CopilotAttachment_messageId_fkey"
      FOREIGN KEY ("messageId") REFERENCES "CopilotMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CopilotAttachment_conversationId_idx" ON "CopilotAttachment"("conversationId");
CREATE INDEX IF NOT EXISTS "CopilotAttachment_messageId_idx" ON "CopilotAttachment"("messageId");
CREATE INDEX IF NOT EXISTS "CopilotAttachment_userId_idx" ON "CopilotAttachment"("userId");
CREATE INDEX IF NOT EXISTS "CopilotAttachment_patientId_idx" ON "CopilotAttachment"("patientId");
CREATE INDEX IF NOT EXISTS "CopilotAttachment_caseId_idx" ON "CopilotAttachment"("caseId");
CREATE INDEX IF NOT EXISTS "CopilotAttachment_kind_idx" ON "CopilotAttachment"("kind");
CREATE INDEX IF NOT EXISTS "CopilotAttachment_createdAt_idx" ON "CopilotAttachment"("createdAt");
