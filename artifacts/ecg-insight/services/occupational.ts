import { apiRequest } from "./api";

export interface OccupationalRiskProfile {
  diabetes: boolean;
  dyslipidemia: boolean;
  employeeId: string;
  familyHistory: boolean;
  highRisk: boolean;
  hypertension: boolean;
  id: string;
  obesity: boolean;
  previousMI: boolean;
  previousStroke: boolean;
  riskScore: number;
  smoking: boolean;
}

export interface FitnessAssessment {
  assessedById: string;
  createdAt: string;
  employeeId: string;
  finalDecision: string;
  id: string;
  occupationalReportSection: unknown;
  patientId?: string;
  physicianJustification: string;
  recommendation: string;
  restrictions?: Array<{ active: boolean; description: string; id: string; type: string }>;
  reviewDate?: string;
}

export interface WorkRestriction {
  active: boolean;
  description: string;
  employeeId: string;
  id: string;
  type: string;
}

export interface OccupationalAnalytics {
  fitEmployees: number;
  highRiskEmployees: number;
  restrictedEmployees: number;
  unfitEmployees: number;
}

export async function getOccupationalRisk(accessToken: string, employeeId: string) {
  return apiRequest<{ profile: OccupationalRiskProfile | null }>(`/occupational-risk/${employeeId}`, { accessToken });
}

export async function saveOccupationalRisk(accessToken: string, employeeId: string, input: Partial<OccupationalRiskProfile>) {
  return apiRequest<{ profile: OccupationalRiskProfile }>(`/occupational-risk/${employeeId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PUT",
  });
}

export async function deleteOccupationalRisk(accessToken: string, employeeId: string) {
  return apiRequest<void>(`/occupational-risk/${employeeId}`, { accessToken, method: "DELETE" });
}

export async function getOccupationalAnalytics(accessToken: string, organizationId?: string) {
  const suffix = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
  return apiRequest<{ analytics: OccupationalAnalytics }>(`/occupational-risk/analytics${suffix}`, { accessToken });
}

export async function createFitnessAssessment(
  accessToken: string,
  input: { employeeId: string; physicianJustification?: string; reviewDate?: string },
) {
  return apiRequest<{ assessment: FitnessAssessment }>("/fitness-assessments", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateFitnessAssessment(
  accessToken: string,
  assessmentId: string,
  input: Pick<Partial<FitnessAssessment>, "physicianJustification" | "reviewDate">,
) {
  return apiRequest<{ assessment: FitnessAssessment }>(`/fitness-assessments/${assessmentId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function deleteFitnessAssessment(accessToken: string, assessmentId: string) {
  return apiRequest<void>(`/fitness-assessments/${assessmentId}`, { accessToken, method: "DELETE" });
}

export async function listFitnessAssessments(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ assessments: FitnessAssessment[] }>(`/fitness-assessments${suffix}`, { accessToken });
}

export async function createWorkRestriction(accessToken: string, input: Omit<WorkRestriction, "id">) {
  return apiRequest<{ restriction: WorkRestriction }>("/work-restrictions", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateWorkRestriction(accessToken: string, restrictionId: string, input: Partial<WorkRestriction>) {
  return apiRequest<{ restriction: WorkRestriction }>(`/work-restrictions/${restrictionId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function deleteWorkRestriction(accessToken: string, restrictionId: string) {
  return apiRequest<void>(`/work-restrictions/${restrictionId}`, { accessToken, method: "DELETE" });
}

export async function listWorkRestrictions(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ restrictions: WorkRestriction[] }>(`/work-restrictions${suffix}`, { accessToken });
}
