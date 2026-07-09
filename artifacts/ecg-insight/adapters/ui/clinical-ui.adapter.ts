/**
 * UI Adapter Layer — isolates frontend presentation contracts from backend service implementations.
 * External UI components should depend on these adapters, not on raw service modules.
 */
import type { QueryAsyncView } from "@/types/async-state";
import type { DashboardSnapshotView, EcgCaseDetailView, EcgCaseListItemView } from "@/types/clinical";

import { mapEcgCaseDetail, mapEcgCaseList, toDashboardKpiView } from "../clinical";
import type { ApiECGCase } from "@/services/clinical";
import type { NotificationRecord } from "@/services/collaboration";
import type { ApiPatient } from "@/services/clinical";
import type { ClinicalReport } from "@/services/reports";
import { greetingForHour, currentTimeLabel } from "@/utils/asyncState";

export type ClinicalUiAdapter = {
  mapCaseDetail: typeof mapEcgCaseDetail;
  mapCaseList: typeof mapEcgCaseList;
  mapDashboardSnapshot: (input: {
    cases: ApiECGCase[];
    notifications: NotificationRecord[];
    patients: ApiPatient[];
    reports: ClinicalReport[];
  }) => DashboardSnapshotView;
  wrapQuery: <T>(view: QueryAsyncView<T>) => QueryAsyncView<T>;
};

export const clinicalUiAdapter: ClinicalUiAdapter = {
  mapCaseDetail: mapEcgCaseDetail,
  mapCaseList: mapEcgCaseList,
  mapDashboardSnapshot: ({ cases, notifications, patients, reports }) => ({
    cases: mapEcgCaseList(cases),
    greeting: greetingForHour(),
    kpis: toDashboardKpiView({ cases, notifications, patients, reports }),
    notifications: notifications.map((item) => ({
      id: item.id,
      message: item.message,
      read: item.read,
      title: item.title,
    })),
    patients: patients.map((item) => ({
      fullName: `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim(),
      id: item.id,
      medicalRecordNumber: item.medicalRecordNumber,
    })),
    reports: reports.map((item) => ({
      caseId: item.caseId,
      id: item.id,
      status: item.status,
      title: item.reportNumber,
    })),
    timeLabel: currentTimeLabel(),
  }),
  wrapQuery: (view) => view,
};

export type { EcgCaseDetailView, EcgCaseListItemView, DashboardSnapshotView };
