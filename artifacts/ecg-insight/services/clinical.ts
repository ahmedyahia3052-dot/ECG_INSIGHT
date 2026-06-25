import { type ECGCase, type ECGStatus } from "@/data/mockData";
import { apiRequest } from "./api";

export interface ApiPatient {
  age: number;
  dateOfBirth: string;
  firstName: string;
  gender: "male" | "female" | "other" | "unknown";
  id: string;
  lastName: string;
  medicalRecordNumber: string;
}

export interface ApiECGFile {
  downloadUrl: string;
  id: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}

export interface ApiECGCase {
  aiStatus: string;
  caseId: string;
  clinicalNotes?: string;
  ecgType: string;
  files: ApiECGFile[];
  finalDiagnosis?: string;
  id: string;
  patient: ApiPatient;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "processing" | "reviewed" | "finalized";
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
};

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

export async function createCase(accessToken: string, input: {
  ecgType: string;
  patientId: string;
  priority: "low" | "medium" | "high" | "critical";
}) {
  return apiRequest<{ case: ApiECGCase }>("/cases", {
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
