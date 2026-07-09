/** Frontend view models — never expose raw API/database shapes to UI directly. */

export type EcgCaseListItemView = {
  acquisitionDate: string;
  aiStatus: string;
  caseId: string;
  caseNumber?: string;
  ecgType: string;
  heartRate?: number;
  id: string;
  patientLabel: string;
  priority: string;
  rhythm?: string;
  severity?: string;
  status: string;
  uploadDate: string;
};

export type EcgCaseDetailView = EcgCaseListItemView & {
  aiDiagnosis?: string;
  clinicalComments?: string;
  confidence?: number;
  doctorDiagnosis?: string;
  finalDiagnosis?: string;
  imageUrl?: string;
  interpretation?: string;
  prInterval?: number;
  qrsDuration?: number;
  qtInterval?: number;
  qtcInterval?: number;
};

export type DashboardKpiView = {
  abnormalCases: number;
  criticalCases: number;
  pendingReports: number;
  pendingReviews: number;
  totalCases: number;
  totalNotifications: number;
  totalPatients: number;
  totalReports: number;
};

export type DashboardSnapshotView = {
  cases: EcgCaseListItemView[];
  greeting: string;
  kpis: DashboardKpiView;
  notifications: Array<{ id: string; message: string; read: boolean; title: string }>;
  patients: Array<{ fullName: string; id: string; medicalRecordNumber?: string }>;
  reports: Array<{ caseId: string; id: string; status: string; title: string }>;
  timeLabel: string;
};
