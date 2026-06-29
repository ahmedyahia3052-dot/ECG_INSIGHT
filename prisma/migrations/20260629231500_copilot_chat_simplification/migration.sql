DELETE FROM "CopilotConversation"
WHERE "deletedAt" IS NOT NULL;

DROP INDEX IF EXISTS "CopilotConversation_favorite_idx";
DROP INDEX IF EXISTS "CopilotConversation_isPinned_idx";
DROP INDEX IF EXISTS "CopilotConversation_isFavorite_idx";
DROP INDEX IF EXISTS "CopilotConversation_archivedAt_idx";
DROP INDEX IF EXISTS "CopilotConversation_deletedAt_idx";
DROP INDEX IF EXISTS "CopilotConversation_lastOpenedAt_idx";

ALTER TABLE "CopilotConversation"
  DROP COLUMN IF EXISTS "favorite",
  DROP COLUMN IF EXISTS "isPinned",
  DROP COLUMN IF EXISTS "isFavorite",
  DROP COLUMN IF EXISTS "archivedAt",
  DROP COLUMN IF EXISTS "deletedAt",
  DROP COLUMN IF EXISTS "lastOpenedAt";
