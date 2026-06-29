ALTER TABLE "CopilotConversation"
  ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastOpenedAt" TIMESTAMP(3);

UPDATE "CopilotConversation"
SET "isFavorite" = "favorite"
WHERE "favorite" = true;

CREATE INDEX IF NOT EXISTS "CopilotConversation_isPinned_idx" ON "CopilotConversation"("isPinned");
CREATE INDEX IF NOT EXISTS "CopilotConversation_isFavorite_idx" ON "CopilotConversation"("isFavorite");
CREATE INDEX IF NOT EXISTS "CopilotConversation_archivedAt_idx" ON "CopilotConversation"("archivedAt");
CREATE INDEX IF NOT EXISTS "CopilotConversation_lastOpenedAt_idx" ON "CopilotConversation"("lastOpenedAt");