import { listClinicalDocuments, type ClinicalDocument } from "@/services/documents";
import {
  addDepartment,
  createOrganization,
  listOrganizations,
  type Organization,
} from "@/services/enterprise";
import { listDepartments, listEmployees, type Employee, type WorkforceDepartment } from "@/services/workforce";

import { executeFoundationRequest } from "../api/abstraction";
import { BaseRepository } from "./base-repository";

export interface ClinicalDoctor {
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  role: string;
  specialization?: string;
}

export class OrganizationRepository extends BaseRepository {
  listOrganizations() {
    return this.withAuth((accessToken) => listOrganizations(accessToken));
  }

  createOrganization(input: Parameters<typeof createOrganization>[1]) {
    return this.withAuth((accessToken) => createOrganization(accessToken, input));
  }

  addDepartment(organizationId: string, name: string) {
    return this.withAuth((accessToken) => addDepartment(accessToken, organizationId, name));
  }

  listDepartments(params = new URLSearchParams()) {
    return this.withAuth((accessToken) => listDepartments(accessToken, params));
  }

  listEmployees(params = new URLSearchParams()) {
    return this.withAuth((accessToken) => listEmployees(accessToken, params));
  }

  listDoctors() {
    return this.withAuth((accessToken) =>
      executeFoundationRequest<{ users: ClinicalDoctor[] }>("/users", { accessToken }),
    );
  }

  listDocuments(params: URLSearchParams) {
    return this.withAuth((accessToken) => listClinicalDocuments(accessToken, params));
  }

  filterDoctors(users: ClinicalDoctor[]) {
    return users.filter((user) => user.role.toLowerCase() === "doctor");
  }

  departmentsForOrganization(departments: WorkforceDepartment[], organizationId: string) {
    return departments.filter((department) => department.organizationId === organizationId);
  }

  employeesForDepartment(employees: Employee[], departmentId: string) {
    return employees.filter((employee) => employee.departmentId === departmentId);
  }

  documentsForPatient(documents: ClinicalDocument[], patientId: string) {
    return documents.filter((document) => document.patientId === patientId);
  }

  activeOrganizations(organizations: Organization[]) {
    return organizations.filter((organization) => organization.status === "active");
  }
}

export const organizationRepository = new OrganizationRepository();
