import { type ECGCase, type ECGStatus } from "@/data/mockData";
import { apiRequest } from "./api";

export interface ApiPatient {
  address?: string;
  alcoholStatus?: string;
  age: number;
  allergies?: string;
  arrhythmiaHistory?: boolean;
  archivedAt?: string;
  bloodGroup?: string;
  bmi?: number;
  company?: string;
  contractor?: string;
  dateOfBirth: string;
  diabetes?: boolean;
  department?: string;
  dyslipidemia?: boolean;
  email?: string;
  employeeId?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  familyHistory?: boolean;
  firstName: string;
  fullName?: string;
  gender: "male" | "female" | "other" | "unknown";
  heartFailure?: boolean;
  heightCm?: number;
  hypertension?: boolean;
  id: string;
  ischemicHeartDisease?: boolean;
  jobTitle?: string;
  knownAllergies?: string;
  lastName: string;
  maritalStatus?: string;
  medicalHistory?: string;
  medicalRecordNumber: string;
  medications?: string;
  middleName?: string;
  nationalId?: string;
  notes?: string;
  obesity?: boolean;
  occupation?: string;
  passportNumber?: string;
  patientCode?: string;
  phone?: string;
  previousCABG?: boolean;
  previousMI?: boolean;
  previousPCI?: boolean;
  smokingStatus?: "current" | "former" | "never" | "unknown";
  status?: "active" | "inactive";
  stentsHistory?: string;
  weightKg?: number;
}

export interface ApiECGFile {
  createdAt?: string;
  downloadUrl: string;
  id: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}

export interface ApiECGCase {
  acquisitionDate: string;
  aiDiagnosis?: string;
  aiStatus: string;
  caseId: string;
  caseNumber?: string;
  clinicalComments?: string;
  clinicalNotes?: string;
  confidenceScore?: number;
  doctorDiagnosis?: string;
  ecgType: string;
  files: ApiECGFile[];
  finalDiagnosis?: string;
  finalizedAt?: string;
  heartRate?: number;
  id: string;
  imagePath?: string;
  originalFileUrl?: string;
  patient: ApiPatient;
  pdfPath?: string;
  preprocessedImagePath?: string;
  prInterval?: number;
  priority: "low" | "medium" | "high" | "critical";
  qrsDuration?: number;
  qtInterval?: number;
  qtcInterval?: number;
  recommendations?: string;
  reportCount?: number;
  reviewedAt?: string;
  reviewedById?: string;
  rhythm?: string;
  severity?: "normal" | "abnormal" | "critical";
  status: "ai_completed" | "approved" | "finalized" | "pending" | "processing" | "rejected" | "reviewed" | "under_review" | "uploaded";
  uploadDate: string;
  uploadedById: string;
}

export interface CasesResponse {
  cases: ApiECGCase[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PatientsResponse {
  page: number;
  pageSize: number;
  patients: ApiPatient[];
  total: number;
  totalPages: number;
}

export type PatientInput = {
  dateOfBirth: string;
  firstName: string;
  gender: "male" | "female" | "other" | "unknown";
  lastName: string;
  medicalRecordNumber: string;
  alcoholStatus?: string;
  arrhythmiaHistoryFlag?: boolean;
  bloodGroup?: string;
  bmi?: number;
  company?: string;
  contractorName?: string;
  departmentName?: string;
  diabetes?: boolean;
  dyslipidemia?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  heartFailure?: boolean;
  heightCm?: number;
  hypertension?: boolean;
  ischemicHeartDisease?: boolean;
  jobTitle?: string;
  knownAllergies?: string;
  maritalStatus?: string;
  middleName?: string;
  passportNumber?: string;
  previousCABG?: boolean;
  previousMI?: boolean;
  previousPCI?: boolean;
  status?: "active" | "inactive";
  stentsHistory?: string;
  weightKg?: number;
  address?: string;
  allergies?: string;
  email?: string;
  employeeId?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  medications?: string;
  nationalId?: string;
  notes?: string;
  occupation?: string;
  phone?: string;
  smokingStatus?: "current" | "former" | "never" | "unknown";
};

export interface PatientDetailResponse {
  patient: ApiPatient;
  related: {
    cases: Array<{
      aiDiagnosis?: string;
      aiSeverity?: string;
      caseId: string;
      caseNumber?: string;
      finalDiagnosis?: string;
      heartRate?: number;
      id: string;
      priority: string;
      rhythm?: string;
      severity?: string;
      status: string;
      uploadDate: string;
    }>;
    documents: Array<{
      category: string;
      createdAt: string;
      downloadUrl: string;
      id: string;
      mimeType: string;
      originalName: string;
      sizeBytes: number;
      title: string;
      uploadedById: string;
    }>;
    reports: Array<{
      id: string;
      reportNumber: string;
      reportingDate: string;
      status: string;
    }>;
    timeline: Array<{
      createdAt: string;
      id: string;
      metadata?: unknown;
      notes?: string;
      title: string;
      type: string;
    }>;
  };
}

function toMockStatus(apiCase: ApiECGCase): ECGStatus {
  if (apiCase.priority === "critical") return "critical";
  if (apiCase.finalDiagnosis || apiCase.status === "reviewed" || apiCase.status === "finalized") {
    return "abnormal";
  }
  return "normal";
}

export function apiCaseToEcgCase(apiCase: ApiECGCase): ECGCase {
  const patientGender = apiCase.patient.gender === "female" ? "F" : "M";
  return {
    analyzedBy: apiCase.aiStatus === "completed" ? "ECG Insight AI v2.4" : "Pending AI Review",
    confidence: apiCase.finalDiagnosis ? 95 : 0,
    date: apiCase.uploadDate,
    diagnosis: apiCase.finalDiagnosis ?? `${apiCase.ecgType} - ${apiCase.status}`,
    findings: [
      {
        label: "Case Status",
        severity: apiCase.priority === "critical" ? "severe" : "normal",
        value: apiCase.status,
      },
      {
        label: "Priority",
        severity: apiCase.priority === "critical" ? "severe" : "mild",
        value: apiCase.priority,
      },
    ],
    heartRate: 72,
    id: apiCase.id,
    patientAge: apiCase.patient.age,
    patientGender,
    patientName: `${apiCase.patient.firstName} ${apiCase.patient.lastName}`,
    prInterval: 160,
    qrsDuration: 88,
    qtInterval: 400,
    recommendations: [
      apiCase.clinicalNotes ?? "Review ECG trace and confirm findings with clinical judgment.",
    ],
    rhythm: apiCase.ecgType,
    status: toMockStatus(apiCase),
    uploadedById: apiCase.uploadedById,
  };
}

export async function listCases(accessToken: string, params: URLSearchParams) {
  return apiRequest<CasesResponse>(`/cases?${params.toString()}`, { accessToken });
}

export async function listPatients(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<PatientsResponse>(`/patients${suffix}`, { accessToken });
}

export async function getCase(accessToken: string, caseId: string) {
  return apiRequest<{ case: ApiECGCase }>(`/cases/${caseId}`, { accessToken });
}

export async function getPatient(accessToken: string, patientId: string) {
  return apiRequest<PatientDetailResponse>(`/patients/${patientId}`, { accessToken });
}

export async function createCase(accessToken: string, input: {
  acquisitionDate?: string;
  confidenceScore?: number;
  doctorDiagnosis?: string;
  ecgType: string;
  heartRate?: number;
  patientId: string;
  prInterval?: number;
  priority: "low" | "medium" | "high" | "critical";
  qrsDuration?: number;
  qtInterval?: number;
  qtcInterval?: number;
  recommendations?: string;
  rhythm?: string;
  severity?: "normal" | "abnormal" | "critical";
}) {
  return apiRequest<{ case: ApiECGCase }>("/cases", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateCase(accessToken: string, caseId: string, input: Partial<ApiECGCase>) {
  return apiRequest<{ case: ApiECGCase }>(`/cases/${caseId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function updateCaseStatus(accessToken: string, caseId: string, status: ApiECGCase["status"]) {
  return apiRequest<{ case: ApiECGCase }>(`/cases/${caseId}/status`, {
    accessToken,
    body: JSON.stringify({ status }),
    method: "POST",
  });
}

export async function reviewCase(accessToken: string, caseId: string, input: {
  clinicalComments?: string;
  doctorDiagnosis?: string;
  recommendations?: string;
  severity?: "normal" | "abnormal" | "critical";
}) {
  return apiRequest<{ case: ApiECGCase }>(`/cases/${caseId}/review`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function approveCase(accessToken: string, caseId: string) {
  return apiRequest<{ case: ApiECGCase }>(`/cases/${caseId}/approve`, {
    accessToken,
    method: "POST",
  });
}

export async function rejectCase(accessToken: string, caseId: string, input: { clinicalComments?: string; reason?: string }) {
  return apiRequest<{ case: ApiECGCase }>(`/cases/${caseId}/reject`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function createPatient(accessToken: string, input: PatientInput) {
  return apiRequest<{ patient: ApiPatient }>("/patients", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updatePatient(accessToken: string, patientId: string, input: Partial<PatientInput>) {
  return apiRequest<{ patient: ApiPatient }>(`/patients/${patientId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function archivePatient(accessToken: string, patientId: string) {
  return apiRequest<{ patient: ApiPatient }>(`/patients/${patientId}`, {
    accessToken,
    method: "DELETE",
  });
}
