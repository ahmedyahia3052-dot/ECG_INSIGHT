import type { EcgLeadId } from "../types";

export type ClinicalReportType =
  | "diagnostic"
  | "clinical"
  | "printable"
  | "hospital_pdf";

export type ClinicalReportTheme = "light" | "dark";
export type ClinicalReportOrientation = "portrait" | "landscape";
export type ClinicalReportPreviewMode = "print" | "export";

export type EnterpriseReportHeader = {
  acquisitionSource: string;
  caseId: string;
  department: string;
  device: string;
  gender: string;
  mrn: string;
  orderingPhysician: string;
  organization: string;
  patientAge: string;
  patientName: string;
  reportStatus: string;
  reviewingPhysician: string;
  studyDate: string;
  studyTime: string;
};

export type EnterpriseEcgParameterRow = {
  confidence?: string;
  label: string;
  unit: string;
  value: string;
};

export type EnterpriseAiFinding = {
  affectedLeads: EcgLeadId[];
  clinicalImportance: string;
  confidence: number;
  evidence: string[];
  explanation: string;
  guideline?: string;
  severity: string;
  status: string;
  supportingMeasurements: string[];
  title: string;
};

export type EnterpriseDifferentialRow = {
  clinicalNotes: string;
  contradictingFindings: string[];
  diagnosis: string;
  probability: number;
  supportingFindings: string[];
};

export type EnterpriseRecommendation = {
  action: string;
  priority: string;
  rationale: string;
  timeframe?: string;
};

export type EnterpriseConfidenceMetric = {
  label: string;
  percent: number;
};

export type EnterpriseCriticalAlert = {
  priority: string;
  recommendedAction: string;
  severity: string;
  title: string;
};

export type EnterpriseLeadSummary = {
  confidence: number;
  findings: string[];
  lead: EcgLeadId | string;
  status: "abnormal" | "normal" | "unknown";
};

export type EnterpriseEcgSnapshots = {
  aiOverlayUrl?: string;
  caliperSnapshotNote: string;
  digitizedEcgUrl?: string;
  originalEcgUrl?: string;
  processedEcgUrl?: string;
};

export type EnterprisePreviousComparison = {
  available: boolean;
  clinicalChangeSummary: string;
  findingsAdded: string[];
  findingsRemoved: string[];
  heartRateDelta?: string;
  intervalsDelta?: string;
  priorStudyDate?: string;
  rhythmDelta?: string;
  stDelta?: string;
};

export type EnterpriseDoctorReview = {
  approvalDate?: string;
  doctorNotes: string;
  electronicSignature?: string;
  finalDiagnosis: string;
  licenseNumber?: string;
  signatureName?: string;
};

export type EnterpriseClinicalReportModel = {
  aiFindings: EnterpriseAiFinding[];
  clinicalDecision?: import("../cdss-workspace/types").EnterpriseClinicalDecisionSection;
  clinicalImpression: string[];
  confidence: EnterpriseConfidenceMetric[];
  criticalAlerts: EnterpriseCriticalAlert[];
  differential: EnterpriseDifferentialRow[];
  doctorReview: EnterpriseDoctorReview;
  ecgParameters: EnterpriseEcgParameterRow[];
  header: EnterpriseReportHeader;
  leadSummary: EnterpriseLeadSummary[];
  previousComparison: EnterprisePreviousComparison;
  recommendations: EnterpriseRecommendation[];
  reportNumber?: string;
  reportType: ClinicalReportType;
  snapshots: EnterpriseEcgSnapshots;
};
