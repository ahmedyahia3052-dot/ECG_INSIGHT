import { apiRequest } from "./api";

export interface EnterpriseClinicalDashboard {
  aiAccuracy: number | null;
  aiMetrics: {
    accuracy: number | null;
    f1: number | null;
    precision: number | null;
    recall: number | null;
    source: string;
  };
  avgProcessingTimeMs: number;
  criticalEcgs: number;
  hospitalActivity: Array<{ casesToday: number; hospital: string }>;
  modelOnline: boolean;
  pendingReviews: number;
  recentCritical: Array<{
    aiDiagnosis: string | null;
    caseId: string;
    id: string;
    patientName: string;
    severity: string;
    uploadDate: string;
  }>;
  todaysEcgs: number;
  updatedAt: string;
}

export async function getEnterpriseClinicalDashboard(accessToken: string) {
  return apiRequest<{ dashboard: EnterpriseClinicalDashboard }>("/enterprise/clinical-dashboard", { accessToken });
}

export interface AuditLogEntry {
  action: string;
  actor: { email: string; id: string; name: string; role: string } | null;
  actorId: string;
  caseId?: string;
  createdAt: string;
  id: string;
  message: string;
  metadata?: unknown;
  newValue?: unknown;
  oldValue?: unknown;
  patientId?: string;
}

export async function listAuditLogs(accessToken: string, params?: URLSearchParams) {
  const query = params ? `?${params.toString()}` : "";
  return apiRequest<{ logs: AuditLogEntry[] }>(`/audit${query}`, { accessToken });
}
