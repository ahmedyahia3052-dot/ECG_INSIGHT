import { apiRequest } from "./api";

export type EcgViewerImageDto = {
  caseId: string;
  checksum: string | null;
  downloadUrl: string;
  ecgFileId: string;
  mimeType: string;
  originalName: string;
  processedImageUrl?: string;
  sizeBytes: number;
};

export type EcgViewerMetadataDto = {
  acquisitionDate: string | null;
  caseId: string;
  deviceModel: string | null;
  digitization: Record<string, unknown> | null;
  durationSeconds: number | null;
  ecgFileId: string;
  fileType: string;
  manufacturer: string | null;
  numberOfLeads: number | null;
  ocrMetadata: Record<string, unknown> | null;
  quality: { score: number; warnings: string[] } | null;
  samplingRate: number | null;
};

export type EcgViewerBundleDto = {
  aiJobStatus: { completed: number; pending: number } | null;
  annotations: Array<Record<string, unknown>>;
  caseId: string;
  image: EcgViewerImageDto | null;
  leads: Array<Record<string, unknown>>;
  measurements: Record<string, unknown> | null;
  metadata: EcgViewerMetadataDto | null;
  overlay: Record<string, unknown> | null;
  version: string;
};

export type EcgStorageFileMetadata = {
  checksum: string | null;
  createdAt: string;
  ecgFileId: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: string;
  version: number;
};

export async function getEcgViewerBundle(accessToken: string, caseId: string) {
  return apiRequest<{ bundle: EcgViewerBundleDto }>(`/ecg-viewer/cases/${caseId}/bundle`, { accessToken });
}

export async function getEcgStorageFileMetadata(accessToken: string, ecgFileId: string) {
  return apiRequest<{ file: EcgStorageFileMetadata; versions: Array<Record<string, unknown>> }>(
    `/ecg-storage/files/${ecgFileId}/metadata`,
    { accessToken },
  );
}

export async function getEcgViewerZoomPresets(accessToken: string) {
  return apiRequest<{ presets: number[] }>("/ecg-viewer/zoom-presets", { accessToken });
}
export type EcgViewerWaveformDto = {
  caseId: string;
  durationSeconds: number;
  ecgFileId: string;
  lead: string;
  samples: number[];
  samplingRate: number;
};

export type EcgViewerLeadDto = {
  durationSeconds: number;
  gain: number;
  leadName: string;
  metadata: Record<string, unknown> | null;
  paperSpeed: number;
  sampleCount: number;
  samplingRate: number;
};

export type EcgViewerComparisonDto = {
  baseline: Record<string, number>;
  baselineCaseId?: string;
  caseId: string;
  current: Record<string, number>;
  deltas: Record<string, number>;
  trendDirection: Record<string, "down" | "stable" | "up">;
};

export async function getEcgViewerWaveform(
  accessToken: string,
  caseId: string,
  options?: { lead?: string; maxSeconds?: number },
) {
  const query = new URLSearchParams();
  if (options?.lead) query.set("lead", options.lead);
  if (options?.maxSeconds) query.set("maxSeconds", String(options.maxSeconds));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<{ waveform: EcgViewerWaveformDto | EcgViewerWaveformDto[] }>(
    `/ecg-viewer/cases/${caseId}/waveform${suffix}`,
    { accessToken },
  );
}

export async function getEcgViewerLeads(accessToken: string, caseId: string) {
  return apiRequest<{ leads: EcgViewerLeadDto[] }>(`/ecg-viewer/cases/${caseId}/leads`, { accessToken });
}

export async function compareEcgViewerCases(accessToken: string, caseId: string, baselineCaseId: string) {
  return apiRequest<{ comparison: EcgViewerComparisonDto }>(
    `/ecg-viewer/cases/${caseId}/compare?baselineCaseId=${encodeURIComponent(baselineCaseId)}`,
    { accessToken },
  );
}

export async function getEcgViewerPreferences(accessToken: string) {
  return apiRequest<{ preferences: Record<string, unknown> }>("/ecg-viewer/preferences", { accessToken });
}

export async function saveEcgViewerPreferences(accessToken: string, preferences: Record<string, unknown>) {
  return apiRequest<{ preferences: Record<string, unknown> }>("/ecg-viewer/preferences", {
    accessToken,
    body: JSON.stringify(preferences),
    method: "PUT",
  });
}
