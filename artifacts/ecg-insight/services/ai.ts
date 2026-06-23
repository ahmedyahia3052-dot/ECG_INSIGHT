import { apiRequest } from "./api";

export interface AIAnalysisResult {
  aiVersion: string;
  caseId: string;
  confidenceScore: number;
  createdAt: string;
  diagnosis: string;
  heartRate: number;
  id: string;
  interpretation: string;
  processingTime: number;
  recommendations: string[];
  rhythm: string;
  severity: "normal" | "mild" | "moderate" | "severe" | "critical";
  status: "queued" | "processing" | "completed" | "failed";
  urgentActions: string[];
}

export interface AIStatistics {
  abnormalPercentage: number;
  averageConfidence: number;
  criticalPercentage: number;
  diagnosisDistribution: Record<string, number>;
  totalAnalyses: number;
}

export async function analyzeCase(accessToken: string, caseId: string) {
  return apiRequest<{ analysis: AIAnalysisResult }>(`/ai/analyze/${caseId}`, {
    accessToken,
    method: "POST",
  });
}

export async function getAIResult(accessToken: string, caseId: string) {
  return apiRequest<{ analysis: AIAnalysisResult | null }>(`/ai/result/${caseId}`, {
    accessToken,
  });
}

export async function getAIStatistics(accessToken: string) {
  return apiRequest<{ statistics: AIStatistics }>("/ai/statistics", { accessToken });
}

export async function getAIHistory(accessToken: string) {
  return apiRequest<{ analyses: AIAnalysisResult[] }>("/ai/history", { accessToken });
}
