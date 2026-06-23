CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'REJECTED');
CREATE TYPE "KnowledgeCategoryName" AS ENUM ('HYPERTENSION', 'ISCHEMIC_HEART_DISEASE', 'HEART_FAILURE', 'ARRHYTHMIAS', 'VALVULAR_DISEASE', 'CONGENITAL_DISEASE', 'CABG', 'PCI', 'PACEMAKERS', 'ICD', 'ANTICOAGULATION', 'OCCUPATIONAL_FITNESS');

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'DOCUMENT_EXTRACTED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'DOCUMENT_INDEXED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_EXTRACTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_INDEXED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KNOWLEDGE_ARTICLE_CREATED';

CREATE TABLE "DocumentExtraction" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "organizationId" TEXT,
  "rawText" TEXT NOT NULL,
  "aiSummary" TEXT NOT NULL,
  "diagnosis" TEXT,
  "recommendations" TEXT[],
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "extractedJson" JSONB NOT NULL,
  "reviewedById" TEXT,
  "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentExtraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentSearchIndex" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "organizationId" TEXT,
  "searchText" TEXT NOT NULL,
  "documentType" "DocumentCategory" NOT NULL,
  "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentSearchIndex_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeCategory" (
  "id" TEXT NOT NULL,
  "name" "KnowledgeCategoryName" NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeArticle" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "references" TEXT[],
  "attachments" TEXT[],
  "authorId" TEXT NOT NULL,
  "tags" TEXT[],
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentExtraction_documentId_key" ON "DocumentExtraction"("documentId");
CREATE INDEX "DocumentExtraction_patientId_idx" ON "DocumentExtraction"("patientId");
CREATE INDEX "DocumentExtraction_organizationId_idx" ON "DocumentExtraction"("organizationId");
CREATE INDEX "DocumentExtraction_reviewStatus_idx" ON "DocumentExtraction"("reviewStatus");
CREATE INDEX "DocumentExtraction_confidenceScore_idx" ON "DocumentExtraction"("confidenceScore");
CREATE INDEX "DocumentExtraction_createdAt_idx" ON "DocumentExtraction"("createdAt");

CREATE UNIQUE INDEX "DocumentSearchIndex_documentId_key" ON "DocumentSearchIndex"("documentId");
CREATE INDEX "DocumentSearchIndex_patientId_idx" ON "DocumentSearchIndex"("patientId");
CREATE INDEX "DocumentSearchIndex_organizationId_idx" ON "DocumentSearchIndex"("organizationId");
CREATE INDEX "DocumentSearchIndex_documentType_idx" ON "DocumentSearchIndex"("documentType");
CREATE INDEX "DocumentSearchIndex_indexedAt_idx" ON "DocumentSearchIndex"("indexedAt");

CREATE UNIQUE INDEX "KnowledgeCategory_name_key" ON "KnowledgeCategory"("name");
CREATE INDEX "KnowledgeArticle_categoryId_idx" ON "KnowledgeArticle"("categoryId");
CREATE INDEX "KnowledgeArticle_authorId_idx" ON "KnowledgeArticle"("authorId");
CREATE INDEX "KnowledgeArticle_createdAt_idx" ON "KnowledgeArticle"("createdAt");

ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ClinicalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentSearchIndex" ADD CONSTRAINT "DocumentSearchIndex_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ClinicalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentSearchIndex" ADD CONSTRAINT "DocumentSearchIndex_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentSearchIndex" ADD CONSTRAINT "DocumentSearchIndex_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KnowledgeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
