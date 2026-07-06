import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

async function main() {
  const required = [
    "EcgWorkstationGridShell.tsx",
    "EcgWorkstationLeftNav.tsx",
    "EcgWorkstationToolbar.tsx",
    "EcgEnterpriseStatusBar.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgMonitorViewerFoundation.tsx",
    "ecgMonitorCanvas.ts",
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgWorkstationToolbar.tsx"), "utf8");
  const grid = await fs.readFile(path.join(viewerRoot, "EcgWorkstationGridShell.tsx"), "utf8");
  const nav = await fs.readFile(path.join(viewerRoot, "EcgWorkstationLeftNav.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const status = await fs.readFile(path.join(viewerRoot, "EcgEnterpriseStatusBar.tsx"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "ecgMonitorCanvas.ts"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["CSS grid layout shell", grid.includes("display: \"grid\"") && (grid.includes("sprint24-workstation-grid") || grid.includes("sprint25-workstation-dock"))],
    ["left workstation nav", nav.includes("sprint24-workstation-left-nav") && foundation.includes("EcgWorkstationLeftNav")],
    ["ribbon toolbar groups", (toolbar.includes('label: "GRID"') || toolbar.includes('label: "DIGITIZE"')) && toolbar.includes('label: "MONITOR"') && (toolbar.includes('label: "REPORT"') || toolbar.includes('label: "EXPORT"'))],
    ["playback wired to ribbon", toolbar.includes("playback?.togglePlay") && foundation.includes("playback={playback}")],
    ["hospital status bar metrics", status.includes("sprint24-status-cpu") && status.includes("sprint24-status-canvas")],
    ["clinical sidebar export/timeline", panel.includes('title="Export"') && panel.includes('title="Timeline"')],
    ["bezier monitor smoothing", canvas.includes("quadraticCurveTo")],
    ["sprint24 readiness", foundation.includes("sprint24-hospital-workstation-ready") || foundation.includes("sprint25-hospital-workstation-ready")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 24 integration check failed: ${label}`);
  }

  console.log("sprint24-hospital-workstation-rebuild.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
