export type FeatureFlagKey =
  | "dashboard"
  | "patients"
  | "cases"
  | "workspace"
  | "viewer"
  | "liveMonitor"
  | "upload"
  | "history"
  | "profile"
  | "settings"
  | "organizations"
  | "subscriptions"
  | "developer"
  | "notifications"
  | "analytics"
  | "auth";

export type FeatureFlagMode = "enabled" | "disabled" | "experimental" | "developerOnly" | "enterpriseOnly";

export type FeatureFlagDefinition = {
  key: FeatureFlagKey;
  mode: FeatureFlagMode;
};

const DEFAULT_FLAGS: Record<FeatureFlagKey, FeatureFlagMode> = {
  analytics: "enterpriseOnly",
  auth: "enabled",
  cases: "enabled",
  dashboard: "enabled",
  developer: "developerOnly",
  history: "enabled",
  liveMonitor: "enabled",
  notifications: "enabled",
  organizations: "enterpriseOnly",
  patients: "enabled",
  profile: "enabled",
  settings: "enabled",
  subscriptions: "enterpriseOnly",
  upload: "enabled",
  viewer: "enabled",
  workspace: "enabled",
};

let runtimeOverrides: Partial<Record<FeatureFlagKey, FeatureFlagMode>> = {};

export function configureFeatureFlags(overrides: Partial<Record<FeatureFlagKey, FeatureFlagMode>>) {
  runtimeOverrides = { ...runtimeOverrides, ...overrides };
}

export function getFeatureFlagMode(key: FeatureFlagKey): FeatureFlagMode {
  return runtimeOverrides[key] ?? DEFAULT_FLAGS[key];
}

export function isFeatureEnabled(key: FeatureFlagKey, context?: { developer?: boolean; enterprise?: boolean }) {
  const mode = getFeatureFlagMode(key);
  if (mode === "enabled") return true;
  if (mode === "disabled") return false;
  if (mode === "experimental") return true;
  if (mode === "developerOnly") return Boolean(context?.developer);
  if (mode === "enterpriseOnly") return Boolean(context?.enterprise);
  return true;
}
