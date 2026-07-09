import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 102 marker: ${needle}`);
    }
  }
}

function assertNotContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (content.includes(needle)) {
      throw new Error(`${path} should not contain legacy Sprint 102 marker: ${needle}`);
    }
  }
}

const foundationPaths = [
  "artifacts/ecg-insight/types/async-state.ts",
  "artifacts/ecg-insight/adapters/clinical/ecg-case.adapter.ts",
  "artifacts/ecg-insight/adapters/ui/clinical-ui.adapter.ts",
  "artifacts/ecg-insight/store/query-keys.ts",
  "artifacts/ecg-insight/routes/registry.ts",
  "artifacts/ecg-insight/theme/index.ts",
  "artifacts/ecg-insight/utils/asyncState.ts",
  "artifacts/ecg-insight/components/async-states/AsyncStateView.tsx",
  "artifacts/ecg-insight/services/domain/clinical-service.ts",
  "artifacts/ecg-insight/services/domain/reports-service.ts",
  "artifacts/ecg-insight/hooks/domain/useDashboardData.ts",
  "artifacts/ecg-insight/hooks/domain/useEcgCasesPage.ts",
  "artifacts/ecg-insight/hooks/domain/useEcgCaseDetail.ts",
  "artifacts/ecg-insight/hooks/domain/useOwnerLicensesPage.ts",
];

for (const path of foundationPaths) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing Sprint 102 foundation file: ${path}`);
  }
}

assertContains("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx", [
  'from "@/routes"',
  "APP_NAV_ITEMS",
  "resolvePageMeta",
]);

assertNotContains("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx", [
  "const PAGE_TITLES:",
  "function roleRank(role?: string)",
]);

assertContains("artifacts/ecg-insight/app/(protected)/dashboard.tsx", [
  "useDashboardData",
]);

assertContains("artifacts/ecg-insight/app/(protected)/ecg-cases/index.tsx", [
  "useEcgCasesPage",
]);

assertContains("artifacts/ecg-insight/app/(protected)/ecg-cases/[id].tsx", [
  "useEcgCaseDetail",
  "AsyncStateView",
]);

assertContains("artifacts/ecg-insight/app/(protected)/owner/licenses.tsx", [
  "useOwnerLicensesPage",
]);

assertContains("artifacts/ecg-insight/app/(protected)/reports/[id].tsx", [
  "reportsDomainService",
  "AsyncStateView",
]);

assertContains("artifacts/ecg-insight/services/domain/reports-service.ts", [
  "openReportHtml",
  "openReportPdf",
  "shareReport",
]);

assertContains("scripts/integration/pipeline.mjs", [
  "scripts/sprint102-frontend-foundation.test.ts",
  "scripts/sprint102-frontend-foundation.integration.ts",
]);

console.log("Sprint 102 Frontend Foundation integration checks: PASS");
