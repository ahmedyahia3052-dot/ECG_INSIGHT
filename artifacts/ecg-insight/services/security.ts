import { apiRequest } from "./api";

export async function listSecurityEvents(accessToken: string) {
  return apiRequest<{ events: unknown[] }>("/security/events", { accessToken });
}

export async function listSecuritySessions(accessToken: string) {
  return apiRequest<{ sessions: unknown[] }>("/security/sessions", { accessToken });
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

export async function getMetrics(accessToken: string) {
  return apiRequest<Record<string, unknown>>("/metrics", { accessToken });
}
