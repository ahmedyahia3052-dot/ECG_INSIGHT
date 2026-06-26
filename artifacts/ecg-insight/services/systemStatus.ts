import { apiRequest } from "./api";

export type ServiceStatus = "degraded" | "offline" | "operational";

export interface StatusCheck {
  details?: string;
  name: string;
  status: ServiceStatus;
}

async function probe(name: string, request: () => Promise<unknown>): Promise<StatusCheck> {
  try {
    const response = await request();
    const status = response && typeof response === "object" && "status" in response ? String((response as { status?: string }).status) : "ok";
    return { name, status: status === "degraded" ? "degraded" : status === "offline" || status === "down" ? "offline" : "operational" };
  } catch (error) {
    return { details: error instanceof Error ? error.message : "Service unavailable.", name, status: "offline" };
  }
}

export async function getSystemStatus(): Promise<StatusCheck[]> {
  const checks = await Promise.all([
    probe("Frontend", () => apiRequest("/health/frontend")),
    probe("API Gateway", () => apiRequest("/health")),
    probe("Authentication Service", () => apiRequest("/health/auth")),
    probe("Database", () => apiRequest("/health/database")),
    probe("AI Engine", () => apiRequest("/health/ai")),
  ]);

  return checks;
}
