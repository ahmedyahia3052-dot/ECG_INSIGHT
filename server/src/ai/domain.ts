import type {
  AIAnalysis,
  AISeverity,
  ClinicalDocument,
  ClinicalReport,
  ECGCase,
  ECGFile,
  ECGMeasurement,
  Organization,
  Patient,
} from "@prisma/client";

export type ECGDomainPatient = Patient;
export type ECGDomainCase = ECGCase;
export type ECGDomainAnalysis = AIAnalysis;
export type ECGDomainReport = ClinicalReport;
export type CardiovascularDocument = ClinicalDocument | ECGFile;
export type ECGDomainOrganization = Organization;

export const ECG_DIAGNOSES = [
  "Normal ECG",
  "Normal Sinus Rhythm",
  "Sinus Bradycardia",
  "Sinus Tachycardia",
  "Atrial Fibrillation",
  "Atrial Flutter",
  "PVC",
  "PAC",
  "First Degree AV Block",
  "Second Degree AV Block",
  "Third Degree AV Block",
  "RBBB",
  "LBBB",
  "STEMI",
  "NSTEMI",
  "LVH",
  "RVH",
  "Hyperkalemia",
  "Long QT",
  "WPW",
] as const;

export type ECGDiagnosis = (typeof ECG_DIAGNOSES)[number];

export interface ECGDiagnosisResult {
  confidenceScore: number;
  diagnosis: ECGDiagnosis;
  evidence: string[];
  severity: AISeverity;
}

export type ClinicalSeverity = "CRITICAL" | "HIGH" | "LOW" | "MODERATE";

export interface ECGFeatureExtraction {
  heartRate: number;
  prIntervalMs: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  qtcIntervalMs: number;
  rhythmRegularity: number;
  stDepressionMm: number;
  stElevationMm: number;
  tWaveAbnormalities: string[];
}

export interface ECGAnalysisInput {
  case: ECGCase;
  measurement?: ECGMeasurement | null;
}

export interface ECGAnalysisOutput {
  clinicalSeverity: ClinicalSeverity;
  confidenceScore: number;
  confidenceScorePercent: number;
  detectedAbnormalities: string[];
  featureExtraction: ECGFeatureExtraction;
  heartRate: number;
  interpretation: string;
  interpretationRationale: string[];
  primaryDiagnosis: ECGDiagnosis;
  provider: {
    modelVersion: string;
    name: "deep_learning" | "mock" | "rule_based";
  };
  recommendations: string[];
  rhythm: string;
  secondaryDiagnoses: ECGDiagnosisResult[];
  severity: AISeverity;
  urgentActions: string[];
}

export interface ECGPreprocessingArtifact {
  acceptedFormat: "jpeg" | "jpg" | "pdf" | "png";
  operations: Array<{
    confidence: number;
    name: "auto_crop" | "contrast_enhancement" | "deskew" | "grid_cleanup" | "perspective_correction" | "shadow_removal";
    status: "applied" | "not_required" | "simulated";
  }>;
  qualityScore: number;
  source: "camera_capture" | "drag_and_drop" | "pdf_upload" | "unknown" | "upload";
}

export interface ECGExplainabilityArtifact {
  heatmap: {
    format: "normalized-grid-v1";
    points: Array<{ intensity: number; lead: string; x: number; y: number }>;
  };
  leadHighlights: Array<{
    confidence: number;
    finding: string;
    lead: string;
    reason: string;
  }>;
  panel: Array<{
    label: string;
    value: string;
  }>;
}
