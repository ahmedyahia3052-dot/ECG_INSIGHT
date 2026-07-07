import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assertContains(path: string, markers: string[]) {
  const source = read(path);
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${path} missing marker: ${marker}`);
  }
}

assertContains("artifacts/ecg-insight/app/(protected)/ecg-workspace.tsx", [
  "EcgEnterpriseWorkspaceScreen",
  "useEcgWorkspaceCaseResolver",
  "ecg-workspace-resolving",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/EcgEnterpriseWorkspaceScreen.tsx", [
  "EcgMonitorViewerFoundation",
  "ecg-enterprise-workspace-ready",
  "digitizeECG",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/useEcgWorkspaceCaseResolver.ts", [
  "listCases",
  "getPatientEcgHistory",
  "pickDemoCase",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx", [
  "sprint30-clinical-workflow-ready",
  "sprint13-ecg-monitor-ready",
  "EcgWorkstationToolbar",
  "EcgClinicalRightPanel",
  "useClinicalWorkflowEngine",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/EcgClinicalRightPanel.tsx", [
  "sprint33-clinical-right-panel",
  "EcgMeasurementStudioPanel",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/EcgViewerRightRail.tsx", [
  "EcgDigitizationQualityPanel",
  "sprint165-ecg-right-rail",
]);

assertContains("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx", [
  'href: "/ecg-workspace"',
  'pathname.startsWith("/ecg-workspace")',
]);

const legacyWorkspace = read("artifacts/ecg-insight/app/(protected)/ecg-workspace.tsx");
if (legacyWorkspace.includes("EcgImageImport") || legacyWorkspace.includes("EcgWorkspaceViewer")) {
  throw new Error("Legacy ECG workspace import UI still active on /ecg-workspace");
}

console.log("ECG workspace restoration integration checks passed.");
