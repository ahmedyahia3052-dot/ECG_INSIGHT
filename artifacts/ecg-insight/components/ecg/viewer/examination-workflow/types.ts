/** Sprint 48 — Hospital ECG examination workflow (frontend) */

export type ExaminationLifecycleStatus =
  | "pending"
  | "acquiring"
  | "digitizing"
  | "analyzing"
  | "review"
  | "completed"
  | "archived";

export type ExaminationStepId =
  | "create-examination"
  | "patient-identification"
  | "verify-demographics"
  | "clinical-information"
  | "symptoms"
  | "medications"
  | "history"
  | "risk-factors"
  | "acquire-ecg"
  | "digitize-ecg"
  | "quality-check"
  | "signal-review"
  | "measurement-studio"
  | "ai-cardiologist"
  | "clinical-decision-support"
  | "diagnostic-review"
  | "final-impression"
  | "doctor-validation"
  | "electronic-signature"
  | "generate-final-report"
  | "archive-examination";

export type DoctorFindingReviewStatus = "pending" | "accepted" | "rejected" | "modified";

export type ExaminationTimelineEntry = {
  action: string;
  id: string;
  performedAt: string;
  stepId?: ExaminationStepId;
  userId: string;
  userName: string;
};

export type DoctorFindingReview = {
  findingId: string;
  label: string;
  modifiedText?: string;
  reason?: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
  status: DoctorFindingReviewStatus;
};

export type ExaminationClinicalInfo = {
  chiefComplaint?: string;
  clinicalContext?: string;
  history?: string;
  medications?: string;
  riskFactors?: string[];
  symptoms?: string[];
};

export type ExaminationQualitySnapshot = {
  autoRecommendations: string[];
  baselineQuality: number;
  ecgQualityScore: number;
  leadCompleteness: number;
  noiseScore: number;
  overallTier: "excellent" | "fair" | "good" | "poor";
  signalQuality: number;
};

export type ExaminationElectronicSignature = {
  hash: string;
  signedAt: string;
  signedById: string;
  signedByName: string;
};

export type ExaminationSession = {
  archivedAt?: string;
  caseId: string;
  clinicalInfo: ExaminationClinicalInfo;
  completedAt?: string;
  completedSteps: ExaminationStepId[];
  createdAt: string;
  currentStepId: ExaminationStepId;
  doctorFindings: DoctorFindingReview[];
  finalDiagnosis?: string;
  finalImpression?: string;
  finalRecommendations?: string[];
  id: string;
  lifecycleStatus: ExaminationLifecycleStatus;
  patientId?: string;
  pipelineVersion: string;
  quality?: ExaminationQualitySnapshot;
  signature?: ExaminationElectronicSignature;
  startedById: string;
  startedByName: string;
  timeline: ExaminationTimelineEntry[];
  updatedAt: string;
};

export const EXAMINATION_STEP_ORDER: Array<{ id: ExaminationStepId; label: string }> = [
  { id: "create-examination", label: "Create Examination" },
  { id: "patient-identification", label: "Patient Identification" },
  { id: "verify-demographics", label: "Verify Demographics" },
  { id: "clinical-information", label: "Clinical Information" },
  { id: "symptoms", label: "Symptoms" },
  { id: "medications", label: "Medications" },
  { id: "history", label: "History" },
  { id: "risk-factors", label: "Risk Factors" },
  { id: "acquire-ecg", label: "Acquire ECG" },
  { id: "digitize-ecg", label: "Digitize ECG" },
  { id: "quality-check", label: "Quality Check" },
  { id: "signal-review", label: "Signal Review" },
  { id: "measurement-studio", label: "Measurement Studio" },
  { id: "ai-cardiologist", label: "AI Cardiologist" },
  { id: "clinical-decision-support", label: "Clinical Decision Support" },
  { id: "diagnostic-review", label: "Diagnostic Review" },
  { id: "final-impression", label: "Final Impression" },
  { id: "doctor-validation", label: "Doctor Validation" },
  { id: "electronic-signature", label: "Electronic Signature" },
  { id: "generate-final-report", label: "Generate Final Report" },
  { id: "archive-examination", label: "Archive Examination" },
];

export type ExaminationStepView = {
  id: ExaminationStepId;
  label: string;
  status: "complete" | "current" | "pending";
};

export function buildExaminationStepViews(session: ExaminationSession): ExaminationStepView[] {
  return EXAMINATION_STEP_ORDER.map((step) => ({
    id: step.id,
    label: step.label,
    status: session.completedSteps.includes(step.id)
      ? "complete"
      : step.id === session.currentStepId
        ? "current"
        : "pending",
  }));
}

export function lifecycleLabel(status: ExaminationLifecycleStatus) {
  const labels: Record<ExaminationLifecycleStatus, string> = {
    acquiring: "Acquiring",
    analyzing: "Analyzing",
    archived: "Archived",
    completed: "Completed",
    digitizing: "Digitizing",
    pending: "Pending",
    review: "Review",
  };
  return labels[status];
}
