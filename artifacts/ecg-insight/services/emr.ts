import { apiRequest } from "./api";
import type { ApiPatient } from "./clinical";

export interface ComprehensiveCardiacHistory {
  arrhythmia: boolean;
  arrhythmiaHistory: boolean;
  congenitalHeartDisease: boolean;
  coronaryArteryDisease: boolean;
  diabetesMellitus: boolean;
  dyslipidemia: boolean;
  familyHistoryHeartDisease: boolean;
  heartFailure: boolean;
  hypertension: boolean;
  myocardialInfarctionHistory: boolean;
  obesity: boolean;
  previousStroke: boolean;
  rheumaticHeartDisease: boolean;
  smokingStatus: "never" | "former" | "current" | "unknown";
  valvularDisease: boolean;
}

export interface CardiacProcedure {
  documents: string[];
  findings?: string;
  hospital?: string;
  id: string;
  images: string[];
  notes?: string;
  operatorPhysician?: string;
  patientId: string;
  procedureDate: string;
  procedureType: string;
}

export interface CardiacImaging {
  downloadUrl: string;
  findings?: string;
  id: string;
  imagingType: string;
  mimeType: string;
  notes?: string;
  originalName: string;
  patientId: string;
  performedAt?: string;
  sizeBytes: number;
  title: string;
}

export interface MedicationHistory {
  active: boolean;
  category: string;
  dose: string;
  drugName: string;
  frequency: string;
  id: string;
  notes?: string;
  patientId: string;
  startDate: string;
  stopDate?: string;
}

export interface EmrTimelineEvent {
  createdAt: string;
  id: string;
  metadata?: unknown;
  notes?: string;
  patientId: string;
  title: string;
  type: string;
}

export async function getComprehensiveCardiacHistory(accessToken: string, patientId: string) {
  return apiRequest<{ cardiacHistory: (ComprehensiveCardiacHistory & { id: string; patientId: string }) | null }>(
    `/emr/patients/${patientId}/cardiac-history`,
    { accessToken },
  );
}

export async function saveComprehensiveCardiacHistory(
  accessToken: string,
  patientId: string,
  input: ComprehensiveCardiacHistory,
) {
  return apiRequest<{ cardiacHistory: ComprehensiveCardiacHistory & { id: string; patientId: string } }>(
    `/emr/patients/${patientId}/cardiac-history`,
    {
      accessToken,
      body: JSON.stringify(input),
      method: "PUT",
    },
  );
}

export async function listCardiacProcedures(accessToken: string, patientId: string) {
  return apiRequest<{ procedures: CardiacProcedure[] }>(`/emr/patients/${patientId}/procedures`, { accessToken });
}

export async function createCardiacProcedure(accessToken: string, patientId: string, input: Omit<CardiacProcedure, "id" | "patientId">) {
  return apiRequest<{ procedure: CardiacProcedure }>(`/emr/patients/${patientId}/procedures`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateCardiacProcedure(accessToken: string, procedureId: string, input: Partial<CardiacProcedure>) {
  return apiRequest<{ procedure: CardiacProcedure }>(`/emr/procedures/${procedureId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function listCardiacImaging(accessToken: string, patientId: string) {
  return apiRequest<{ imaging: CardiacImaging[] }>(`/emr/patients/${patientId}/imaging`, { accessToken });
}

export async function uploadCardiacImaging(accessToken: string, patientId: string, formData: FormData) {
  return apiRequest<{ imaging: CardiacImaging }>(`/emr/patients/${patientId}/imaging`, {
    accessToken,
    body: formData,
    method: "POST",
  });
}

export async function listMedicationHistory(accessToken: string, patientId: string) {
  return apiRequest<{ medications: MedicationHistory[] }>(`/emr/patients/${patientId}/medications`, {
    accessToken,
  });
}

export async function createMedicationHistory(accessToken: string, patientId: string, input: Omit<MedicationHistory, "id" | "patientId">) {
  return apiRequest<{ medication: MedicationHistory }>(`/emr/patients/${patientId}/medications`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateMedicationHistory(accessToken: string, medicationId: string, input: Partial<MedicationHistory>) {
  return apiRequest<{ medication: MedicationHistory }>(`/emr/medications/${medicationId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function getMedicationLibrary(accessToken: string) {
  return apiRequest<{ medications: Array<{ category: string; name: string }> }>("/emr/medication-library", {
    accessToken,
  });
}

export async function getUnifiedPatientTimeline(accessToken: string, patientId: string) {
  return apiRequest<{ timeline: EmrTimelineEvent[] }>(`/emr/patients/${patientId}/timeline`, { accessToken });
}

export async function searchEmrPatients(accessToken: string, params: URLSearchParams) {
  return apiRequest<{ page: number; pageSize: number; patients: ApiPatient[]; total: number; totalPages: number }>(
    `/emr/search?${params.toString()}`,
    { accessToken },
  );
}
