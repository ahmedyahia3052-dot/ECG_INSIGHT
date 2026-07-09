/**
 * Sprint 103 — Bolt UI migration feature flags.
 * Controls which presentation layer is active without modifying business logic.
 */
export type BoltMigrationFlag =
  | "UI_BOLT"
  | "LEGACY_UI"
  | "LIVE_MONITOR"
  | "PRO_VIEWER"
  | "AI_OVERLAY"
  | "SUBSCRIPTIONS"
  | "ORGANIZATIONS"
  | "MULTI_TENANT"
  | "DEVELOPER_MODE";

export type BoltMigrationFlagState = "enabled" | "disabled" | "shadow";

const DEFAULTS: Record<BoltMigrationFlag, BoltMigrationFlagState> = {
  AI_OVERLAY: "enabled",
  DEVELOPER_MODE: "disabled",
  LEGACY_UI: "enabled",
  LIVE_MONITOR: "enabled",
  MULTI_TENANT: "enabled",
  ORGANIZATIONS: "enabled",
  PRO_VIEWER: "enabled",
  SUBSCRIPTIONS: "enabled",
  UI_BOLT: "disabled",
};

let overrides: Partial<Record<BoltMigrationFlag, BoltMigrationFlagState>> = {};

export function configureBoltMigrationFlags(next: Partial<Record<BoltMigrationFlag, BoltMigrationFlagState>>) {
  overrides = { ...overrides, ...next };
}

export function getBoltMigrationFlag(flag: BoltMigrationFlag): BoltMigrationFlagState {
  return overrides[flag] ?? DEFAULTS[flag];
}

export function isBoltUiActive() {
  return getBoltMigrationFlag("UI_BOLT") === "enabled" && getBoltMigrationFlag("LEGACY_UI") === "disabled";
}

export function isLegacyUiActive() {
  return getBoltMigrationFlag("LEGACY_UI") === "enabled";
}

export const BOLT_MIGRATION_FLAGS: BoltMigrationFlag[] = [
  "UI_BOLT",
  "LEGACY_UI",
  "LIVE_MONITOR",
  "PRO_VIEWER",
  "AI_OVERLAY",
  "SUBSCRIPTIONS",
  "ORGANIZATIONS",
  "MULTI_TENANT",
  "DEVELOPER_MODE",
];
