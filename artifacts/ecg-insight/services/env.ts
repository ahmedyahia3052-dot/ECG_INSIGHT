type AppEnvironment = "development" | "staging" | "production";

function appEnvironment(): AppEnvironment {
  const value = process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development";
  return value === "production" || value === "staging" ? value : "development";
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const APP_ENV = appEnvironment();

export function configuredApiUrl() {
  return process.env.EXPO_PUBLIC_API_URL?.trim() || process.env.VITE_API_URL?.trim() || "";
}

export function apiConfigurationWarning() {
  if (configuredApiUrl()) return null;
  return "API URL is not configured. Set EXPO_PUBLIC_API_URL=http://localhost:3002/api for Expo, or VITE_API_URL for web tooling.";
}

export function requiredApiUrl() {
  const configured = configuredApiUrl();
  if (configured) return normalizeUrl(configured);

  if (APP_ENV !== "development") {
    throw new Error("EXPO_PUBLIC_API_URL must be configured for staging and production builds.");
  }

  return "http://localhost:3002/api";
}
