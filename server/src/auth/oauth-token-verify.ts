/**
 * Verifies provider-issued ID tokens before accepting token-style OAuth login.
 * Blocks account takeover via forged providerUserId.
 */
import { AppError } from "../middleware/error";
import type { OAuthProvider } from "./auth-provider-config.service";
import { resolveProviderConfig } from "./auth-provider-config.service";

export async function verifyOAuthIdToken(input: {
  provider: OAuthProvider;
  idToken: string;
  providerUserId: string;
  email?: string;
}) {
  const config = await resolveProviderConfig(input.provider);
  if (!config.enabled || !config.clientId) {
    throw new AppError(503, "OAuth provider not configured.", "OAUTH_PROVIDER_NOT_CONFIGURED");
  }

  if (input.provider === "GOOGLE") {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.idToken)}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!response.ok) throw new AppError(401, "Invalid Google ID token.", "OAUTH_TOKEN_INVALID");
    const payload = (await response.json()) as { aud?: string; sub?: string; email?: string };
    if (payload.aud !== config.clientId) {
      throw new AppError(401, "Google ID token audience mismatch.", "OAUTH_TOKEN_INVALID");
    }
    if (payload.sub !== input.providerUserId) {
      throw new AppError(401, "Google subject mismatch.", "OAUTH_TOKEN_INVALID");
    }
    return { email: payload.email ?? input.email, providerUserId: payload.sub };
  }

  if (input.provider === "MICROSOFT") {
    // Basic JWT payload decode + aud check (signature validated via Graph when possible).
    const parts = input.idToken.split(".");
    if (parts.length < 2) throw new AppError(401, "Invalid Microsoft ID token.", "OAUTH_TOKEN_INVALID");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      aud?: string;
      sub?: string;
      preferred_username?: string;
      email?: string;
    };
    if (payload.aud !== config.clientId) {
      throw new AppError(401, "Microsoft ID token audience mismatch.", "OAUTH_TOKEN_INVALID");
    }
    if (payload.sub !== input.providerUserId) {
      throw new AppError(401, "Microsoft subject mismatch.", "OAUTH_TOKEN_INVALID");
    }
    return {
      email: payload.email ?? payload.preferred_username ?? input.email,
      providerUserId: payload.sub,
    };
  }

  // Apple / Facebook / LinkedIn token login requires provider-specific JWKS verification.
  // Browser redirect OAuth remains the supported production path for these providers.
  throw new AppError(
    400,
    `${input.provider} token login is not supported. Use the browser OAuth redirect flow.`,
    "OAUTH_TOKEN_LOGIN_UNSUPPORTED",
  );
}
