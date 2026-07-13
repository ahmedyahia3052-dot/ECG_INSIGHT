import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { initializeLlmProvider } from "../llm/llm-registry";
import { log } from "../utils/logger";
import { oauthProviderStatuses } from "../auth/oauth-passport";
import { webAuthnStatus } from "../auth/webauthn.service";

export async function runStartupChecks() {
  log("info", "Running ECG Insight startup checks.", {
    environment: env.NODE_ENV,
    port: env.PORT,
  });

  await prisma.$queryRaw`SELECT 1`;
  await initializeLlmProvider();

  const oauth = await oauthProviderStatuses();
  const webauthn = webAuthnStatus();
  const enabledOAuth = oauth.filter((p) => p.configured).map((p) => p.provider);
  const missingOAuth = oauth.filter((p) => !p.configured).map((p) => p.provider);

  // Soft validation: half-configured env pairs
  const halfConfigured: string[] = [];
  if (env.GOOGLE_OAUTH_CLIENT_ID && !env.GOOGLE_OAUTH_CLIENT_SECRET) halfConfigured.push("GOOGLE");
  if (env.FACEBOOK_OAUTH_CLIENT_ID && !env.FACEBOOK_OAUTH_CLIENT_SECRET) halfConfigured.push("FACEBOOK");
  if (env.LINKEDIN_OAUTH_CLIENT_ID && !env.LINKEDIN_OAUTH_CLIENT_SECRET) halfConfigured.push("LINKEDIN");
  if (env.MICROSOFT_OAUTH_CLIENT_ID && !env.MICROSOFT_OAUTH_CLIENT_SECRET) halfConfigured.push("MICROSOFT");
  if (halfConfigured.length) {
    log("warn", "OAuth providers have incomplete credentials (disabled until complete).", {
      providers: halfConfigured,
    });
  }

  log("info", "Auth provider readiness.", {
    oauthEnabled: enabledOAuth,
    oauthWaitingCredentials: missingOAuth,
    webauthnAvailable: webauthn.available,
    webauthnReason: webauthn.reason,
    smtpConfigured: Boolean(env.SMTP_URL),
  });

  log("info", "Startup checks completed.", {
    checks: ["environment", "database", "llm-provider", "oauth-providers", "webauthn"],
  });
}
