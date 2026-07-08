import { foundationEnvironment } from "./environment";

export const FEATURE_FLAGS = {
  clinicalWorkspaceHub: "clinical_workspace_hub",
  copilotStreaming: "copilot_streaming",
  enterpriseLogging: "enterprise_logging",
  offlineQueue: "offline_queue",
  requestRetry: "request_retry",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

type FeatureFlagDefinition = {
  defaultEnabled: boolean;
  envKeys: string[];
};

const FLAG_DEFINITIONS: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  [FEATURE_FLAGS.clinicalWorkspaceHub]: {
    defaultEnabled: true,
    envKeys: ["EXPO_PUBLIC_FEATURE_CLINICAL_WORKSPACE", "VITE_FEATURE_CLINICAL_WORKSPACE"],
  },
  [FEATURE_FLAGS.copilotStreaming]: {
    defaultEnabled: true,
    envKeys: ["EXPO_PUBLIC_FEATURE_COPILOT_STREAMING", "VITE_FEATURE_COPILOT_STREAMING"],
  },
  [FEATURE_FLAGS.enterpriseLogging]: {
    defaultEnabled: foundationEnvironment.enterpriseLoggingEnabled,
    envKeys: ["EXPO_PUBLIC_FEATURE_ENTERPRISE_LOGGING", "VITE_FEATURE_ENTERPRISE_LOGGING"],
  },
  [FEATURE_FLAGS.offlineQueue]: {
    defaultEnabled: foundationEnvironment.offlineDetectionEnabled,
    envKeys: ["EXPO_PUBLIC_FEATURE_OFFLINE_QUEUE", "VITE_FEATURE_OFFLINE_QUEUE"],
  },
  [FEATURE_FLAGS.requestRetry]: {
    defaultEnabled: foundationEnvironment.requestRetryMaxAttempts > 0,
    envKeys: ["EXPO_PUBLIC_FEATURE_REQUEST_RETRY", "VITE_FEATURE_REQUEST_RETRY"],
  },
};

function readEnvValue(keys: string[]): string | undefined {
  const env =
    typeof process !== "undefined"
      ? process.env
      : typeof import.meta !== "undefined"
        ? ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {})
        : {};

  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

const resolvedFlags = new Map<FeatureFlagKey, boolean>();

function resolveFlag(flag: FeatureFlagKey): boolean {
  const cached = resolvedFlags.get(flag);
  if (cached !== undefined) return cached;

  const definition = FLAG_DEFINITIONS[flag];
  const enabled = parseBoolean(readEnvValue(definition.envKeys), definition.defaultEnabled);
  resolvedFlags.set(flag, enabled);
  return enabled;
}

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return resolveFlag(flag);
}

export function enabledFeatureFlags(): FeatureFlagKey[] {
  return (Object.values(FEATURE_FLAGS) as FeatureFlagKey[]).filter((flag) => isFeatureEnabled(flag));
}

export function serializeFeatureFlagsHeader(): string {
  return enabledFeatureFlags().join(",");
}

export function resetFeatureFlagsForTests() {
  resolvedFlags.clear();
}
