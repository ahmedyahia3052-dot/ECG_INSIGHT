import { API_URL, apiRequest } from "./api";
import type { EcgViewerWorkspaceState } from "@/components/ecg/viewer/measurementTypes";

export async function getEcgViewerWorkspace(accessToken: string, caseId: string) {
  return apiRequest<{ workspace: EcgViewerWorkspaceState | null }>(`/cases/${caseId}/ecg-viewer-workspace`, {
    accessToken,
    method: "GET",
  });
}

export async function saveEcgViewerWorkspace(accessToken: string, caseId: string, workspace: EcgViewerWorkspaceState) {
  return apiRequest<{ ok: true }>(`/cases/${caseId}/ecg-viewer-workspace`, {
    accessToken,
    body: JSON.stringify({ workspace }),
    method: "PUT",
  });
}

export async function downloadEcgViewerWorkspacePdf(accessToken: string, caseId: string) {
  const response = await fetch(`${API_URL}/cases/${caseId}/ecg-viewer-workspace/export`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to export measurement workspace PDF.");
  return response.blob();
}

export async function downloadEcgViewerWorkspaceJson(accessToken: string, caseId: string) {
  const response = await fetch(`${API_URL}/cases/${caseId}/ecg-viewer-workspace/export/json`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to export measurement workspace JSON.");
  return response.json();
}
