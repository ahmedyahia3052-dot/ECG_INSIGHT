import { apiRequest, API_URL } from "./api";

export type OAuthProvider = "APPLE" | "GOOGLE" | "MICROSOFT";

export interface OAuthProviderStatus {
  configured: boolean;
  provider: OAuthProvider;
}

export const EMPTY_OAUTH_PROVIDERS: OAuthProviderStatus[] = [];

export async function listOAuthProviders(): Promise<{ providers: OAuthProviderStatus[] }> {
  try {
    const data = await apiRequest<{ providers?: OAuthProviderStatus[] | null }>("/auth/oauth/providers");
    if (!data || !Array.isArray(data.providers)) {
      return { providers: EMPTY_OAUTH_PROVIDERS };
    }
    return { providers: data.providers };
  } catch {
    return { providers: EMPTY_OAUTH_PROVIDERS };
  }
}

export async function assertOAuthProviderReady(provider: OAuthProvider) {
  const { providers } = await listOAuthProviders();
  const status = providers.find((item) => item.provider === provider);
  if (!status?.configured) {
    throw new Error("Social login is temporarily unavailable. Please use email sign in.");
  }
  return status;
}

export function oauthStartUrl(provider: OAuthProvider) {
  return `${API_URL}/auth/oauth/${provider.toLowerCase()}`;
}
