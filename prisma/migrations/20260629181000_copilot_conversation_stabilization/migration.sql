ALTER TABLE  copilot_conversations
  ADD COLUMN isPinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN isFavorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN archivedAt TIMESTAMP(3),
  ADD COLUMN lastOpenedAt TIMESTAMP(3);

UPDATE copilot_conversations
SET isFavorite = favorite
WHERE favorite = true;

CREATE INDEX copilot_conversations_isPinned_idx ON copilot_conversations(isPinned);
CREATE INDEX copilot_conversations_isFavorite_idx ON copilot_conversations(isFavorite);
CREATE INDEX copilot_conversations_archivedAt_idx ON copilot_conversations(archivedAt);
CREATE INDEX copilot_conversations_lastOpenedAt_idx ON copilot_conversations(lastOpenedAt);