import type { DashboardSnapshotView } from "@/types/clinical";

import type { KpiMetricView, ListRowView, ScreenContract, ScreenUserContext } from "./common";

export type DashboardChartPoint = {
  cases: number;
  critical: number;
  month: string;
};

export type DashboardDiagnosisSlice = {
  colorKey: "accent" | "chart4" | "critical" | "primary" | "warning";
  name: string;
  value: number;
};

export type DashboardActivityItem = {
  action: string;
  createdAt: string;
  id: string;
  target: string;
  type: string;
  user: string;
};

export type DashboardRecentCaseRow = {
  caseId: string;
  id: string;
  patientName: string;
  priority: "critical" | "routine" | "urgent";
  rhythm: string;
  status: "analyzing" | "completed" | "pending" | "reviewed" | "reviewing";
};

export type DashboardBoltStats = {
  avgConfidence: number;
  casesThisMonth: number;
  criticalCases: number;
  pendingReviews: number;
  totalCases: number;
};

export type DashboardScreenData = {
  activity: DashboardActivityItem[];
  aiMetrics: {
    accuracyLabel: string;
    avgProcessingMs: string;
    engineStatus: string;
    precisionLabel: string;
    recallLabel: string;
  };
  boltStats: DashboardBoltStats;
  diagnosisDistribution: DashboardDiagnosisSlice[];
  enterprise?: {
    criticalEcgs?: number;
    pendingReviews?: number;
    todaysEcgs?: number;
  };
  kpis: KpiMetricView[];
  monthlyCases: DashboardChartPoint[];
  notifications: ListRowView[];
  pendingReports: number;
  pendingReviews: number;
  recentCaseRows: DashboardRecentCaseRow[];
  recentCases: ListRowView[];
  recentPatients: ListRowView[];
  snapshot: DashboardSnapshotView;
  subscriptionLabel: string;
  summary: Array<{ label: string; value: string }>;
  timeline: Array<{ icon: string; text: string; title: string }>;
  user: ScreenUserContext;
};

export type DashboardScreenActions = {
  onAddPatient: () => void;
  onAnalyzeEcg: () => void;
  onGenerateReport: () => void;
  onOpenCase: (caseId: string) => void;
  onOpenCopilot: () => void;
  onUploadEcg: () => void;
  onViewAllCases: () => void;
};

export type DashboardScreenContract = ScreenContract<DashboardScreenData, DashboardScreenActions>;
