ALTER TABLE "CopilotConversation"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CopilotConversation_deletedAt_idx" ON "CopilotConversation"("deletedAt");
