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

export async function updateClinicalDocument(
  accessToken: string,
  documentId: string,
  input: Partial<Pick<ClinicalDocument, "category" | "title">>,
) {
  return apiRequest<{ document: ClinicalDocument }>(`/documents/${documentId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function deleteClinicalDocument(accessToken: string, documentId: string) {
  return apiRequest<void>(`/documents/${documentId}`, { accessToken, method: "DELETE" });
}
