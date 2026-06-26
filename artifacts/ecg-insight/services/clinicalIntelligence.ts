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
  return apiRequest<{ alerts: unknown[] }>("/clinical-alerts", { accessToken });
}

export async function generateClinicalAlerts(accessToken: string, patientId?: string) {
  return apiRequest<{ alerts: unknown[] }>("/clinical-alerts", {
    accessToken,
    body: JSON.stringify({ patientId }),
    method: "POST",
  });
}

export type CDSSRiskCategory = "CRITICAL" | "HIGH_RISK" | "LOW_RISK" | "MODERATE_RISK";
export type CDSSOccupationalDecision = "FIT" | "FIT_WITH_RESTRICTIONS" | "PERMANENTLY_UNFIT" | "TEMPORARILY_UNFIT";

export interface CDSSFinding {
  confidenceScore: number;
  evidence: unknown;
  findingType: string;
  id: string;
  message: string;
  priority?: string;
  recommendation?: string;
  ruleId: string;
  severity: string;
  title: string;
}

export interface CDSSRun {
  createdAt: string;
  explainabilityJson: {
    confidence?: number;
    ruleIdentifiers?: string[];
    supportingEvidence?: unknown[];
    triggeringFindings?: string[];
    why?: string;
  };
  findings: CDSSFinding[];
  id: string;
  occupationalDecision: CDSSOccupationalDecision;
  occupationalProfile?: string;
  riskCategory: CDSSRiskCategory;
  riskScore: number;
  summary: string;
  trendSummary?: string;
}

export async function evaluateCDSS(accessToken: string, caseId: string) {
  return apiRequest<{ run: CDSSRun }>(`/cdss/cases/${caseId}/evaluate`, {
    accessToken,
    method: "POST",
  });
}

export async function listCDSSRuns(accessToken: string, caseId: string) {
  return apiRequest<{ runs: CDSSRun[] }>(`/cdss/cases/${caseId}/runs`, { accessToken });
}

export async function listCDSSRules(accessToken: string) {
  return apiRequest<{ rules: unknown[] }>("/cdss/rules", { accessToken });
}
