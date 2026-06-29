CREATE TABLE IF NOT EXISTS "MedicalKnowledgeDocument" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "references" TEXT[],
  "tags" TEXT[],
  "searchText" TEXT NOT NULL,
  "embedding" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicalKnowledgeDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicalKnowledgeDocument_domain_title_key" ON "MedicalKnowledgeDocument"("domain", "title");
CREATE INDEX IF NOT EXISTS "MedicalKnowledgeDocument_domain_idx" ON "MedicalKnowledgeDocument"("domain");
CREATE INDEX IF NOT EXISTS "MedicalKnowledgeDocument_title_idx" ON "MedicalKnowledgeDocument"("title");
CREATE INDEX IF NOT EXISTS "MedicalKnowledgeDocument_sourceName_idx" ON "MedicalKnowledgeDocument"("sourceName");
CREATE INDEX IF NOT EXISTS "MedicalKnowledgeDocument_updatedAt_idx" ON "MedicalKnowledgeDocument"("updatedAt");
