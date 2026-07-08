import { assertFoundationRole } from "../auth/middleware";
import { caseRepository } from "../repositories/case-repository";
import { organizationRepository } from "../repositories/organization-repository";
import { patientRepository } from "../repositories/patient-repository";

import { BaseService } from "./base-service";

export class ClinicalApiService extends BaseService {
  protected readonly scope = "clinical-api-service";

  async loadWorkspaceSnapshot(query: {
    caseQuery?: string;
    caseStatus?: string;
    departmentOrganizationId?: string;
    patientQuery?: string;
  }) {
    assertFoundationRole(["admin", "doctor", "super_admin"]);

    const caseParams = new URLSearchParams({ pageSize: "25" });
    if (query.caseQuery?.trim()) caseParams.set("q", query.caseQuery.trim());
    if (query.caseStatus && query.caseStatus !== "all") caseParams.set("status", query.caseStatus);

    const departmentParams = new URLSearchParams();
    if (query.departmentOrganizationId) {
      departmentParams.set("organizationId", query.departmentOrganizationId);
    }

    const [organizations, departments, doctors, patients, cases] = await Promise.all([
      organizationRepository.listOrganizations(),
      organizationRepository.listDepartments(departmentParams),
      organizationRepository.listDoctors(),
      patientRepository.search({ pageSize: 25, q: query.patientQuery }),
      caseRepository.list(caseParams),
    ]);

    this.logInfo("Loaded clinical workspace snapshot", {
      caseCount: cases.cases.length,
      departmentCount: departments.departments.length,
      doctorCount: doctors.users.length,
      organizationCount: organizations.organizations.length,
      patientCount: patients.patients.length,
    });

    return {
      cases: cases.cases,
      departments: departments.departments,
      doctors: organizationRepository.filterDoctors(doctors.users),
      organizations: organizationRepository.activeOrganizations(organizations.organizations),
      patients: patients.patients,
    };
  }

  assignDoctorToCase(caseId: string, assignedDoctorId: string) {
    assertFoundationRole(["admin", "doctor", "super_admin"]);
    this.logInfo("Assigning doctor to case", { assignedDoctorId, caseId });
    return caseRepository.assignDoctor(caseId, assignedDoctorId);
  }

  reviewAssignedCase(
    caseId: string,
    input: Parameters<typeof caseRepository.review>[1],
  ) {
    assertFoundationRole(["admin", "doctor", "super_admin"]);
    this.logInfo("Submitting case review", { caseId });
    return caseRepository.review(caseId, input);
  }

  loadCaseTimeline(caseId: string) {
    assertFoundationRole(["admin", "doctor", "super_admin"]);
    return caseRepository.getTimeline(caseId);
  }

  loadPatientDocuments(patientId: string) {
    assertFoundationRole(["admin", "doctor", "super_admin"]);
    const params = new URLSearchParams({ patientId });
    return organizationRepository.listDocuments(params);
  }
}

export const clinicalApiService = new ClinicalApiService();
