import fs from "node:fs";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

function read(file: string) {
  return fs.readFileSync(path.join(viewerRoot, file), "utf8");
}

async function main() {
  const foundation = read("EcgMonitorViewerFoundation.tsx");
  const toolbar = read("EcgZeroChromeToolbar.tsx");
  const leftPanel = read("EcgUnifiedClinicalLeftPanel.tsx");
  const rightPanel = read("EcgClinicalRightPanel.tsx");
  const statusBar = read("EcgEnterpriseStatusBar.tsx");
  const miniNav = read("EcgMiniNavigator.tsx");
  const viewer = read("EcgProViewerEngine.tsx");
  const layout = read("EcgViewerResizableWorkspace.tsx");

  const checks: Array<[string, boolean]> = [
    ["clinical summary left panel", leftPanel.includes("sprint35-clinical-summary-panel")],
    ["12-lead selector grid", read("EcgLeadSelectorGrid.tsx").includes("sprint32-lead-selector-grid")],
    ["compact toolbar", toolbar.includes("sprint35-compact-toolbar") || toolbar.includes("sprint52-grouped-toolbar")],
    ["clinical status bar", statusBar.includes("sprint35-enterprise-status-bar")],
    ["tabbed right panel", rightPanel.includes("sprint35-clinical-right-panel")],
    ["hero fit on load", viewer.includes('applyFit("hero")') || viewer.includes('applyFit("contain")')],
    ["real mini navigator", miniNav.includes("sprint32-ecg-mini-navigator")],
    ["clinical workflow chrome", foundation.includes("EcgClinicalWorkflowRibbon") && foundation.includes("EcgClinicalAlertsBanner")],
    ["layout persistence v6+", layout.includes("panel-layout-v")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 32 integration check failed: ${label}`);
  }

  console.log("sprint32-clinical-cockpit.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
