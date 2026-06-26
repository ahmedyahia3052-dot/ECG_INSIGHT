import { apiRequest } from "./api";

export type OAuthProvider = "APPLE" | "GOOGLE" | "MICROSOFT";

export interface OAuthProviderStatus {
  configured: boolean;
  provider: OAuthProvider;
}

export async function listOAuthProviders() {
  return apiRequest<{ providers: OAuthProviderStatus[] }>("/auth/oauth/providers");
}

export async function assertOAuthProviderReady(provider: OAuthProvider) {
  const { providers } = await listOAuthProviders();
  const status = providers.find((item) => item.provider === provider);
  if (!status?.configured) {
    throw new Error(`${provider} sign-in is awaiting production OAuth client keys.`);
  }
  return status;
}
