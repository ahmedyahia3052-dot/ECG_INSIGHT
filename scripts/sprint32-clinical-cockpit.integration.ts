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
    "EcgLeadSelectorGrid.tsx",
    "EcgZeroChromeToolbar.tsx",
    "EcgEnterpriseStatusBar.tsx",
    "EcgMiniNavigator.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgProViewerEngine.tsx",
    "EcgMonitorViewerFoundation.tsx",
    "ecgCockpitColors.ts",
    "EcgViewerResizableWorkspace.tsx",
  ];

  for (const file of required) {
    fs.accessSync(path.join(viewerRoot, file));
  }

  const foundation = read("EcgMonitorViewerFoundation.tsx");
  const toolbar = read("EcgZeroChromeToolbar.tsx");
  const leftPanel = read("EcgUnifiedClinicalLeftPanel.tsx");
  const rightPanel = read("EcgClinicalRightPanel.tsx");
  const statusBar = read("EcgEnterpriseStatusBar.tsx");
  const miniNav = read("EcgMiniNavigator.tsx");
  const viewer = read("EcgProViewerEngine.tsx");
  const layout = read("EcgViewerResizableWorkspace.tsx");
  const controls = read("useEcgViewerControls.ts");

  const checks: Array<[string, boolean]> = [
    ["clinical summary left panel", leftPanel.includes("sprint33-clinical-summary-panel") || leftPanel.includes("sprint32-clinical-summary-panel")],
    ["12-lead selector grid", read("EcgLeadSelectorGrid.tsx").includes("sprint32-lead-selector-grid")],
    ["compact toolbar", toolbar.includes("sprint33-compact-toolbar") || toolbar.includes("sprint32-popover-toolbar")],
    ["doctor vs developer status bar", statusBar.includes("developerMode") && statusBar.includes("sprint32-dev-mode-toggle")],
    ["foundation developer mode toggle", foundation.includes("developerMode") && foundation.includes("onToggleDeveloperMode")],
    ["tabbed right panel AI Findings", rightPanel.includes("AI Findings") && (rightPanel.includes("sprint33-clinical-right-panel") || rightPanel.includes("sprint32-clinical-right-panel"))],
    ["hero fit on load", viewer.includes('applyFit("hero")') || viewer.includes('applyFit("contain")')],
    ["real mini navigator", miniNav.includes("sprint32-ecg-mini-navigator") && miniNav.includes("fitsEntirely")],
    ["removed view mode switcher chrome", !foundation.includes("EcgViewModeSwitcher") && !foundation.includes("EcgClinicalAlertsBanner")],
    ["cockpit color system", read("ecgCockpitColors.ts").includes("accent: \"#14DDE6\"")],
    ["layout persistence v6+", layout.includes("panel-layout-v6") || layout.includes("panel-layout-v7")],
    ["narrow panels for hero viewer", read("ecgWorkstationVisualTokens.ts").includes("leftExpandedWidth: 160") || read("ecgWorkstationVisualTokens.ts").includes("leftExpandedWidth: 176")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 32 integration check failed: ${label}`);
  }

  console.log("sprint32-clinical-cockpit.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
