ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "protectedOwner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ownerPasswordSetupRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ownerTwoFactorRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

UPDATE "User"
SET
  "name" = 'Dr. Ahmed Yehia',
  "email" = 'ahmedyahia3052@gmail.com',
  "username" = 'AhmedYahiaFahmy',
  "role" = 'OWNER',
  "protectedOwner" = true,
  "ownerPasswordSetupRequired" = true,
  "forcePasswordReset" = true,
  "isActive" = true,
  "emailVerified" = true,
  "avatarInitials" = 'AY'
WHERE "role" = 'OWNER' OR "email" IN ('owner@ecginsight.com', 'ahmedyahia3052@gmail.com');
