import { apiRequest } from "./api";

export interface WorkforceOrganization {
  address?: string;
  email?: string;
  id: string;
  logo?: string;
  name: string;
  phone?: string;
  status: "active" | "inactive";
  type: string;
}

export interface WorkforceDepartment {
  id: string;
  name: string;
  organizationId: string;
}

export interface ContractorCompany {
  address?: string;
  email?: string;
  id: string;
  name: string;
  organizationId: string;
  phone?: string;
  status: "active" | "inactive";
}

export interface Employee {
  contractorCompanyId?: string;
  dateOfBirth: string;
  departmentId: string;
  email?: string;
  employeeId: string;
  employmentStatus: "active" | "inactive" | "retired" | "terminated" | "on_leave";
  fullName: string;
  gender: "male" | "female" | "other" | "unknown";
  id: string;
  jobTitle?: string;
  medicalFitnessStatus:
    | "fit"
    | "fit_with_restrictions"
    | "temporarily_unfit"
    | "permanently_unfit"
    | "refer_to_cardiologist"
    | "unknown";
  nationalId: string;
  organizationId: string;
  phone?: string;
}

export interface WorkforceAnalytics {
  contractorsCount: number;
  employeesCount: number;
  highRiskCardiacEmployees: number;
  medicallyUnfitEmployees: number;
}

export async function listWorkforceOrganizations(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ organizations: WorkforceOrganization[] }>(`/organizations${suffix}`, { accessToken });
}

export async function createWorkforceOrganization(accessToken: string, input: Omit<WorkforceOrganization, "id">) {
  return apiRequest<{ organization: WorkforceOrganization }>("/organizations", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function getWorkforceAnalytics(accessToken: string, organizationId: string) {
  return apiRequest<{ analytics: WorkforceAnalytics }>(`/organizations/${organizationId}/analytics`, { accessToken });
}

export async function listDepartments(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ departments: WorkforceDepartment[] }>(`/departments${suffix}`, { accessToken });
}

export async function createDepartment(accessToken: string, input: Omit<WorkforceDepartment, "id">) {
  return apiRequest<{ department: WorkforceDepartment }>("/departments", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function listContractorCompanies(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ contractors: ContractorCompany[] }>(`/contractors${suffix}`, { accessToken });
}

export async function createContractorCompany(accessToken: string, input: Omit<ContractorCompany, "id">) {
  return apiRequest<{ contractor: ContractorCompany }>("/contractors", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function listEmployees(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ employees: Employee[] }>(`/employees${suffix}`, { accessToken });
}

export async function createEmployee(accessToken: string, input: Omit<Employee, "id">) {
  return apiRequest<{ employee: Employee }>("/employees", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateEmployee(accessToken: string, employeeId: string, input: Partial<Employee>) {
  return apiRequest<{ employee: Employee }>(`/employees/${employeeId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function linkEmployeePatient(accessToken: string, employeeId: string) {
  return apiRequest<{ patientId: string }>(`/employees/${employeeId}/link-patient`, {
    accessToken,
    method: "POST",
  });
}

export async function getEmployeeFolders(accessToken: string, employeeId: string) {
  return apiRequest<{ folder: unknown }>(`/employees/${employeeId}/folders`, { accessToken });
}
