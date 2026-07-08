import {
  approveCase,
  getCase,
  listCases,
  rejectCase,
  reviewCase,
  updateCaseStatus,
  type ApiECGCase,
  type CasesResponse,
} from "@/services/clinical";

import { executeFoundationRequest } from "../api/abstraction";
import { BaseRepository } from "./base-repository";

export interface CaseTimelineEvent {
  action?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string;
  id: string;
  metadata?: unknown;
  notes?: string;
  title: string;
  type: string;
}

export interface CaseTimelineResponse {
  page: number;
  pageSize: number;
  timeline: CaseTimelineEvent[];
  total: number;
  totalPages: number;
}

export class CaseRepository extends BaseRepository {
  list(params: URLSearchParams) {
    return this.withAuth((accessToken) => listCases(accessToken, params));
  }

  getById(caseId: string) {
    return this.withAuth((accessToken) => getCase(accessToken, caseId));
  }

  assignDoctor(caseId: string, assignedDoctorId: string) {
    return this.withAuth((accessToken) =>
      executeFoundationRequest<{ case: ApiECGCase }>(`/cases/${caseId}/assign`, {
        accessToken,
        body: JSON.stringify({ assignedDoctorId }),
        method: "POST",
        retry: false,
      }),
    );
  }

  getTimeline(caseId: string, params = new URLSearchParams()) {
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.withAuth((accessToken) =>
      executeFoundationRequest<CaseTimelineResponse>(`/cases/${caseId}/timeline${suffix}`, {
        accessToken,
      }),
    );
  }

  review(
    caseId: string,
    input: Parameters<typeof reviewCase>[2],
  ) {
    return this.withAuth((accessToken) => reviewCase(accessToken, caseId, input));
  }

  approve(caseId: string) {
    return this.withAuth((accessToken) => approveCase(accessToken, caseId));
  }

  reject(caseId: string, input: Parameters<typeof rejectCase>[2]) {
    return this.withAuth((accessToken) => rejectCase(accessToken, caseId, input));
  }

  updateStatus(caseId: string, status: ApiECGCase["status"]) {
    return this.withAuth((accessToken) => updateCaseStatus(accessToken, caseId, status));
  }

  searchCases(query: {
    assignedDoctorId?: string;
    page?: number;
    pageSize?: number;
    priority?: ApiECGCase["priority"];
    q?: string;
    severity?: ApiECGCase["severity"];
    status?: ApiECGCase["status"];
  }): Promise<CasesResponse> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    params.set("pageSize", String(query.pageSize ?? 50));
    if (query.q?.trim()) params.set("q", query.q.trim());
    if (query.status) params.set("status", query.status);
    if (query.severity) params.set("severity", query.severity);
    if (query.priority) params.set("priority", query.priority);
    if (query.assignedDoctorId) params.set("assignedDoctorId", query.assignedDoctorId);
    return this.list(params);
  }
}

export const caseRepository = new CaseRepository();
