export type BadgeTone = "default" | "primary" | "success" | "warning" | "critical" | "muted";

export type UiBadge = {
  label: string;
  tone: BadgeTone;
};

export type DashboardKpiVM = {
  label: string;
  loading?: boolean;
  tone?: BadgeTone;
  trend?: string;
  value: string;
};

export type DashboardVM = {
  kpis: DashboardKpiVM[];
  notifications: NotificationVM[];
  pendingReports: number;
  pendingReviews: number;
  recentCases: CaseListItemVM[];
  recentPatients: PatientListItemVM[];
  subscriptionLabel: string;
  summary: Array<{ label: string; value: string }>;
};

export type PatientListItemVM = {
  ageLabel: string;
  genderLabel: string;
  id: string;
  mrnLabel: string;
  name: string;
  statusBadge: UiBadge;
};

export type PatientVM = PatientListItemVM & {
  caseCount?: number;
  lastStudyLabel?: string;
};

export type CaseListItemVM = {
  acquisitionLabel: string;
  aiStatusBadge: UiBadge;
  caseId: string;
  caseNumber: string;
  heartRateLabel: string;
  id: string;
  patientName: string;
  priorityBadge: UiBadge;
  rhythmLabel: string;
  statusBadge: UiBadge;
  uploadLabel: string;
};

export type CaseVM = CaseListItemVM & {
  aiDiagnosis?: string | null;
  confidenceLabel?: string;
  doctorDiagnosis?: string | null;
  imageUrl?: string;
  measurements: MeasurementVM[];
  prLabel?: string;
  qrsLabel?: string;
  qtLabel?: string;
};

export type MeasurementVM = {
  label: string;
  unit: string;
  value: string;
};

export type EcgVM = {
  caseId: string;
  enhancedImageUrl?: string;
  leadCount: number;
  measurementSummary: MeasurementVM[];
  originalImageUrl?: string;
  qualityLabel: string;
  signalContinuityLabel?: string;
};

export type MonitorVM = {
  caseId: string;
  filterLabel: string;
  heartRateLabel: string;
  layoutLabel: string;
  playbackLabel: string;
  rhythmLabel: string;
  signalQualityLabel: string;
};

export type UploadVM = {
  fileName: string;
  id: string;
  mimeType: string;
  progressLabel: string;
  sizeLabel: string;
  statusBadge: UiBadge;
};

export type SubscriptionVM = {
  billingLabel: string;
  id: string;
  planName: string;
  renewalLabel: string;
  seatsLabel: string;
  statusBadge: UiBadge;
};

export type OrganizationVM = {
  id: string;
  memberCountLabel: string;
  name: string;
  planBadge: UiBadge;
  regionLabel: string;
};

export type ProfileVM = {
  email: string;
  id: string;
  name: string;
  organizationLabel: string;
  roleBadge: UiBadge;
};

export type DeveloperVM = {
  apiUsageLabel: string;
  environmentLabel: string;
  keyCountLabel: string;
  webhookCountLabel: string;
};

export type HistoryVM = {
  cases: CaseListItemVM[];
  filters: {
    query: string;
    severity: string;
    status: string;
  };
  total: number;
};

export type NotificationVM = {
  id: string;
  message: string;
  read: boolean;
  severityBadge: UiBadge;
  timestampLabel: string;
  title: string;
};

export type SettingsVM = {
  localeLabel: string;
  notificationsEnabled: boolean;
  themeLabel: string;
  timezoneLabel: string;
};

export type AnalyticsVM = {
  accuracyLabel: string;
  avgProcessingLabel: string;
  criticalCasesLabel: string;
  pendingReviewsLabel: string;
  todaysEcgsLabel: string;
};

export type AuthVM = {
  email: string;
  isAuthenticated: boolean;
  roleBadge: UiBadge;
  sessionLabel: string;
  userId: string;
  userName: string;
};
