ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "registrationRole" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountType" TEXT NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX IF NOT EXISTS "User_accountType_idx" ON "User"("accountType");

DO $$ BEGIN
  ALTER TABLE "User"
    ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
