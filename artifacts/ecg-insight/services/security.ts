import { API_ROOT_URL, apiRequest } from "./api";

export async function listSecurityEvents(accessToken: string) {
  return apiRequest<{ events: SecurityEvent[] }>("/security/events", { accessToken });
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

export interface SecurityEvent {
  createdAt: string;
  eventType: string;
  id: string;
  ipAddress?: string | null;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
}

export interface TrustedDevice {
  createdAt: string;
  deviceFingerprint: string;
  deviceName: string;
  id: string;
  ipAddress?: string | null;
  lastSeenAt: string;
  revokedAt?: string | null;
  trusted: boolean;
}

export interface MfaMethod {
  enabled: boolean;
  id: string;
  lastUsedAt?: string | null;
  type: "EMAIL_OTP" | "TOTP";
  verifiedAt?: string | null;
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
  return apiRequest<{ methods: MfaMethod[] }>("/security/mfa", { accessToken });
}

export async function createMfaMethod(accessToken: string, type: "EMAIL_OTP" | "TOTP") {
  return apiRequest<{ method: MfaMethod; otp?: string; recoveryCodes: string[]; secret?: string }>("/security/mfa", {
    accessToken,
    body: JSON.stringify({ type }),
    method: "POST",
  });
}

export async function verifyMfaMethod(accessToken: string, methodId: string, code: string) {
  return apiRequest<{ method: MfaMethod; valid: boolean }>(`/security/mfa/${methodId}/verify`, {
    accessToken,
    body: JSON.stringify({ code }),
    method: "POST",
  });
}

export async function regenerateRecoveryCodes(accessToken: string) {
  return apiRequest<{ recoveryCodes: string[] }>("/security/mfa/recovery/regenerate", {
    accessToken,
    method: "POST",
  });
}

export async function listTrustedDevices(accessToken: string) {
  return apiRequest<{ devices: TrustedDevice[] }>("/security/devices", { accessToken });
}

export async function revokeTrustedDevice(accessToken: string, deviceId: string) {
  return apiRequest<{ device: TrustedDevice }>(`/security/devices/${deviceId}/revoke`, {
    accessToken,
    method: "POST",
  });
}

export interface SecurityMonitoringSummary {
  activeSessions: number;
  failedLogins24h: number;
  openCritical: number;
  riskScore: number;
  siemReady: boolean;
  suspiciousEvents24h: number;
  trustedDevices: number;
}

export async function getSecurityMonitoringSummary(accessToken: string) {
  return apiRequest<{ summary: SecurityMonitoringSummary }>("/security/monitoring/summary", { accessToken });
}

export async function listSecurityPolicies(accessToken: string) {
  return apiRequest<{ policies: unknown[] }>("/security/policies", { accessToken });
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

export async function listRetentionPolicies(accessToken: string) {
  return apiRequest<{ policies: unknown[] }>("/compliance/retention-policies", { accessToken });
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
