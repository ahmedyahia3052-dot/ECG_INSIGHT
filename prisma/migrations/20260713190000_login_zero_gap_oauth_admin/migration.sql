-- Zero-gap login: OAuth state/PKCE store, admin provider config, email outbox

CREATE TABLE IF NOT EXISTS "OAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "nonce" TEXT,
    "provider" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthState_state_key" ON "OAuthState"("state");
CREATE INDEX IF NOT EXISTS "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

CREATE TABLE IF NOT EXISTS "AuthProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "redirectUri" TEXT,
    "scopes" JSONB,
    "extraJson" JSONB,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthProviderConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuthProviderConfig_provider_key" ON "AuthProviderConfig"("provider");
CREATE INDEX IF NOT EXISTS "AuthProviderConfig_enabled_idx" ON "AuthProviderConfig"("enabled");

CREATE TABLE IF NOT EXISTS "EmailOutbox" (
    "id" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailOutbox_status_idx" ON "EmailOutbox"("status");
CREATE INDEX IF NOT EXISTS "EmailOutbox_createdAt_idx" ON "EmailOutbox"("createdAt");
