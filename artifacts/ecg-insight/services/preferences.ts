import { apiRequest } from "./api";

export interface WorkspacePreferences {
  compactDensity: boolean;
  criticalAlertSound: boolean;
  destructiveActionConfirmation: boolean;
  highContrastMode: boolean;
  reduceMotion: boolean;
  rememberPatientFilters: boolean;
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
    method: "PUT",
  });
}
