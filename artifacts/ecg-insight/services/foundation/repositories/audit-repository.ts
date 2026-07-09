import { apiRequest } from "@/services/api";

import { BaseRepository } from "./base-repository";

export type AuditLogRecord = {
  action: string;
  actorId: string;
  actorName?: string;
  createdAt: string;
  id: string;
  newValue?: unknown;
  oldValue?: unknown;
  resourceId?: string;
  resourceType: string;
};

export class AuditRepository extends BaseRepository {
  list(accessToken: string, params = new URLSearchParams({ pageSize: "50" })) {
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<{ auditLogs: AuditLogRecord[]; page: number; pageSize: number; total: number }>(`/audit${suffix}`, {
      accessToken,
    });
  }
}

export const auditRepository = new AuditRepository();
