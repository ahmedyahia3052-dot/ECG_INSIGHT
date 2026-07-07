import fs from "node:fs";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

function read(file: string) {
  return fs.readFileSync(path.join(viewerRoot, file), "utf8");
}

async function main() {
  const required = [
    "EcgUnifiedClinicalLeftPanel.tsx",
    "EcgWorkstationTooltip.tsx",
    "EcgClinicalWorkflowRibbon.tsx",
    "EcgZeroChromeToolbar.tsx",
    "EcgEnterpriseStatusBar.tsx",
    "EcgMonitorViewerFoundation.tsx",
    "useEnterpriseStatusMetrics.ts",
    "useEcgDiagnosticMode.ts",
    "useEcgWorkstationShortcuts.ts",
    "EcgViewerResizableWorkspace.tsx",
  ];

  for (const file of required) {
    fs.accessSync(path.join(viewerRoot, file));
  }

  const foundation = read("EcgMonitorViewerFoundation.tsx");
  const ribbon = read("EcgClinicalWorkflowRibbon.tsx");
  const toolbar = read("EcgZeroChromeToolbar.tsx");
  const leftPanel = read("EcgUnifiedClinicalLeftPanel.tsx");
  const metrics = read("useEnterpriseStatusMetrics.ts");
  const shortcuts = read("useEcgWorkstationShortcuts.ts");
  const layout = read("EcgViewerResizableWorkspace.tsx");
  const grid = read("EcgWorkstationGridShell.tsx");
  const enterpriseUi = fs.readFileSync(path.resolve(process.cwd(), "artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["pipeline chips wrap not scroll", ribbon.includes("flexWrap: \"wrap\"") && !ribbon.includes("ScrollView horizontal")],
    ["unified left clinical panel", foundation.includes("EcgUnifiedClinicalLeftPanel") && (leftPanel.includes("sprint33-clinical-summary-panel") || leftPanel.includes("sprint32-clinical-summary-panel"))],
    ["removed duplicate workstation nav", !foundation.includes("EcgWorkstationLeftNav")],
    ["enterprise sidebar hidden on workspace", enterpriseUi.includes("!isEcgMonitorWorkspace && !isMobile")],
    ["status metrics throttled", metrics.includes("statusBarUpdateIntervalMs")],
    ["diagnostic fullscreen hides panels", foundation.includes("diagnosticMode ? null")],
    ["toolbar tooltips", toolbar.includes("EcgWorkstationTooltip")],
    ["layout persistence v5", layout.includes("panel-layout-v5") || layout.includes("panel-layout-v6")],
    ["keyboard reset view", shortcuts.includes("resetView") && shortcuts.includes('event.key.toLowerCase() === "r"')],
    ["diagnostic grid full center", grid.includes("diagnosticMode") && grid.includes("hideBottom")],
    ["no duplicate left timeline", !foundation.includes("EcgClinicalWorkflowTimeline")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 31 integration check failed: ${label}`);
  }

  console.log("sprint31-clinical-workspace-polish.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
