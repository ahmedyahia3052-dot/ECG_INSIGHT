import { Platform } from "react-native";

import { apiFileUrl } from "@/services/api";

export async function exportEcgViewerPng(input: { accessToken?: string | null; caseId?: string; imageUrl?: string }) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !input.imageUrl) {
    throw new Error("PNG export requires a loaded ECG image on web.");
  }
  const url = apiFileUrl(input.imageUrl);
  const headers: Record<string, string> = {};
  if (input.accessToken) headers.authorization = `Bearer ${input.accessToken}`;
  const response = await fetch(url, { credentials: "include", headers });
  if (!response.ok) throw new Error(`Failed to fetch ECG image for PNG export (${response.status}).`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `ecg-viewer-${input.caseId ?? "export"}.png`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
