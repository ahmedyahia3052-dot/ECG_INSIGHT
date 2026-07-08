import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

async function main() {
  const required = [
    "EcgWorkstationGridShell.tsx",
    "EcgUnifiedClinicalLeftPanel.tsx",
    "EcgWorkstationToolbar.tsx",
    "EcgEnterpriseStatusBar.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgMonitorViewerFoundation.tsx",
    "ecgMonitorCanvas.ts",
    "EcgZeroChromeToolbar.tsx",
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");
  const grid = await fs.readFile(path.join(viewerRoot, "EcgWorkstationGridShell.tsx"), "utf8");
  const nav = await fs.readFile(path.join(viewerRoot, "EcgUnifiedClinicalLeftPanel.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const status = await fs.readFile(path.join(viewerRoot, "EcgEnterpriseStatusBar.tsx"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "ecgMonitorCanvas.ts"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["CSS grid layout shell", grid.includes("display: \"grid\"") && (grid.includes("sprint24-workstation-grid") || grid.includes("sprint25-workstation-dock") || grid.includes("sprint29-enterprise-layout"))],
    ["left unified clinical panel", foundation.includes("EcgUnifiedClinicalLeftPanel")],
    ["ribbon toolbar monitor export", toolbar.includes("sprint18-export-pdf") && (toolbar.includes("sprint18-monitor-mode") || foundation.includes("EcgViewModeSwitcher"))],
    ["playback wired to foundation", foundation.includes("playback={playback}")],
    ["hospital status bar metrics", status.includes("sprint17-status-fps") && (status.includes("sprint28-status-canvas") || status.includes("sprint35-enterprise-status-bar"))],
    ["clinical sidebar export panel", panel.includes('title="Export"') || panel.includes("onExportPdf")],
    ["bezier monitor smoothing", canvas.includes("quadraticCurveTo")],
    ["sprint readiness", foundation.includes("sprint30-clinical-workflow-ready") || foundation.includes("sprint29-zero-chrome-workstation-ready")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 24 integration check failed: ${label}`);
  }

  console.log("sprint24-hospital-workstation-rebuild.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
