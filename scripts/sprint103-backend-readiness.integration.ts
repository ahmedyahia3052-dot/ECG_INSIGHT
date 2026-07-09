/**
 * Sprint 103 — Backend Readiness & UI Contract Stabilization integration checks.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function assertExists(relativePath: string) {
  const absolute = resolve(ROOT, relativePath);
  if (!existsSync(absolute)) throw new Error(`Missing Sprint 103 file: ${relativePath}`);
}

function assertContains(relativePath: string, markers: string[]) {
  const content = readFileSync(resolve(ROOT, relativePath), "utf8");
  for (const marker of markers) {
    if (!content.includes(marker)) throw new Error(`${relativePath} missing marker: ${marker}`);
  }
}

function assertNotContains(relativePath: string, markers: string[]) {
  const content = readFileSync(resolve(ROOT, relativePath), "utf8");
  for (const marker of markers) {
    if (content.includes(marker)) throw new Error(`${relativePath} must not contain: ${marker}`);
  }
}

const sharedTypes = [
  "shared/types/patient.ts",
  "shared/types/ecg-case.ts",
  "shared/types/ecg-report.ts",
  "shared/types/errors.ts",
  "shared/types/loading.ts",
  "shared/types/role.ts",
  "shared/types/subscription.ts",
  "shared/types/clinical-state.ts",
  "shared/types/index.ts",
];

for (const file of sharedTypes) assertExists(file);

assertExists("contracts/api-registry.json");
assertExists("contracts/README.md");
assertExists("BACKEND_READINESS_REPORT.md");

const repositories = [
  "artifacts/ecg-insight/services/foundation/repositories/case-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/patient-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/organization-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/workspace-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/viewer-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/monitor-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/subscription-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/developer-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/report-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/notification-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/audit-repository.ts",
  "artifacts/ecg-insight/services/foundation/repositories/doctor-repository.ts",
];

for (const file of repositories) assertExists(file);

assertContains("artifacts/ecg-insight/src/adapters/module-adapters.ts", [
  "DashboardAdapter",
  "CasesAdapter",
  "ReportsAdapter",
  "UploadAdapter",
  "ECGWorkspaceAdapter",
  "ECGViewerAdapter",
  "LiveMonitorAdapter",
  "ProfileAdapter",
  "SubscriptionAdapter",
  "DeveloperAdapter",
  "OrganizationAdapter",
]);

assertNotContains("artifacts/ecg-insight/services/domain/clinical-service.ts", ["react", "jsx", "from \"react\""]);
assertNotContains("artifacts/ecg-insight/services/foundation/repositories/case-repository.ts", ["react", "jsx"]);

assertContains("shared/config/feature-flags.ts", ["UI_BOLT", "LEGACY_UI", "LIVE_MONITOR", "PRO_VIEWER", "AI_OVERLAY", "SUBSCRIPTIONS", "ORGANIZATIONS", "MULTI_TENANT", "DEVELOPER_MODE"]);

assertContains("artifacts/ecg-insight/app/(protected)/dashboard.tsx", ["DashboardContainer"]);
assertContains("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx", ['from "@/routes"']);

assertContains("scripts/integration/pipeline.mjs", [
  "scripts/sprint103-backend-readiness.test.ts",
  "scripts/sprint103-backend-readiness.integration.ts",
]);

console.log("Sprint 103 Backend Readiness integration checks: PASS");
