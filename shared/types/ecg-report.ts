export type ECGReportStatus = "draft" | "finalized" | "signed" | "archived";

export type ECGReport = {
  caseId: string;
  id: string;
  organizationName?: string;
  patientId: string;
  patientName?: string;
  physicianName: string;
  reportNumber: string;
  reportingDate: string;
  status: ECGReportStatus;
  verificationUrl?: string;
};
