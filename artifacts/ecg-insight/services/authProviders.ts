import { apiRequest } from "./api";

export type SocialProvider = "APPLE" | "FACEBOOK" | "GOOGLE" | "LINKEDIN" | "MICROSOFT";

export const socialProviderCatalog: Array<{
  backendProvider?: "APPLE" | "GOOGLE" | "MICROSOFT";
  label: string;
  provider: SocialProvider;
  status: "backend_ready" | "enterprise_sso_ready";
}> = [
  { backendProvider: "GOOGLE", label: "Google", provider: "GOOGLE", status: "backend_ready" },
  { backendProvider: "APPLE", label: "Apple", provider: "APPLE", status: "backend_ready" },
  { backendProvider: "MICROSOFT", label: "Microsoft", provider: "MICROSOFT", status: "backend_ready" },
  { label: "Facebook", provider: "FACEBOOK", status: "enterprise_sso_ready" },
  { label: "LinkedIn", provider: "LINKEDIN", status: "enterprise_sso_ready" },
];

export function createSocialAuthIntent(provider: SocialProvider) {
  const config = socialProviderCatalog.find((item) => item.provider === provider);
  if (!config) throw new Error("Unsupported social provider.");
  return {
    ...config,
    nonce: `${provider.toLowerCase()}-${Date.now()}`,
    requiresProviderCredential: true,
  };
}

export async function checkEmailAvailability(email: string) {
  const params = new URLSearchParams({ email: email.trim().toLowerCase() });
  return apiRequest<{ available: boolean; message?: string }>(`/auth/email-availability?${params.toString()}`);
}
