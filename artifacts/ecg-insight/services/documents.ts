import { apiRequest } from "./api";

export interface ClinicalDocument {
  caseId?: string;
  category: string;
  createdAt: string;
  downloadUrl: string;
  id: string;
  mimeType: string;
  originalName: string;
  patientId: string;
  sizeBytes: number;
  title: string;
}

export async function listClinicalDocuments(accessToken: string, params: URLSearchParams) {
  return apiRequest<{ documents: ClinicalDocument[] }>(`/documents?${params.toString()}`, { accessToken });
}

export async function uploadClinicalDocument(accessToken: string, formData: FormData) {
  return apiRequest<{ document: ClinicalDocument }>("/documents", {
    accessToken,
    body: formData,
    headers: {},
    method: "POST",
  });
}
