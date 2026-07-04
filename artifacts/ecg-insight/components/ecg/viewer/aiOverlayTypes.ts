import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";

export const AI_ANNOTATION_TYPES = [
  "p_wave",
  "pr_interval",
  "qrs_complex",
  "qt_interval",
  "qtc_interval",
  "st_segment",
  "rr_interval",
  "heart_rate",
  "rhythm",
  "electrical_axis",
  "t_wave",
  "u_wave",
  "custom",
] as const;

export type EcgAiAnnotationType = (typeof AI_ANNOTATION_TYPES)[number];

export type EcgAiAnnotationCoordinates = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type EcgAiClinicalAnnotation = {
  aiGenerated: boolean;
  clinicalMeaning?: string;
  confidence: number;
  confirmed: boolean;
  coordinates: EcgAiAnnotationCoordinates;
  createdAt: string;
  createdBy: string;
  differentialDiagnosis?: string[];
  doctorEdited: boolean;
  doctorNotes?: string;
  evidence: string[];
  id: string;
  lead: string;
  locked: boolean;
  measurement?: string;
  medicalExplanation?: string;
  rejected: boolean;
  selected: boolean;
  suggestedAction?: string;
  supportingMeasurements?: string[];
  type: EcgAiAnnotationType;
  units?: string;
  updatedAt: string;
  visible: boolean;
};

export type EcgAiOverlayTheme = "clinical" | "dark" | "light";

export type EcgAiOverlaySettings = {
  enabled: boolean;
  fontScale: number;
  opacity: number;
  showAnnotations: boolean;
  showConfidence: boolean;
  showHeatmap: boolean;
  showLabels: boolean;
  theme: EcgAiOverlayTheme;
};

export type EcgAiOverlayState = {
  annotations: EcgAiClinicalAnnotation[];
  selectedAnnotationIds: string[];
  settings: EcgAiOverlaySettings;
  version: 1;
};

export type EcgAiOverlayBuildInput = {
  analysis?: AIAnalysisResult | null;
  ecgCase: ApiECGCase;
  explainability?: AIExplainability | null;
  imageHeight: number;
  imageWidth: number;
  operatorName?: string;
};

export const DEFAULT_AI_OVERLAY_SETTINGS: EcgAiOverlaySettings = {
  enabled: false,
  fontScale: 1,
  opacity: 0.82,
  showAnnotations: true,
  showConfidence: true,
  showHeatmap: true,
  showLabels: true,
  theme: "clinical",
};

export const EMPTY_AI_OVERLAY_STATE: EcgAiOverlayState = {
  annotations: [],
  selectedAnnotationIds: [],
  settings: DEFAULT_AI_OVERLAY_SETTINGS,
  version: 1,
};

export type EcgAiOverlayExportBundle = {
  annotations: EcgAiClinicalAnnotation[];
  exportedAt: string;
  format: "ecg-ai-overlay-v1";
  settings: EcgAiOverlaySettings;
};

export type EcgAiAnnotationInspectorModel = {
  annotation: EcgAiClinicalAnnotation;
  clinicalSignificance?: string;
  confidenceLabel: string;
  confidenceTone: "critical" | "high" | "low" | "moderate" | "very-high";
};
