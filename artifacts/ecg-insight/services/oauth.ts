import { apiRequest, API_URL } from "./api";

export type OAuthProvider = "APPLE" | "GOOGLE" | "MICROSOFT";

export interface OAuthProviderStatus {
  configured: boolean;
  provider: OAuthProvider;
}

export async function listOAuthProviders() {
  const data = await apiRequest<{ providers?: OAuthProviderStatus[] | null }>("/auth/oauth/providers");
  const providers = Array.isArray(data?.providers) ? data.providers : [];
  return { providers };
}

export async function assertOAuthProviderReady(provider: OAuthProvider) {
  const { providers } = await listOAuthProviders();
  const status = (providers ?? []).find((item) => item.provider === provider);
  if (!status?.configured) {
    throw new Error("Social login is temporarily unavailable. Please use email sign in.");
  }
  return status;
}

export function oauthStartUrl(provider: OAuthProvider) {
  return `${API_URL}/auth/oauth/${provider.toLowerCase()}`;
}
