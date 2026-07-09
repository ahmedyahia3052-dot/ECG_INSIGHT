/** Centralized enterprise icon registry for navigation and clinical surfaces. */
export const enterpriseIconRegistry = {
  dashboard: "grid",
  patient: "user",
  ecg: "activity",
  viewer: "monitor",
  workspace: "image",
  liveMonitor: "radio",
  hospital: "home",
  organization: "briefcase",
  doctor: "user-check",
  department: "layers",
  ai: "cpu",
  alert: "alert-triangle",
  critical: "alert-octagon",
  report: "file-text",
  export: "download",
  compare: "copy",
  upload: "upload-cloud",
  settings: "settings",
  developer: "code",
  subscription: "credit-card",
  payments: "dollar-sign",
  analytics: "bar-chart-2",
} as const;

export type EnterpriseIconId = keyof typeof enterpriseIconRegistry;
export type EnterpriseIconName = (typeof enterpriseIconRegistry)[EnterpriseIconId];

export function resolveEnterpriseIcon(id: EnterpriseIconId): EnterpriseIconName {
  return enterpriseIconRegistry[id];
}
