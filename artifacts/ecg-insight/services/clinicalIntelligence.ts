import { apiRequest } from "./api";

export interface ClinicalConversation {
  answer: string;
  confidenceScore: number;
  createdAt: string;
  id: string;
  patientId: string;
  question: string;
}

export async function askClinicalAssistant(accessToken: string, patientId: string, question: string) {
  return apiRequest<{ conversation: ClinicalConversation }>("/assistant/chat", {
    accessToken,
    body: JSON.stringify({ patientId, question }),
    method: "POST",
  });
}

export async function calculateRisk(accessToken: string, patientId: string) {
  return apiRequest<{ assessments: unknown[] }>("/risk/calculate", {
    accessToken,
    body: JSON.stringify({ patientId }),
    method: "POST",
  });
}

export async function listTrends(accessToken: string, patientId?: string) {
  const suffix = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
  return apiRequest<{ trends: unknown[] }>(`/trends${suffix}`, { accessToken });
}

export async function calculateTrends(accessToken: string, patientId: string) {
  return apiRequest<{ trends: unknown[] }>("/trends", {
    accessToken,
    body: JSON.stringify({ patientId }),
    method: "POST",
  });
}

export async function getPopulationAnalytics(accessToken: string) {
  return apiRequest<{ analytics: unknown }>("/analytics/population", { accessToken });
}

export async function listClinicalAlerts(accessToken: string) {
  return apiRequest<{ alerts: unknown[] }>("/alerts", { accessToken });
}

export async function generateClinicalAlerts(accessToken: string, patientId?: string) {
  return apiRequest<{ alerts: unknown[] }>("/alerts", {
    accessToken,
    body: JSON.stringify({ patientId }),
    method: "POST",
  });
}
