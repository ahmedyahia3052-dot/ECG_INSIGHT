import assert from "node:assert/strict";

import { toEcgCaseListItemView, toDashboardKpiView } from "../artifacts/ecg-insight/adapters/clinical/ecg-case.adapter.ts";
import { APP_NAV_ITEMS, resolvePageMeta } from "../artifacts/ecg-insight/routes/registry.ts";
import { resolveAsyncStatus, toQueryAsyncView, greetingForHour } from "../artifacts/ecg-insight/utils/asyncState.ts";
import { queryKeys } from "../artifacts/ecg-insight/store/query-keys.ts";

const caseView = toEcgCaseListItemView({
  aiStatus: "completed",
  caseId: "ECG-001",
  caseNumber: "ECG-001",
  ecgType: "12-lead",
  id: "case-1",
  patient: { firstName: "Jane", lastName: "Doe" },
  severity: "normal",
  status: "ai_completed",
  uploadDate: "2026-07-01T10:00:00.000Z",
} as never);

assert.equal(caseView.caseNumber, "ECG-001");
assert.equal(caseView.patientLabel, "Jane Doe");

const kpis = toDashboardKpiView({
  cases: [],
  notifications: [{ id: "n1", message: "Alert", read: false, title: "Critical" }],
  patients: [{ firstName: "Jane", id: "p1", lastName: "Doe", medicalRecordNumber: "MRN-1" }],
  reports: [{ caseId: "case-1", id: "r1", reportNumber: "RPT-1", status: "draft" } as never],
});

assert.equal(kpis.pendingReports, 1);
assert.ok(greetingForHour(new Date("2026-07-01T08:00:00.000Z")).includes("Morning"));

const loading = resolveAsyncStatus({ isError: false, isLoading: true });
assert.equal(loading, "loading");

const permission = resolveAsyncStatus({
  error: new Error("403 forbidden"),
  isError: true,
  isLoading: false,
});
assert.equal(permission, "permission-denied");

const queryView = toQueryAsyncView({
  data: undefined,
  error: null,
  isError: false,
  isLoading: false,
});
assert.equal(queryView.status, "empty");

assert.ok(APP_NAV_ITEMS.some((item) => item.href === "/dashboard"));
assert.equal(resolvePageMeta("/ecg-cases/abc").title, "ECG Case");
assert.ok(queryKeys.dashboard.cases("token").includes("token"));

console.log("Sprint 102 Frontend Foundation unit tests: PASS");
