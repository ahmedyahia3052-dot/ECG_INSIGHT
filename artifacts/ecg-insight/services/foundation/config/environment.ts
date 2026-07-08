import {
  API_BASE_URL,
  API_CONFIGURATION_SOURCE,
  API_ROOT_URL,
  APP_ENV,
  apiConfigurationWarning,
  configuredApiUrl,
  requiredApiUrl,
} from "@/src/config/api";

type EnvMap = Record<string, string | undefined>;
type ImportMetaWithEnv = ImportMeta & { env?: EnvMap };

function readEnv(): EnvMap {
  const processValues = typeof process !== "undefined" ? process.env : {};
  const viteValues =
    typeof import.meta !== "undefined" ? ((import.meta as ImportMetaWithEnv).env ?? {}) : {};
  return { ...viteValues, ...processValues };
}

function readBoolean(name: string, fallback = false): boolean {
  const value = readEnv()[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function readNumber(name: string, fallback: number): number {
  const raw = readEnv()[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const foundationEnvironment = {
  apiBaseUrl: API_BASE_URL,
  apiConfigurationSource: API_CONFIGURATION_SOURCE,
  apiConfigurationWarning: apiConfigurationWarning(),
  apiRootUrl: API_ROOT_URL,
  appEnv: APP_ENV,
  configuredApiUrl: configuredApiUrl(),
  enterpriseLoggingEnabled: readBoolean("EXPO_PUBLIC_ENTERPRISE_LOGGING", APP_ENV !== "production") ||
    readBoolean("VITE_ENTERPRISE_LOGGING", APP_ENV !== "production"),
  isDevelopment: APP_ENV === "development",
  isProduction: APP_ENV === "production",
  offlineDetectionEnabled: readBoolean("EXPO_PUBLIC_OFFLINE_DETECTION", true),
  requestRetryMaxAttempts: readNumber("EXPO_PUBLIC_API_RETRY_MAX", 3),
  requestRetryBaseDelayMs: readNumber("EXPO_PUBLIC_API_RETRY_BASE_MS", 400),
  requestTimeoutMs: readNumber("EXPO_PUBLIC_API_TIMEOUT_MS", 15_000),
  requiredApiUrl: requiredApiUrl(),
} as const;

export type FoundationEnvironment = typeof foundationEnvironment;
