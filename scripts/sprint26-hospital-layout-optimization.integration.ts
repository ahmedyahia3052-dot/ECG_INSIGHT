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
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgWorkstationToolbar.tsx"), "utf8");
  const grid = await fs.readFile(path.join(viewerRoot, "EcgWorkstationGridShell.tsx"), "utf8");
  const modes = await fs.readFile(path.join(viewerRoot, "EcgViewModeSwitcher.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const status = await fs.readFile(path.join(viewerRoot, "EcgEnterpriseStatusBar.tsx"), "utf8");
  const tokens = await fs.readFile(path.join(viewerRoot, "ecgWorkstationVisualTokens.ts"), "utf8");
  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["compact ribbon toolbar", toolbar.includes("sprint26-compact-ribbon") && toolbar.includes("OverflowMenu")],
    ["toolbar max height 44px", tokens.includes("toolbarMaxHeight: 44") && tokens.includes("toolbarButtonSize: 42")],
    ["horizontal scroll no wrap", toolbar.includes("horizontal") && !toolbar.includes("flexWrap: \"wrap\"")],
    ["80% layout shell", grid.includes("sprint26-workstation-layout") && tokens.includes("leftCollapsedWidth: 60")],
    ["compact mode switcher row", modes.includes("sprint26-view-mode-switcher") && modes.includes("Live Monitor")],
    ["tabbed clinical panel", panel.includes("sprint26-clinical-tabs") && panel.includes('"History"')],
    ["compact status bar 28px", status.includes("sprint26-compact-status-bar") && tokens.includes("statusBarHeight: 28")],
    ["left collapse 60px rail", grid.includes("leftCollapsedWidth") && foundation.includes("leftCollapsed: next")],
    ["sprint26 readiness", foundation.includes("sprint26-hospital-workstation-ready")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 26 integration check failed: ${label}`);
  }

  console.log("sprint26-hospital-layout-optimization.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
