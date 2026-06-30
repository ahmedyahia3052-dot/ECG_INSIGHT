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
  return env.EXPO_PUBLIC_API_URL?.trim() ||
    vite.EXPO_PUBLIC_API_URL?.trim() ||
    env.VITE_API_URL?.trim() ||
    vite.VITE_API_URL?.trim() ||
    env.NEXT_PUBLIC_API_URL?.trim() ||
    vite.NEXT_PUBLIC_API_URL?.trim() ||
    "";
}

export const APP_ENV = appEnvironment();
export const API_CONFIGURATION_SOURCE = configuredEnvValue()
  ? processEnv().EXPO_PUBLIC_API_URL || viteEnv().EXPO_PUBLIC_API_URL
    ? "EXPO_PUBLIC_API_URL"
    : processEnv().VITE_API_URL || viteEnv().VITE_API_URL
      ? "VITE_API_URL"
      : "NEXT_PUBLIC_API_URL"
  : "development-fallback";

export function configuredApiUrl() {
  return configuredEnvValue();
}

export function requiredApiUrl() {
  const configured = configuredEnvValue();
  if (configured) return normalizeUrl(configured);

  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    const localFrontend = hostname === "localhost" || hostname === "127.0.0.1";
    if (localFrontend && ["3000", "4173", "5173", "8081", "8082"].includes(port)) {
      return DEFAULT_API_BASE_URL;
    }
    return `${window.location.origin.replace(/\/+$/, "")}/api`;
  }

  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = requiredApiUrl();
export const API_ROOT_URL = API_BASE_URL.replace(/\/api(?:\/v\d+)?$/i, "");

export function apiConfigurationWarning() {
  if (configuredEnvValue() || APP_ENV === "development") return null;
  return "API URL is not configured. Falling back to same-origin /api. Set EXPO_PUBLIC_API_URL, VITE_API_URL, or NEXT_PUBLIC_API_URL when the backend is on another origin.";
}

