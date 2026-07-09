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
