import {
  approveCase,
  archivePatient,
  createCaseRevision,
  getCase,
  getPatientEcgHistory,
  listCases,
  listPatients,
  rejectCase,
  updateCaseStatus,
  type ApiECGCase,
} from "@/services/clinical";

export class ClinicalDomainService {
  listDashboardCases(accessToken: string) {
    return listCases(accessToken, new URLSearchParams({ pageSize: "8" }));
  }

  listDashboardPatients(accessToken: string) {
    return listPatients(accessToken, new URLSearchParams({ pageSize: "8" }));
  }

  listCases(accessToken: string, params: URLSearchParams) {
    return listCases(accessToken, params);
  }

  listPatients(accessToken: string, params: URLSearchParams) {
    return listPatients(accessToken, params);
  }

  archivePatient(accessToken: string, patientId: string) {
    return archivePatient(accessToken, patientId);
  }

  getCase(accessToken: string, caseId: string) {
    return getCase(accessToken, caseId);
  }

  getPatientHistory(accessToken: string, patientId: string) {
    return getPatientEcgHistory(accessToken, patientId);
  }

  approve(accessToken: string, caseId: string) {
    return approveCase(accessToken, caseId);
  }

  reject(accessToken: string, caseId: string, reason: string) {
    return rejectCase(accessToken, caseId, { reason });
  }

  updateStatus(accessToken: string, caseId: string, status: ApiECGCase["status"]) {
    return updateCaseStatus(accessToken, caseId, status);
  }

  createRevision(accessToken: string, caseId: string) {
    return createCaseRevision(accessToken, caseId);
  }
}

export const clinicalDomainService = new ClinicalDomainService();
