import { API_URL, apiRequest } from "./api";

export interface ClinicalReport {
  acquisitionDate: string;
  aiFindings?: string;
  archivedAt?: string;
  authorId: string;
  caseId: string;
  clinicalIndication?: string;
  contractorName?: string;
  createdAt: string;
  differentialDiagnosis: string[];
  ecgMeasurements?: unknown;
  electronicSignaturePath?: string;
  finalPhysicianImpression?: string;
  finalizedAt?: string;
  finalizedById?: string;
  generatedAt: string;
  id: string;
  organizationName?: string;
  patientId: string;
  physicianLicenseNumber?: string;
  physicianName: string;
  physicianSpecialty?: string;
  recommendations: string[];
  referringPhysician?: string;
  reportNumber: string;
  reportingDate: string;
  rhythmInterpretation?: string;
  severityClassification?: string;
  signedAt?: string;
  signedById?: string;
  status: "draft" | "under_review" | "finalized" | "signed" | "archived";
  updatedAt: string;
  urgentActions: string[];
}

export interface ReportVersion {
  authorId: string;
  createdAt: string;
  id: string;
  modifications: string;
  snapshot: unknown;
  versionNumber: number;
}

export interface ReportSignature {
  createdAt: string;
  id: string;
  imagePath: string;
  source: string;
  updatedAt: string;
}

export function reportPdfUrl(reportId: string, watermark?: string) {
  const query = watermark ? `?watermark=${encodeURIComponent(watermark)}` : "";
  return `${API_URL}/reports/${reportId}/pdf${query}`;
}

export async function listReports(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ reports: ClinicalReport[] }>(`/reports${suffix}`, { accessToken });
}

export async function generateReport(accessToken: string, caseId: string) {
  return apiRequest<{ report: ClinicalReport }>(`/reports/cases/${caseId}/generate`, {
    accessToken,
    method: "POST",
  });
}

export async function getReport(accessToken: string, reportId: string) {
  return apiRequest<{ report: ClinicalReport }>(`/reports/${reportId}`, { accessToken });
}

export async function updateReport(accessToken: string, reportId: string, input: Partial<ClinicalReport>) {
  return apiRequest<{ report: ClinicalReport }>(`/reports/${reportId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function setReportReviewStatus(accessToken: string, reportId: string, status: "draft" | "under_review") {
  return apiRequest<{ report: ClinicalReport }>(`/reports/${reportId}/status`, {
    accessToken,
    body: JSON.stringify({ status }),
    method: "POST",
  });
}

export async function finalizeReport(accessToken: string, reportId: string) {
  return apiRequest<{ report: ClinicalReport }>(`/reports/${reportId}/finalize`, {
    accessToken,
    method: "POST",
  });
}

export async function signReport(accessToken: string, reportId: string) {
  return apiRequest<{ report: ClinicalReport }>(`/reports/${reportId}/sign`, {
    accessToken,
    method: "POST",
  });
}

export async function archiveReport(accessToken: string, reportId: string) {
  return apiRequest<{ report: ClinicalReport }>(`/reports/${reportId}/archive`, {
    accessToken,
    method: "POST",
  });
}

export async function saveReportToPatientRecord(accessToken: string, reportId: string) {
  return apiRequest<{ documentId: string }>(`/reports/${reportId}/save-to-record`, {
    accessToken,
    method: "POST",
  });
}

export async function emailReport(accessToken: string, reportId: string, input: { message?: string; recipient: string }) {
  return apiRequest<{ emailLog: { id: string; recipient: string; sentAt: string; status: string } }>(
    `/reports/${reportId}/email`,
    {
      accessToken,
      body: JSON.stringify(input),
      method: "POST",
    },
  );
}

export async function getReportVersions(accessToken: string, reportId: string) {
  return apiRequest<{ versions: ReportVersion[] }>(`/reports/${reportId}/versions`, { accessToken });
}

export async function getMyReportSignature(accessToken: string) {
  return apiRequest<{ signature: ReportSignature | null }>("/reports/signature/me", { accessToken });
}

export async function uploadReportSignature(accessToken: string, formData: FormData) {
  return apiRequest<{ signature: ReportSignature }>("/reports/signature/upload", {
    accessToken,
    body: formData,
    method: "POST",
  });
}

export async function drawReportSignature(accessToken: string, dataUrl: string) {
  return apiRequest<{ signature: ReportSignature }>("/reports/signature/draw", {
    accessToken,
    body: JSON.stringify({ dataUrl }),
    method: "POST",
  });
}

export async function updatePhysicianReportProfile(
  accessToken: string,
  input: { licenseNumber?: string; specialization?: string },
) {
  return apiRequest<{ physician: { id: string; licenseNumber?: string; name: string; specialization?: string } }>(
    "/reports/physician-profile",
    {
      accessToken,
      body: JSON.stringify(input),
      method: "PATCH",
    },
  );
}
