/**
 * Auth provider configuration — env vars OR admin-managed DB secrets.
 * Secrets encrypted at rest. Never returned in plaintext to clients.
 */
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { encryptField, decryptField } from "../utils/security-crypto";
import { AppError } from "../middleware/error";

export type OAuthProvider = "APPLE" | "GOOGLE" | "MICROSOFT" | "FACEBOOK" | "LINKEDIN";

export type ProviderRuntimeConfig = {
  provider: OAuthProvider;
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes: string[];
  appleTeamId?: string;
  appleKeyId?: string;
  applePrivateKey?: string;
  source: "env" | "database" | "none";
};

const DEFAULT_SCOPES: Record<OAuthProvider, string[]> = {
  GOOGLE: ["profile", "email"],
  APPLE: ["name", "email"],
  MICROSOFT: ["user.read"],
  FACEBOOK: ["email", "public_profile"],
  LINKEDIN: ["r_emailaddress", "r_liteprofile"],
};

export const ALL_OAUTH_PROVIDERS: OAuthProvider[] = [
  "GOOGLE",
  "APPLE",
  "MICROSOFT",
  "FACEBOOK",
  "LINKEDIN",
];

export function callbackBaseUrl() {
  const configured = env.OAUTH_CALLBACK_BASE_URL ?? env.EXPO_PUBLIC_API_URL;
  return configured.replace(/\/+$/, "").replace(/\/api(?:\/v\d+)?$/i, "/api");
}

function envConfig(provider: OAuthProvider): ProviderRuntimeConfig | null {
  if (provider === "GOOGLE" && env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return {
      provider,
      enabled: true,
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      scopes: DEFAULT_SCOPES.GOOGLE,
      source: "env",
    };
  }
  if (
    provider === "APPLE" &&
    env.APPLE_OAUTH_CLIENT_ID &&
    env.APPLE_OAUTH_TEAM_ID &&
    env.APPLE_OAUTH_KEY_ID &&
    env.APPLE_OAUTH_PRIVATE_KEY
  ) {
    return {
      provider,
      enabled: true,
      clientId: env.APPLE_OAUTH_CLIENT_ID,
      appleTeamId: env.APPLE_OAUTH_TEAM_ID,
      appleKeyId: env.APPLE_OAUTH_KEY_ID,
      applePrivateKey: env.APPLE_OAUTH_PRIVATE_KEY,
      scopes: DEFAULT_SCOPES.APPLE,
      source: "env",
    };
  }
  if (provider === "MICROSOFT" && env.MICROSOFT_OAUTH_CLIENT_ID && env.MICROSOFT_OAUTH_CLIENT_SECRET) {
    return {
      provider,
      enabled: true,
      clientId: env.MICROSOFT_OAUTH_CLIENT_ID,
      clientSecret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
      scopes: DEFAULT_SCOPES.MICROSOFT,
      source: "env",
    };
  }
  if (provider === "FACEBOOK" && env.FACEBOOK_OAUTH_CLIENT_ID && env.FACEBOOK_OAUTH_CLIENT_SECRET) {
    return {
      provider,
      enabled: true,
      clientId: env.FACEBOOK_OAUTH_CLIENT_ID,
      clientSecret: env.FACEBOOK_OAUTH_CLIENT_SECRET,
      scopes: DEFAULT_SCOPES.FACEBOOK,
      source: "env",
    };
  }
  if (provider === "LINKEDIN" && env.LINKEDIN_OAUTH_CLIENT_ID && env.LINKEDIN_OAUTH_CLIENT_SECRET) {
    return {
      provider,
      enabled: true,
      clientId: env.LINKEDIN_OAUTH_CLIENT_ID,
      clientSecret: env.LINKEDIN_OAUTH_CLIENT_SECRET,
      scopes: DEFAULT_SCOPES.LINKEDIN,
      source: "env",
    };
  }
  return null;
}

export async function resolveProviderConfig(provider: OAuthProvider): Promise<ProviderRuntimeConfig> {
  const fromEnv = envConfig(provider);
  if (fromEnv) return fromEnv;

  const row = await prisma.authProviderConfig.findUnique({ where: { provider } });
  if (!row || !row.enabled || !row.clientId) {
    return { provider, enabled: false, scopes: DEFAULT_SCOPES[provider], source: "none" };
  }
  const secret = row.clientSecretEnc ? decryptField(row.clientSecretEnc) : undefined;
  const extra = (row.extraJson as Record<string, string> | null) ?? {};
  if (provider === "APPLE") {
    if (!extra.teamId || !extra.keyId || !extra.privateKey) {
      return { provider, enabled: false, scopes: DEFAULT_SCOPES.APPLE, source: "database" };
    }
    return {
      provider,
      enabled: true,
      clientId: row.clientId,
      redirectUri: row.redirectUri ?? undefined,
      scopes: Array.isArray(row.scopes) && row.scopes.length ? (row.scopes as string[]) : DEFAULT_SCOPES.APPLE,
      appleTeamId: extra.teamId,
      appleKeyId: extra.keyId,
      applePrivateKey: extra.privateKey,
      source: "database",
    };
  }
  if (!secret) {
    return { provider, enabled: false, scopes: DEFAULT_SCOPES[provider], source: "database" };
  }
  return {
    provider,
    enabled: true,
    clientId: row.clientId,
    clientSecret: secret,
    redirectUri: row.redirectUri ?? undefined,
    scopes: Array.isArray(row.scopes) && row.scopes.length ? (row.scopes as string[]) : DEFAULT_SCOPES[provider],
    source: "database",
  };
}

export async function listProviderAdminViews() {
  const views = [];
  for (const provider of ALL_OAUTH_PROVIDERS) {
    const runtime = await resolveProviderConfig(provider);
    const row = await prisma.authProviderConfig.findUnique({ where: { provider } });
    views.push({
      provider,
      enabled: runtime.enabled,
      configured: runtime.enabled,
      source: runtime.source,
      clientId: runtime.clientId
        ? `${runtime.clientId.slice(0, 6)}…`
        : row?.clientId
          ? `${row.clientId.slice(0, 6)}…`
          : null,
      hasSecret: Boolean(runtime.clientSecret || runtime.applePrivateKey || row?.clientSecretEnc),
      redirectUri: row?.redirectUri ?? `${callbackBaseUrl()}/auth/${provider.toLowerCase()}/callback`,
      scopes: runtime.scopes,
      health: runtime.enabled ? "configured" : "missing_credentials",
    });
  }
  return { providers: views };
}

export async function upsertProviderConfig(
  provider: OAuthProvider,
  input: {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scopes?: string[];
    appleTeamId?: string;
    appleKeyId?: string;
    applePrivateKey?: string;
  },
  updatedById?: string,
) {
  const existing = await prisma.authProviderConfig.findUnique({ where: { provider } });
  const extraJson =
    provider === "APPLE"
      ? {
          teamId: input.appleTeamId ?? (existing?.extraJson as Record<string, string> | null)?.teamId,
          keyId: input.appleKeyId ?? (existing?.extraJson as Record<string, string> | null)?.keyId,
          privateKey: input.applePrivateKey ?? (existing?.extraJson as Record<string, string> | null)?.privateKey,
        }
      : (existing?.extraJson ?? undefined);

  const clientSecretEnc =
    input.clientSecret && input.clientSecret.trim().length > 0
      ? encryptField(input.clientSecret.trim())
      : (existing?.clientSecretEnc ?? null);

  return prisma.authProviderConfig.upsert({
    where: { provider },
    create: {
      provider,
      enabled: input.enabled,
      clientId: input.clientId?.trim() || null,
      clientSecretEnc,
      redirectUri: input.redirectUri?.trim() || null,
      scopes: input.scopes ?? DEFAULT_SCOPES[provider],
      extraJson: extraJson ?? undefined,
      updatedById,
    },
    update: {
      enabled: input.enabled,
      clientId: input.clientId !== undefined ? input.clientId.trim() || null : undefined,
      clientSecretEnc: input.clientSecret !== undefined ? clientSecretEnc : undefined,
      redirectUri: input.redirectUri !== undefined ? input.redirectUri.trim() || null : undefined,
      scopes: input.scopes ?? undefined,
      extraJson: extraJson ?? undefined,
      updatedById,
    },
  });
}

export async function testProviderConnection(provider: OAuthProvider) {
  const config = await resolveProviderConfig(provider);
  if (!config.enabled || !config.clientId) {
    throw new AppError(400, `${provider} is not configured.`, "OAUTH_NOT_CONFIGURED");
  }

  const probes: Record<OAuthProvider, string> = {
    GOOGLE: "https://accounts.google.com/.well-known/openid-configuration",
    APPLE: "https://appleid.apple.com/.well-known/openid-configuration",
    MICROSOFT: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
    FACEBOOK: "https://www.facebook.com/.well-known/openid_configuration",
    LINKEDIN: "https://www.linkedin.com/oauth",
  };

  try {
    const response = await fetch(probes[provider], { method: "GET", signal: AbortSignal.timeout(8_000) });
    return {
      provider,
      ok: response.ok || response.status === 404 || response.status === 405,
      status: response.status,
      message: response.ok
        ? "Provider discovery endpoint reachable."
        : `Provider reachable (HTTP ${response.status}).`,
      clientIdPreview: `${config.clientId.slice(0, 6)}…`,
      source: config.source,
    };
  } catch (error) {
    throw new AppError(
      503,
      `Unable to reach ${provider}: ${error instanceof Error ? error.message : "network error"}`,
      "OAUTH_HEALTH_FAILED",
    );
  }
}

export { DEFAULT_SCOPES };
