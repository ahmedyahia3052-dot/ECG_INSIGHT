type AppEnvironment = "development" | "staging" | "production";

function appEnvironment(): AppEnvironment {
  const value = process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development";
  return value === "production" || value === "staging" ? value : "development";
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const APP_ENV = appEnvironment();

export function requiredApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return normalizeUrl(configured);

  if (APP_ENV !== "development") {
    throw new Error("EXPO_PUBLIC_API_URL must be configured for staging and production builds.");
  }

  return "http://localhost:3001/api";
}
