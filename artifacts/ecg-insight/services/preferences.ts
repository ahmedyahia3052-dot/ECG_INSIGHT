import { apiRequest } from "./api";

export interface WorkspacePreferences {
  compactDashboardDensity: boolean;
  criticalAlertSound: boolean;
  highContrastClinicalMode: boolean;
  reduceMotion: boolean;
  rememberLastPatientFilter: boolean;
  requireConfirmationForDestructiveActions: boolean;
  updatedAt?: string;
  userId?: string;
}

export async function getPreferences(accessToken: string) {
  return apiRequest<{ preferences: WorkspacePreferences }>("/preferences", { accessToken });
}

export async function updatePreferences(accessToken: string, input: Partial<WorkspacePreferences>) {
  return apiRequest<{ preferences: WorkspacePreferences }>("/preferences", {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}
