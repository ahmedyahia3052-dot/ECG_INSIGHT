import type { DashboardSnapshotView } from "@/types/clinical";

import type { KpiMetricView, ListRowView, ScreenContract, ScreenUserContext } from "./common";

export type DashboardScreenData = {
  aiMetrics: {
    accuracyLabel: string;
    avgProcessingMs: string;
    engineStatus: string;
    precisionLabel: string;
    recallLabel: string;
  };
  enterprise?: {
    criticalEcgs?: number;
    pendingReviews?: number;
    todaysEcgs?: number;
  };
  kpis: KpiMetricView[];
  notifications: ListRowView[];
  pendingReports: number;
  pendingReviews: number;
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
  onOpenCopilot: () => void;
  onUploadEcg: () => void;
};

export type DashboardScreenContract = ScreenContract<DashboardScreenData, DashboardScreenActions>;
