import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

async function main() {
  const required = [
    "EcgWorkstationToolbar.tsx",
    "EcgWorkstationGridShell.tsx",
    "EcgViewModeSwitcher.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgEnterpriseStatusBar.tsx",
    "ecgWorkstationVisualTokens.ts",
    "EcgClinicalWorkflowRibbon.tsx",
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");
  const grid = await fs.readFile(path.join(viewerRoot, "EcgWorkstationGridShell.tsx"), "utf8");
  const modes = await fs.readFile(path.join(viewerRoot, "EcgViewModeSwitcher.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const status = await fs.readFile(path.join(viewerRoot, "EcgEnterpriseStatusBar.tsx"), "utf8");
  const tokens = await fs.readFile(path.join(viewerRoot, "ecgWorkstationVisualTokens.ts"), "utf8");
  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const ribbon = await fs.readFile(path.join(viewerRoot, "EcgClinicalWorkflowRibbon.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["compact ribbon toolbar", toolbar.includes("sprint35-compact-toolbar") || toolbar.includes("sprint52-grouped-toolbar") || toolbar.includes("sprint29-zero-chrome-toolbar")],
    ["toolbar max height token", tokens.includes("toolbarMaxHeight") && tokens.includes("toolbarButtonSize")],
    ["mode switcher row", modes.includes("sprint26-view-mode-switcher") && modes.includes("Live Monitor")],
    ["layout shell", grid.includes("sprint29-enterprise-layout") || foundation.includes("EcgViewerResizableWorkspace")],
    ["tabbed clinical panel", (panel.includes("sprint35-clinical-tabs") || panel.includes("sprint26-clinical-tabs")) && panel.includes('"History"')],
    ["enterprise status bar", status.includes("sprint35-enterprise-status-bar") || status.includes("sprint335-enterprise-status-bar")],
    ["clinical workflow ribbon", ribbon.includes("sprint30-clinical-workflow-ribbon") && foundation.includes("EcgClinicalWorkflowRibbon")],
    ["view mode switcher wired", foundation.includes("EcgViewModeSwitcher")],
    ["sprint readiness", foundation.includes("sprint30-clinical-workflow-ready") || foundation.includes("sprint29-zero-chrome-workstation-ready")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 26 integration check failed: ${label}`);
  }

  console.log("sprint26-hospital-layout-optimization.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
