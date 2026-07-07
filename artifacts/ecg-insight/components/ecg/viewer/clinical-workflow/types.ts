import type { AIAnalysisResult } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { ClinicalReport } from "@/services/reports";

import type { EcgWorkstationViewMode } from "../types";

/** Sprint 30 — 16-stage clinical decision workspace */

export type ClinicalWorkflowStepId =
  | "patient"
  | "upload"
  | "image-quality"
  | "image-processing"
  | "grid-detection"
  | "lead-detection"
  | "digitization"
  | "signal-reconstruction"
  | "measurements"
  | "ai-review"
  | "clinical-review"
  | "comparison"
  | "doctor-notes"
  | "final-report"
  | "digital-signature"
  | "export";

export type ClinicalWorkflowStepStatus = "complete" | "current" | "disabled" | "pending";

export type ClinicalWorkflowStep = {
  disabled: boolean;
  id: ClinicalWorkflowStepId;
  label: string;
  shortLabel: string;
  status: ClinicalWorkflowStepStatus;
};

export const WORKFLOW_STEP_ORDER: Array<{ id: ClinicalWorkflowStepId; label: string; shortLabel: string }> = [
  { id: "patient", label: "Patient", shortLabel: "Pt" },
  { id: "upload", label: "ECG Upload", shortLabel: "Up" },
  { id: "image-quality", label: "Image Quality", shortLabel: "Qual" },
  { id: "image-processing", label: "Image Processing", shortLabel: "Proc" },
  { id: "grid-detection", label: "Grid Detection", shortLabel: "Grid" },
  { id: "lead-detection", label: "Lead Detection", shortLabel: "Lead" },
  { id: "digitization", label: "Digitization", shortLabel: "Dig" },
  { id: "signal-reconstruction", label: "Signal Reconstruction", shortLabel: "Sig" },
  { id: "measurements", label: "Measurements", shortLabel: "Meas" },
  { id: "ai-review", label: "AI Review", shortLabel: "AI" },
  { id: "clinical-review", label: "Clinical Review", shortLabel: "Rev" },
  { id: "comparison", label: "Comparison", shortLabel: "Cmp" },
  { id: "doctor-notes", label: "Doctor Notes", shortLabel: "Note" },
  { id: "final-report", label: "Final Report", shortLabel: "Rpt" },
  { id: "digital-signature", label: "Digital Signature", shortLabel: "Sign" },
  { id: "export", label: "Export", shortLabel: "Exp" },
];

export type ClinicalWorkflowContext = {
  analysis?: AIAnalysisResult | null;
  caseRecord: ApiECGCase;
  clinicalNotes?: string | null;
  currentViewMode: EcgWorkstationViewMode;
  digitizing?: boolean;
  digitalEcg?: DigitalEcg | null;
  exported?: boolean;
  hasCompareStudy?: boolean;
  measurementCount?: number;
  reports?: ClinicalReport[];
};

export type ClinicalWorkflowNavigation = {
  aiTab?: boolean;
  compareMode?: boolean;
  historyTab?: boolean;
  measurementsTab?: boolean;
  notesTab?: boolean;
  openReview?: boolean;
  patientTab?: boolean;
  reportsTab?: boolean;
  viewMode?: EcgWorkstationViewMode;
};

export type CaseTimelineEvent = {
  id: string;
  label: string;
  status: "complete" | "current" | "pending";
  timestamp?: string;
};

export type ClinicalAlertSeverity = "critical" | "info" | "warning";

export type ClinicalAlert = {
  id: string;
  label: string;
  message: string;
  severity: ClinicalAlertSeverity;
};
