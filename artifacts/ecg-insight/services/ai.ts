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

export interface AIExplainability {
  heatmap: {
    format: string;
    points: Array<{ intensity: number; lead: string; x: number; y: number }>;
  };
  leadHighlights: Array<{
    confidence: number;
    finding: string;
    lead: string;
    reason: string;
  }>;
  panel: Array<{ label: string; value: string }>;
}

export interface DoctorReviewInput {
  approved?: boolean;
  comments?: string;
  diagnosis?: string;
  interpretation?: string;
  severity?: "CRITICAL" | "MILD" | "MODERATE" | "NORMAL" | "SEVERE";
}

export interface DoctorReviewResult {
  caseId: string;
  diagnosis: string;
  reportId: string | null;
  status: "approved" | "reviewed";
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

export async function getAIExplainability(accessToken: string, caseId: string) {
  return apiRequest<{ explainability: AIExplainability | null }>(`/ai/explainability/${caseId}`, { accessToken });
}

export async function submitDoctorReview(accessToken: string, caseId: string, input: DoctorReviewInput) {
  return apiRequest<{ review: DoctorReviewResult }>(`/ai/review/${caseId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}
