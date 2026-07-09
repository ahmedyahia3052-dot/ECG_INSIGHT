import { apiRequest } from "@/services/api";

import { BaseRepository } from "./base-repository";

export type DoctorRecord = {
  email: string;
  id: string;
  licenseNumber?: string;
  name: string;
  role: string;
  specialization?: string;
};

export class DoctorRepository extends BaseRepository {
  list(accessToken: string, params = new URLSearchParams({ role: "doctor" })) {
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<{ users: DoctorRecord[] }>(`/users${suffix}`, { accessToken });
  }

  getById(accessToken: string, doctorId: string) {
    return apiRequest<{ user: DoctorRecord }>(`/users/${doctorId}`, { accessToken });
  }
}

export const doctorRepository = new DoctorRepository();
