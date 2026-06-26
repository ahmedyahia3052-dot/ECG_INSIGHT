import { API_ROOT_URL, apiRequest } from "./api";

export async function listSecurityEvents(accessToken: string) {
  return apiRequest<{ events: unknown[] }>("/security/events", { accessToken });
}

export async function listSecuritySessions(accessToken: string) {
  return apiRequest<{ sessions: SecuritySession[] }>("/security/sessions", { accessToken });
}

export interface SecuritySession {
  active: boolean;
  createdAt: string;
  deviceName?: string | null;
  id: string;
  ipAddress?: string | null;
  lastActivityAt: string;
  revokedAt?: string | null;
  userAgent?: string | null;
}

export async function revokeSecuritySession(accessToken: string, sessionId: string) {
  return apiRequest<{ session: SecuritySession }>(`/security/sessions/${sessionId}/revoke`, {
    accessToken,
    method: "POST",
  });
}

export async function revokeAllSecuritySessions(accessToken: string) {
  return apiRequest<{ revoked: number }>("/security/sessions/revoke-all", {
    accessToken,
    method: "POST",
  });
}

export async function listMfaMethods(accessToken: string) {
  return apiRequest<{ methods: unknown[] }>("/security/mfa", { accessToken });
}

export async function listAuditLogs(accessToken: string) {
  return apiRequest<{ logs: unknown[] }>("/audit", { accessToken });
}

export async function listConsents(accessToken: string) {
  return apiRequest<{ consents: unknown[] }>("/compliance/consents", { accessToken });
}

export async function listDataRequests(accessToken: string) {
  return apiRequest<{ requests: unknown[] }>("/compliance/requests", { accessToken });
}

export async function listBackupJobs(accessToken: string) {
  return apiRequest<{ jobs: unknown[] }>("/backup", { accessToken });
}

export interface ProductionReadiness {
  activeUsers: number;
  components: Record<string, {
    details?: unknown;
    durationMs: number;
    ok: boolean;
    status: "degraded" | "down" | "healthy";
  }>;
  environment: string;
  metrics: Record<string, unknown>;
  ok: boolean;
  service: string;
  status: "degraded" | "down" | "healthy";
  timestamp: string;
}

export async function getProductionReadiness(accessToken: string) {
  return apiRequest<{ readiness: ProductionReadiness }>("/health/readiness-dashboard", { accessToken });
}

export async function getMetrics(accessToken: string) {
  const response = await fetch(`${API_ROOT_URL}/metrics`, {
    credentials: "include",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Unable to load API metrics.");
  return (await response.json()) as Record<string, unknown>;
}
