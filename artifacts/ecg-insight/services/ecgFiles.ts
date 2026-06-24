import { apiRequest } from "./api";

export interface ClinicalEcgFile {
  caseId?: string;
  createdAt: string;
  fileType: string;
  id: string;
  mimeType: string;
  originalName: string;
  patientId?: string;
  sizeBytes: number;
}

export async function uploadClinicalEcgFile(accessToken: string, formData: FormData) {
  return apiRequest<{ file: ClinicalEcgFile }>("/ecg/files/upload", {
    accessToken,
    body: formData,
    headers: {},
    method: "POST",
  });
}

export async function listClinicalEcgFiles(accessToken: string, patientId?: string) {
  const suffix = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
  return apiRequest<{ files: ClinicalEcgFile[] }>(`/ecg/files/list${suffix}`, { accessToken });
}

export async function parseClinicalEcgFile(accessToken: string, ecgFileId: string) {
  return apiRequest<{ parsed: unknown }>("/ecg/files/parse", {
    accessToken,
    body: JSON.stringify({ ecgFileId }),
    method: "POST",
  });
}

export async function measureClinicalEcgFile(accessToken: string, ecgFileId: string) {
  return apiRequest<unknown>("/ecg/files/measure", {
    accessToken,
    body: JSON.stringify({ ecgFileId }),
    method: "POST",
  });
}

export async function compareClinicalEcgFile(accessToken: string, ecgFileId: string) {
  return apiRequest<{ comparison: unknown }>("/ecg/files/compare", {
    accessToken,
    body: JSON.stringify({ ecgFileId }),
    method: "POST",
  });
}

export async function deleteClinicalEcgFile(accessToken: string, ecgFileId: string) {
  return apiRequest<void>(`/ecg/files/${ecgFileId}`, { accessToken, method: "DELETE" });
}
