import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizeUiError } from "../artifacts/ecg-insight/src/errors/ui-error";
import { resolveUiLoadingState } from "../artifacts/ecg-insight/src/core/adapter-state";
import { isFeatureEnabled } from "../artifacts/ecg-insight/src/core/feature-flags";
import { getUiPresentationMode, isBoltUiEnabled } from "../artifacts/ecg-insight/src/migration/ui-migration-mode";
import { CaseMapper } from "../artifacts/ecg-insight/src/mappers";
import { statusPresenter } from "../artifacts/ecg-insight/src/presenters";

const moduleAdapters = readFileSync(resolve("artifacts/ecg-insight/src/adapters/module-adapters.ts"), "utf8");
const hooks = readFileSync(resolve("artifacts/ecg-insight/src/hooks/index.ts"), "utf8");

assert.equal(resolveUiLoadingState({ data: null, isError: false, isLoading: true }), "loading");
assert.equal(resolveUiLoadingState({ data: [], emptyWhen: (data) => Array.isArray(data) && data.length === 0, isError: false, isLoading: false }), "empty");
assert.equal(normalizeUiError(new Error("403 forbidden")).kind, "authorization");
assert.equal(isFeatureEnabled("dashboard"), true);
assert.match(moduleAdapters, /class DashboardAdapter extends BaseAdapter/);
assert.match(hooks, /export function useDashboard\(\)/);
assert.match(hooks, /export function useLiveMonitor\(/);

const vm = CaseMapper.toListItem({
  acquisitionDate: "2026-01-01",
  aiStatus: "completed",
  caseId: "CASE-1",
  caseNumber: "ECG-1",
  ecgType: "12-lead",
  heartRate: 72,
  id: "1",
  patient: { age: 40, dateOfBirth: "1986-01-01", firstName: "Jane", gender: "female", id: "p1", lastName: "Doe", medicalRecordNumber: "MRN1" },
  priority: "normal",
  rhythm: "sinus",
  severity: "normal",
  status: "approved",
  uploadDate: "2026-01-01",
} as never);

assert.equal(vm.patientName, "Jane Doe");
assert.equal(statusPresenter.caseStatus("approved").tone, "success");
assert.ok(["legacy", "bolt"].includes(getUiPresentationMode()));
assert.equal(typeof isBoltUiEnabled(), "boolean");

console.log("Sprint 103 UI Integration Adapter Layer unit tests: PASS");
