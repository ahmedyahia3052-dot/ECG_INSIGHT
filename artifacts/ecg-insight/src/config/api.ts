type AppEnvironment = "development" | "production" | "staging";
type EnvMap = Record<string, string | undefined>;
type ImportMetaWithEnv = ImportMeta & {
  env?: EnvMap;
};

const DEFAULT_API_BASE_URL = "http://localhost:3002/api";
const LOCAL_DEV_FRONTEND_PORTS = new Set(["3000", "4173", "5173", "8081", "8082"]);

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

function devProxyEnabled() {
  const env = { ...processEnv(), ...viteEnv() };
  return env.EXPO_PUBLIC_USE_DEV_PROXY === "true" || env.EXPO_PUBLIC_USE_DEV_PROXY === "1";
}

function isLocalDevFrontend(hostname: string, port: string) {
  return (hostname === "localhost" || hostname === "127.0.0.1") && LOCAL_DEV_FRONTEND_PORTS.has(port);
}

function isLoopbackApiUrl(value: string) {
  try {
    const url = new URL(value);
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && port === "3002";
  } catch {
    return false;
  }
}

function preferDevProxyInBrowser(configured: string) {
  if (typeof window === "undefined") return false;
  const { hostname, port } = window.location;
  if (!isLocalDevFrontend(hostname, port)) return false;
  if (configured.startsWith("/")) return true;
  if (devProxyEnabled()) return true;
  return APP_ENV === "development" && isLoopbackApiUrl(configured);
}

function resolveRelativeApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return normalizeUrl(`${window.location.origin}${normalizedPath}`);
  }
  return normalizeUrl(`http://127.0.0.1:3002${normalizedPath}`);
}

export function requiredApiUrl() {
  const configured = configuredEnvValue();
  if (preferDevProxyInBrowser(configured)) {
    return resolveRelativeApiUrl("/api");
  }
  if (configured.startsWith("/")) {
    return resolveRelativeApiUrl(configured);
  }
  if (configured) return normalizeUrl(configured);

  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    if (isLocalDevFrontend(hostname, port)) {
      if (devProxyEnabled()) {
        return resolveRelativeApiUrl("/api");
      }
      return DEFAULT_API_BASE_URL;
    }
    return `${window.location.origin.replace(/\/+$/, "")}/api`;
  }

  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = requiredApiUrl();
export const API_ROOT_URL = API_BASE_URL.replace(/\/api(?:\/v\d+)?$/i, "");

/** Align loopback hostname with the browser (localhost vs 127.0.0.1) at request time. */
export function resolveRuntimeApiBaseUrl() {
  const configured = configuredEnvValue() || requiredApiUrl();
  if (preferDevProxyInBrowser(configured)) {
    return resolveRelativeApiUrl("/api");
  }
  const normalized = normalizeUrl(configured);
  if (normalized.startsWith("/")) {
    return resolveRelativeApiUrl(normalized);
  }
  if (typeof window === "undefined") return normalized;

  try {
    const url = new URL(normalized);
    const { hostname, protocol } = window.location;
    const loopbackHost = hostname === "localhost" || hostname === "127.0.0.1";
    const loopbackApi = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (loopbackHost && loopbackApi) {
      url.protocol = protocol;
      url.hostname = hostname;
    }
    return normalizeUrl(url.toString());
  } catch {
    return normalized;
  }
}

export function resolveRuntimeApiRootUrl() {
  return resolveRuntimeApiBaseUrl().replace(/\/api(?:\/v\d+)?$/i, "");
}

export function resolveRuntimeLivenessUrls() {
  const roots = new Set<string>();

  if (typeof window !== "undefined") {
    const { hostname, port, origin } = window.location;
    if (isLocalDevFrontend(hostname, port)) {
      roots.add(origin);
    }
  }

  roots.add(resolveRuntimeApiRootUrl());
  roots.add(API_ROOT_URL);
  roots.add("http://localhost:3002");
  roots.add("http://127.0.0.1:3002");

  if (typeof window !== "undefined") {
    roots.add(`${window.location.protocol}//${window.location.hostname}:3002`);
  }

  return [...roots]
    .map((root) => root.replace(/\/+$/, ""))
    .filter(Boolean)
    .map((root) => `${root}/liveness`);
}

export function apiConfigurationWarning() {
  if (configuredEnvValue() || APP_ENV === "development") return null;
  return "API URL is not configured. Falling back to same-origin /api. Set EXPO_PUBLIC_API_URL, VITE_API_URL, or NEXT_PUBLIC_API_URL when the backend is on another origin.";
}

