type AppEnvironment = "development" | "production" | "staging";
type EnvMap = Record<string, string | undefined>;
type ImportMetaWithEnv = ImportMeta & {
  env?: EnvMap;
};

const DEFAULT_API_BASE_URL = "http://localhost:3002/api";

function appEnvironment(): AppEnvironment {
  const env = processEnv();
  const value = env.EXPO_PUBLIC_APP_ENV ?? env.NODE_ENV ?? "development";
  return value === "production" || value === "staging" ? value : "development";
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function viteEnv(): EnvMap {
  return typeof import.meta !== "undefined" ? ((import.meta as ImportMetaWithEnv).env ?? {}) : {};
}

function processEnv(): EnvMap {
  return typeof process !== "undefined" ? process.env : {};
}

function configuredEnvValue() {
  const vite = viteEnv();
  const env = processEnv();
  return env.EXPO_PUBLIC_API_URL?.trim() || vite.EXPO_PUBLIC_API_URL?.trim() || env.VITE_API_URL?.trim() || vite.VITE_API_URL?.trim() || "";
}

export const APP_ENV = appEnvironment();
export const API_CONFIGURATION_SOURCE = configuredEnvValue()
  ? processEnv().EXPO_PUBLIC_API_URL || viteEnv().EXPO_PUBLIC_API_URL
    ? "EXPO_PUBLIC_API_URL"
    : "VITE_API_URL"
  : "development-fallback";

export function configuredApiUrl() {
  return configuredEnvValue();
}

export function requiredApiUrl() {
  const configured = configuredEnvValue();
  if (configured) return normalizeUrl(configured);

  if (APP_ENV !== "development") {
    throw new Error("EXPO_PUBLIC_API_URL or VITE_API_URL must be configured for staging and production builds.");
  }

  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = requiredApiUrl();
export const API_ROOT_URL = API_BASE_URL.replace(/\/api(?:\/v\d+)?$/i, "");

export function apiConfigurationWarning() {
  if (configuredEnvValue() || APP_ENV === "development") return null;
  return "API URL is not configured. Set EXPO_PUBLIC_API_URL or VITE_API_URL to the ECG Insight backend API.";
}

