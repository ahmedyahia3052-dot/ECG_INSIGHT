import { apiRequest, checkBackendHealth } from "./api";

export type ServiceStatus = "offline" | "operational";

export interface StatusCheck {
  details?: string;
  name: string;
  status: ServiceStatus;
}

async function probe(name: string, request: () => Promise<unknown>): Promise<StatusCheck> {
  try {
    await request();
    return { name, status: "operational" };
  } catch (error) {
    return { details: error instanceof Error ? error.message : "Service unavailable.", name, status: "offline" };
  }
}

export async function getSystemStatus(): Promise<StatusCheck[]> {
  const backend = await checkBackendHealth();
  const checks = await Promise.all([
    probe("Authentication Service", () => apiRequest("/auth/email-availability?email=status%40ecginsight.health")),
    probe("Database", () => apiRequest("/health/db")),
    probe("AI Engine", () => apiRequest("/health/ai")),
  ]);

  return [
    { name: "Frontend", status: "operational" },
    { details: backend.message, name: "API", status: backend.ok ? "operational" : "offline" },
    ...checks,
  ];
}
