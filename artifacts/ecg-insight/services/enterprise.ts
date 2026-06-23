import { apiRequest } from "./api";
import type { ApiPatient } from "./clinical";

export interface OrganizationUnit {
  id: string;
  name: string;
  organizationId: string;
}

export interface Organization {
  address?: string;
  contractors: OrganizationUnit[];
  createdAt: string;
  departments: OrganizationUnit[];
  email?: string;
  id: string;
  logo?: string;
  name: string;
  phone?: string;
  status: "active" | "inactive";
  type: "hospital" | "clinic" | "company" | "contractor" | "government" | "other";
}

export interface TimelineEvent {
  caseId?: string;
  createdAt: string;
  id: string;
  metadata?: unknown;
  notes?: string;
  patientId: string;
  title: string;
  type: string;
}

export interface OrganizationAnalytics {
  abnormalEcgPercentage: number;
  criticalEcgPercentage: number;
  diseasePrevalence: Record<string, number>;
  monthlyTrends: Record<string, number>;
  totalEcgs: number;
  totalEmployees: number;
}

export interface CardiacHistory {
  arrhythmia: boolean;
  congenitalHeartDisease: boolean;
  coronaryArteryDisease: boolean;
  heartFailure: boolean;
  myocardialInfarctionHistory: boolean;
  valvularDisease: boolean;
}

export async function listOrganizations(accessToken: string) {
  return apiRequest<{ organizations: Organization[] }>("/enterprise/organizations", { accessToken });
}

export async function createOrganization(accessToken: string, input: Partial<Organization> & { name: string }) {
  return apiRequest<{ organization: Organization }>("/enterprise/organizations", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function addDepartment(accessToken: string, organizationId: string, name: string) {
  return apiRequest<{ department: OrganizationUnit }>(`/enterprise/organizations/${organizationId}/departments`, {
    accessToken,
    body: JSON.stringify({ name }),
    method: "POST",
  });
}

export async function addContractor(accessToken: string, organizationId: string, name: string) {
  return apiRequest<{ contractor: OrganizationUnit }>(`/enterprise/organizations/${organizationId}/contractors`, {
    accessToken,
    body: JSON.stringify({ name }),
    method: "POST",
  });
}

export async function searchEnterprisePatients(accessToken: string, params: URLSearchParams) {
  return apiRequest<{ page: number; pageSize: number; patients: ApiPatient[]; total: number; totalPages: number }>(
    `/enterprise/patients/search?${params.toString()}`,
    { accessToken },
  );
}

export async function getCardiacHistory(accessToken: string, patientId: string) {
  return apiRequest<{ cardiacHistory: (CardiacHistory & { id: string; patientId: string }) | null }>(
    `/enterprise/patients/${patientId}/cardiac-history`,
    { accessToken },
  );
}

export async function saveCardiacHistory(accessToken: string, patientId: string, input: CardiacHistory) {
  return apiRequest<{ cardiacHistory: CardiacHistory & { id: string; patientId: string } }>(
    `/enterprise/patients/${patientId}/cardiac-history`,
    {
      accessToken,
      body: JSON.stringify(input),
      method: "PUT",
    },
  );
}

export async function getPatientTimeline(accessToken: string, patientId: string) {
  return apiRequest<{ timeline: TimelineEvent[] }>(`/enterprise/patients/${patientId}/timeline`, { accessToken });
}

export async function getOrganizationAnalytics(accessToken: string, organizationId: string) {
  return apiRequest<{ analytics: OrganizationAnalytics }>(`/enterprise/organizations/${organizationId}/analytics`, {
    accessToken,
  });
}
