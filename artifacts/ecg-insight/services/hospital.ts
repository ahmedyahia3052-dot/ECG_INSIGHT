import { apiRequest } from "./api";

export interface ClinicalEcgFile {
  acquisitionDate?: string;
  createdAt: string;
  deviceModel?: string;
  duration?: number;
  fileName: string;
  fileType: string;
  id: string;
  manufacturer?: string;
  numberOfLeads?: number;
  organizationId?: string;
  patientId?: string;
  samplingRate?: number;
}

export async function listClinicalEcgFiles(accessToken: string, patientId?: string) {
  const suffix = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
  return apiRequest<{ files: ClinicalEcgFile[] }>(`/ecg/files/list${suffix}`, { accessToken });
}

export async function parseClinicalEcgFile(accessToken: string, ecgFileId: string) {
  return apiRequest<{ parsed: { duration: number; metadata: unknown; numberOfLeads: number } }>("/ecg/files/parse", {
    accessToken,
    body: JSON.stringify({ ecgFileId }),
    method: "POST",
  });
}

export async function measureClinicalEcgFile(accessToken: string, ecgFileId: string) {
  return apiRequest<{ annotationsCreated: number; measurement: unknown }>("/ecg/files/measure", {
    accessToken,
    body: JSON.stringify({ ecgFileId }),
    method: "POST",
  });
}

export async function compareClinicalEcgFile(accessToken: string, ecgFileId: string) {
  return apiRequest<{ comparison: { changes: string[]; status: string } }>("/ecg/files/compare", {
    accessToken,
    body: JSON.stringify({ ecgFileId }),
    method: "POST",
  });
}

export async function queryPacs(accessToken: string) {
  return apiRequest<{ connection: unknown; studies: unknown[] }>("/pacs/query", {
    accessToken,
    body: JSON.stringify({ aeTitle: "ECGINSIGHT", host: "localhost", modality: "ECG", port: 104 }),
    method: "POST",
  });
}

export async function exportFhirPatient(accessToken: string, patientId: string) {
  return apiRequest<{ bundle: unknown }>("/fhir/export", {
    accessToken,
    body: JSON.stringify({ patientId }),
    method: "POST",
  });
}

export async function requestTelecardiologyReview(accessToken: string, caseId: string) {
  return apiRequest<{ review: unknown }>("/telecardiology/review", {
    accessToken,
    body: JSON.stringify({ caseId }),
    method: "POST",
  });
}
