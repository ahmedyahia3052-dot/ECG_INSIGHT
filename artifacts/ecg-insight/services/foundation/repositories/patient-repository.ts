import {
  archivePatient,
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
  type ApiPatient,
  type PatientInput,
  type PatientsResponse,
} from "@/services/clinical";

import { BaseRepository } from "./base-repository";

export class PatientRepository extends BaseRepository {
  list(params = new URLSearchParams()) {
    return this.withAuth((accessToken) => listPatients(accessToken, params));
  }

  getById(patientId: string) {
    return this.withAuth((accessToken) => getPatient(accessToken, patientId));
  }

  create(input: PatientInput) {
    return this.withAuth((accessToken) => createPatient(accessToken, input));
  }

  update(patientId: string, input: Partial<PatientInput>) {
    return this.withAuth((accessToken) => updatePatient(accessToken, patientId, input));
  }

  archive(patientId: string) {
    return this.withAuth((accessToken) => archivePatient(accessToken, patientId));
  }

  search(query: {
    gender?: string;
    page?: number;
    pageSize?: number;
    q?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    status?: string;
  }): Promise<PatientsResponse> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 12),
    });
    if (query.q?.trim()) params.set("q", query.q.trim());
    if (query.gender && query.gender !== "all") params.set("gender", query.gender);
    if (query.status && query.status !== "all") params.set("status", query.status);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDir) params.set("sortDir", query.sortDir);
    return this.list(params);
  }

  filterActive(patients: ApiPatient[]) {
    return patients.filter((patient) => patient.status !== "inactive");
  }
}

export const patientRepository = new PatientRepository();
