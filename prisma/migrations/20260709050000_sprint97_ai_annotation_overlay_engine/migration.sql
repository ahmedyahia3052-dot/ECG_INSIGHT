-- Sprint 97 — AI Annotation & Overlay Engine

CREATE TABLE "EcgAiOverlayWorkspace" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "workspaceJson" JSONB NOT NULL,
    "layerConfig" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcgAiOverlayWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EcgAiOverlayVersion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "layerConfig" JSONB NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcgAiOverlayVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EcgAiOverlayWorkspace_caseId_key" ON "EcgAiOverlayWorkspace"("caseId");
CREATE INDEX "EcgAiOverlayWorkspace_caseId_idx" ON "EcgAiOverlayWorkspace"("caseId");
CREATE INDEX "EcgAiOverlayWorkspace_updatedById_idx" ON "EcgAiOverlayWorkspace"("updatedById");

CREATE UNIQUE INDEX "EcgAiOverlayVersion_caseId_versionNumber_key" ON "EcgAiOverlayVersion"("caseId", "versionNumber");
CREATE INDEX "EcgAiOverlayVersion_workspaceId_idx" ON "EcgAiOverlayVersion"("workspaceId");
CREATE INDEX "EcgAiOverlayVersion_caseId_idx" ON "EcgAiOverlayVersion"("caseId");

ALTER TABLE "EcgAiOverlayWorkspace" ADD CONSTRAINT "EcgAiOverlayWorkspace_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcgAiOverlayWorkspace" ADD CONSTRAINT "EcgAiOverlayWorkspace_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EcgAiOverlayVersion" ADD CONSTRAINT "EcgAiOverlayVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "EcgAiOverlayWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcgAiOverlayVersion" ADD CONSTRAINT "EcgAiOverlayVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
