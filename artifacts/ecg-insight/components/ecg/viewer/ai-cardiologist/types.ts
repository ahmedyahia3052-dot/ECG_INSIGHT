import type { EcgLeadId } from "../types";

export type IntervalStatus = "abnormal" | "borderline" | "normal" | "unknown";

export interface CardiologistIntervalRow {
  flag?: string;
  name: string;
  normalRange: string;
  status: IntervalStatus;
  unit: string;
  value: number | null;
}

export interface CardiologistStructuredFinding {
  affectedLeads: EcgLeadId[];
  category: string;
  code: string;
  confidence: number;
  confidenceLevel: string;
  criteria?: string[];
  explanation: string;
  id: string;
  label: string;
  severity: string;
}

export interface CardiologistWaveRow {
  explanation: string;
  interpretation: string;
  status: IntervalStatus;
  wave: string;
}

export interface CardiologistStFinding {
  affectedLeads: EcgLeadId[];
  explanation: string;
  label: string;
  pattern: "depression" | "diffuse" | "elevation" | "reciprocal";
}

export interface CardiologistDifferentialRow {
  confidence: number;
  distinguishingFeatures: string[];
  explanation: string;
  label: string;
  rank: number;
}

export interface CardiologistRecommendationRow {
  action: string;
  priority: string;
  rationale: string;
  timeframe?: string;
}

export interface CardiologistWorkspaceModel {
  arrhythmias: CardiologistStructuredFinding[];
  axis: {
    classification: "Extreme Axis" | "Left Axis Deviation" | "Normal" | "Right Axis Deviation" | "Unknown";
    confidence: number;
    degrees: number | null;
    explanation: string;
  };
  blocks: CardiologistStructuredFinding[];
  clinicalImpression: string;
  confidence: {
    evidenceUsed: string[];
    imageQuality: string;
    leadQuality: string;
    overall: number;
    overallLevel: string;
    signalQuality: string;
  };
  differential: CardiologistDifferentialRow[];
  hypertrophy: CardiologistStructuredFinding[];
  intervals: CardiologistIntervalRow[];
  ischemia: CardiologistStructuredFinding[];
  loaded: boolean;
  primaryDiagnosis: { code: string; confidence: number; label: string };
  recommendations: CardiologistRecommendationRow[];
  rhythm: {
    heartRate: number | null;
    pWaveDetected: boolean;
    prStatus: string;
    regularity: "Irregular" | "Regular" | "Unknown";
    rhythm: string;
    rrVariability: string;
  };
  stAnalysis: CardiologistStFinding[];
  waveAnalysis: CardiologistWaveRow[];
}

export interface CardiologistBuildInput {
  analysis?: import("@/services/ai").AIAnalysisResult | null;
  digitalEcg?: import("@/services/ecgProcessing").DigitalEcg | null;
  explainability?: import("@/services/ai").AIExplainability | null;
  medicalReport?: import("@/services/medicalIntelligence").MedicalIntelligenceReport | null;
}
