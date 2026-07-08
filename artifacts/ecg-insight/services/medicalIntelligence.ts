import { apiRequest } from "./api";

export type MedicalConfidenceLevel = "high" | "medium" | "low" | "unknown";
export type ClinicalSeverity = "normal" | "minor" | "abnormal" | "urgent" | "critical";
export type ClinicalUrgency = "routine" | "urgent" | "emergent" | "critical";

export interface MedicalIntelligenceReport {
  criticalFindings: string[];
  engineId: string;
  explainabilitySummary: string;
  findings: Array<{
    category: string;
    code: string;
    confidence: { explanation: string; level: MedicalConfidenceLevel; score: number };
    differentialDiagnosis: Array<{
      distinguishingFeatures: string[];
      explanation: string;
      label: string;
      likelihood: number;
      rank: number;
    }>;
    explainability: {
      conflictingEvidence: string[];
      diagnosisLabel: string;
      missingEvidence: string[];
      possibleAlternatives: Array<{ label: string; reason: string }>;
      rationale: string;
      supportingEvidence: string[];
    };
    label: string;
    severity: ClinicalSeverity;
    urgency: ClinicalUrgency;
  }>;
  generatedAt: string;
  measurements: Record<string, number | string>;
  overallConfidence: { explanation: string; level: MedicalConfidenceLevel; score: number };
  overallSeverity: ClinicalSeverity;
  overallUrgency: ClinicalUrgency;
  primaryDiagnosis: {
    code: string | null;
    confidence: { explanation: string; level: MedicalConfidenceLevel; score: number };
    label: string;
  };
  recommendations: Array<{
    action: string;
    priority: "immediate" | "optional" | "routine" | "urgent";
    rationale: string;
    timeframe?: string;
    type: string;
  }>;
  version: string;
  warnings: string[];
}

export interface MedicalIntelligenceReportRecord {
  createdAt: string;
  id: string;
  reportJson?: MedicalIntelligenceReport | null;
}

export async function analyzeMedicalIntelligenceCase(accessToken: string, caseId: string) {
  return apiRequest<{ report: MedicalIntelligenceReport; reportId: string }>(`/medical-intelligence/cases/${caseId}/analyze`, {
    accessToken,
    method: "POST",
  });
}

export async function listMedicalIntelligenceReports(accessToken: string, caseId: string) {
  return apiRequest<{ reports: MedicalIntelligenceReportRecord[] }>(`/medical-intelligence/cases/${caseId}/reports`, {
    accessToken,
  });
}

export async function getMedicalIntelligenceReport(accessToken: string, reportId: string) {
  return apiRequest<{ report: MedicalIntelligenceReportRecord }>(`/medical-intelligence/reports/${reportId}`, {
    accessToken,
  });
}

export async function fetchOrAnalyzeMedicalIntelligence(accessToken: string, caseId: string) {
  const listed = await listMedicalIntelligenceReports(accessToken, caseId);
  const cached = listed.reports.find((item) => item.reportJson)?.reportJson;
  if (cached) return cached;
  try {
    const analyzed = await analyzeMedicalIntelligenceCase(accessToken, caseId);
    return analyzed.report;
  } catch {
    return null;
  }
}
