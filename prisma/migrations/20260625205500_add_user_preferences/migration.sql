ALTER TYPE "Gender" ADD VALUE IF NOT EXISTS 'CHILD';

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
  "highContrastClinicalMode" BOOLEAN NOT NULL DEFAULT false,
  "compactDashboardDensity" BOOLEAN NOT NULL DEFAULT false,
  "criticalAlertSound" BOOLEAN NOT NULL DEFAULT true,
  "rememberLastPatientFilter" BOOLEAN NOT NULL DEFAULT false,
  "requireConfirmationForDestructiveActions" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_preferences_userId_key" UNIQUE ("userId")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_preferences_userId_fkey'
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
