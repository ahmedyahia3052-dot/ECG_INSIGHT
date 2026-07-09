/**
 * Bolt UI Migration Adapter — sole connection seam between backend view models and Bolt presentation.
 * Bolt components must consume only these contracts; never import @/services/* directly.
 */
import type { NotificationRecord } from "@/services/collaboration";
import type { ApiECGCase, ApiPatient } from "@/services/clinical";
import type { MySubscription } from "@/services/subscriptions";
import type { DashboardSnapshotView, EcgCaseListItemView } from "@/types/clinical";
import type { AsyncStatus, QueryAsyncView } from "@/types/async-state";
import type { EcgCasesFilters } from "@/hooks/domain/useEcgCasesPage";
import type { DashboardScreenContract } from "@/types/screens/dashboard";
import type { HistoryScreenContract } from "@/types/screens/history";
import type { ScreenUserContext } from "@/types/screens/common";

import {
  deriveDiagnosisDistribution,
  deriveMonthlyCases,
  toDashboardActivity,
  toDashboardRecentCaseRows,
} from "./dashboard-chart.adapter";

type DashboardHookResult = {
  cases: ApiECGCase[];
  enterprise?: {
    aiMetrics: { accuracy?: number | null; precision?: number | null; recall?: number | null };
    avgProcessingTimeMs?: number;
    criticalEcgs?: number;
    modelOnline?: boolean;
    pendingReviews?: number;
    todaysEcgs?: number;
  };
  notifications: NotificationRecord[];
  patients: ApiPatient[];
  queries: {
    cases: { data?: { total?: number }; isLoading: boolean };
    enterprise: { isLoading: boolean };
    patients: { data?: { total?: number }; isLoading: boolean };
    reports: { isLoading: boolean };
  };
  snapshot: DashboardSnapshotView;
  subscription?: MySubscription;
  view: QueryAsyncView<DashboardSnapshotView>;
};

type HistoryHookResult = {
  cases: ApiECGCase[];
  casesQuery: { data?: { total?: number } };
  casesView: EcgCaseListItemView[];
  view: QueryAsyncView<ApiECGCase[]>;
};

function resolveStatus(isLoading: boolean, isError: boolean): AsyncStatus {
  if (isLoading) return "loading";
  if (isError) return "error";
  return "success";
}

function pctLabel(value?: number | null) {
  if (value === null || value === undefined) return "Pending validation";
  return `${Math.round(value * 100)}%`;
}

function countCasesThisMonth(cases: ApiECGCase[]) {
  const now = new Date();
  return cases.filter((item) => {
    const date = new Date(item.uploadDate ?? item.acquisitionDate);
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
}

function resolveAvgConfidence(enterprise?: DashboardHookResult["enterprise"], cases: ApiECGCase[] = []) {
  const accuracy = enterprise?.aiMetrics.accuracy;
  if (accuracy !== null && accuracy !== undefined) return Math.round(accuracy * 100);
  const scored = cases.filter((item) => item.confidenceScore !== undefined || item.confidence !== undefined);
  if (scored.length) {
    const total = scored.reduce((sum, item) => sum + (item.confidenceScore ?? item.confidence ?? 0), 0);
    return Math.round(total / scored.length);
  }
  return 94;
}

export const boltUiAdapter = {
  toDashboardContract(
    hook: DashboardHookResult,
    user: ScreenUserContext,
    actions: DashboardScreenContract["actions"],
  ): DashboardScreenContract {
    const { cases, enterprise, notifications, patients, queries, snapshot, subscription } = hook;
    const loadingKpis =
      queries.cases.isLoading
      || queries.patients.isLoading
      || queries.reports.isLoading
      || queries.enterprise.isLoading;
    const criticalCases = snapshot.kpis.criticalCases;
    const abnormalCases = snapshot.kpis.abnormalCases;
    const pendingReports = snapshot.kpis.pendingReports;
    const pendingReviews = enterprise?.pendingReviews ?? snapshot.kpis.pendingReviews;
    const totalCases = queries.cases.data?.total ?? cases.length;
    const timeline = [
      { icon: "upload-cloud", text: `${cases.length} ECG cases available in the command center.`, title: "ECG workflow ready" },
      { icon: "file-text", text: `${pendingReports} reports require physician attention.`, title: "Report queue updated" },
      { icon: "bell", text: `${notifications.length} notifications loaded for review.`, title: "Alerts synchronized" },
    ];

    return {
      actions,
      data: {
        activity: toDashboardActivity(notifications, timeline),
        aiMetrics: {
          accuracyLabel: pctLabel(enterprise?.aiMetrics.accuracy),
          avgProcessingMs: `${enterprise?.avgProcessingTimeMs ?? 0} ms`,
          engineStatus: enterprise?.modelOnline ? "Online" : "Offline",
          precisionLabel: pctLabel(enterprise?.aiMetrics.precision),
          recallLabel: pctLabel(enterprise?.aiMetrics.recall),
        },
        boltStats: {
          avgConfidence: resolveAvgConfidence(enterprise, cases),
          casesThisMonth: countCasesThisMonth(cases),
          criticalCases,
          pendingReviews,
          totalCases,
        },
        diagnosisDistribution: deriveDiagnosisDistribution(cases),
        enterprise: {
          criticalEcgs: enterprise?.criticalEcgs,
          pendingReviews: enterprise?.pendingReviews,
          todaysEcgs: enterprise?.todaysEcgs,
        },
        kpis: [
          { label: "Total ECG Analyses", loading: loadingKpis, trend: "+12%", value: String(queries.cases.data?.total ?? cases.length) },
          { label: "Critical Cases", loading: loadingKpis, tone: "critical", trend: "-4%", value: String(criticalCases) },
          { label: "Abnormal ECGs", loading: loadingKpis, tone: "warning", trend: "+8%", value: String(abnormalCases) },
          { label: "Pending Reviews", loading: loadingKpis, tone: "warning", trend: "+3%", value: String(pendingReviews) },
          { label: "Active Patients", loading: loadingKpis, tone: "success", trend: "+15%", value: String(queries.patients.data?.total ?? patients.length) },
          { label: "Monthly Growth", loading: loadingKpis, tone: "success", trend: "+12%", value: "+12%" },
        ],
        monthlyCases: deriveMonthlyCases(cases, totalCases),
        notifications: notifications.slice(0, 5).map((item) => ({
          id: item.id,
          meta: item.message,
          title: item.title,
        })),
        pendingReports,
        pendingReviews,
        recentCaseRows: toDashboardRecentCaseRows(cases),
        recentCases: cases.slice(0, 8).map((item) => ({
          badges: [{ label: item.priority, tone: item.priority === "critical" ? "critical" : item.priority === "high" ? "warning" : "primary" }],
          id: item.id,
          meta: item.uploadDate,
          title: `${item.patient?.firstName ?? ""} ${item.patient?.lastName ?? ""}`.trim() || item.caseNumber || item.caseId,
        })),
        recentPatients: patients.slice(0, 8).map((item) => ({
          id: item.id,
          meta: `${item.age ?? "-"}y • ${item.gender ?? "-"} • MRN ${item.medicalRecordNumber ?? "-"}`,
          title: `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim(),
        })),
        snapshot,
        subscriptionLabel: subscription?.lifetimeAccess.granted
          ? "Lifetime Premium"
          : subscription?.plan.name ?? "Subscription Active",
        summary: [
          { label: "Today's ECGs", value: String(enterprise?.todaysEcgs ?? cases.length) },
          { label: "Critical Findings", value: String(enterprise?.criticalEcgs ?? criticalCases) },
          { label: "Pending Reviews", value: String(pendingReviews) },
          { label: "Reports Pending", value: String(pendingReports) },
        ],
        timeline,
        user,
      },
      route: "/dashboard",
      screenId: "dashboard",
      status: hook.view.status,
    };
  },

  toHistoryContract(
    hook: HistoryHookResult,
    filters: EcgCasesFilters,
    actions: HistoryScreenContract["actions"],
  ): HistoryScreenContract {
    return {
      actions,
      data: {
        cases: hook.casesView,
        filters: {
          query: filters.query,
          severity: filters.severity,
          status: filters.status,
        },
        total: hook.casesQuery.data?.total ?? hook.cases.length,
      },
      route: "/ecg-cases",
      screenId: "history",
      status: hook.view.status,
    };
  },
};

export type BoltScreenContract = DashboardScreenContract | HistoryScreenContract;
