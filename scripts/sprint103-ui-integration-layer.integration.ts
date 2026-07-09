/**
 * Sprint 103 — UI Integration Adapter Layer integration markers.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = resolve(ROOT, "artifacts/ecg-insight/src");

function assertFileContains(file: string, markers: string[]) {
  const content = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!content.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const requiredDirs = [
  "adapters",
  "hooks",
  "view-models",
  "mappers",
  "selectors",
  "contracts",
  "presenters",
  "ui-services",
  "migration",
  "errors",
  "core",
];

for (const dir of requiredDirs) {
  const path = resolve(SRC, dir);
  if (!existsSync(path)) throw new Error(`Missing Sprint 103 directory: ${path}`);
}

const adapterMarkers = [
  "DashboardAdapter",
  "PatientAdapter",
  "CaseAdapter",
  "ECGWorkspaceAdapter",
  "ECGViewerAdapter",
  "LiveMonitorAdapter",
  "UploadAdapter",
  "HistoryAdapter",
  "ProfileAdapter",
  "SettingsAdapter",
  "OrganizationAdapter",
  "SubscriptionAdapter",
  "DeveloperAdapter",
  "NotificationAdapter",
  "AnalyticsAdapter",
  "AuthAdapter",
];

assertFileContains(resolve(SRC, "adapters/module-adapters.ts"), adapterMarkers);

const hookMarkers = [
  "useDashboard",
  "usePatients",
  "usePatient",
  "useCases",
  "useWorkspace",
  "useViewer",
  "useLiveMonitor",
  "useUpload",
  "useOrganizations",
  "useSubscriptions",
  "useDeveloper",
  "useNotifications",
  "useProfile",
];

assertFileContains(resolve(SRC, "hooks/index.ts"), hookMarkers);

assertFileContains(resolve(SRC, "view-models/index.ts"), [
  "DashboardVM",
  "PatientVM",
  "CaseVM",
  "EcgVM",
  "MonitorVM",
  "UploadVM",
  "SubscriptionVM",
  "OrganizationVM",
  "ProfileVM",
  "DeveloperVM",
  "HistoryVM",
  "NotificationVM",
]);

assertFileContains(resolve(SRC, "mappers/index.ts"), [
  "PatientMapper",
  "CaseMapper",
  "DashboardMapper",
  "ECGMapper",
  "SubscriptionMapper",
  "OrganizationMapper",
  "DeveloperMapper",
  "NotificationMapper",
]);

assertFileContains(resolve(SRC, "contracts/index.ts"), [
  "DashboardContract",
  "PatientContract",
  "WorkspaceContract",
  "ViewerContract",
  "MonitorContract",
  "UploadContract",
  "SubscriptionContract",
  "OrganizationContract",
  "DeveloperContract",
  "ProfileContract",
]);

assertFileContains(resolve(SRC, "presenters/index.ts"), ["datePresenter", "measurementPresenter", "statusPresenter"]);

assertFileContains(resolve(SRC, "ui-services/index.ts"), [
  "navigationService",
  "toastService",
  "dialogService",
  "themeService",
  "permissionService",
  "featureFlagService",
  "downloadService",
  "exportService",
  "printService",
  "clipboardService",
]);

assertFileContains(resolve(SRC, "errors/ui-error.ts"), [
  "authentication",
  "authorization",
  "validation",
  "network",
  "payment",
  "ai",
]);

assertFileContains(resolve(SRC, "core/adapter-state.ts"), ["loading", "empty", "refreshing", "skeleton", "error", "ready"]);

assertFileContains(resolve(SRC, "migration/ui-migration-mode.ts"), ["legacy", "bolt", "selectPresentation"]);

assertFileContains(resolve(ROOT, "SPRINT103_UI_INTEGRATION_REPORT.md"), ["Sprint 103", "UI Integration Adapter Layer"]);

console.log("Sprint 103 UI Integration Adapter Layer integration markers: PASS");
