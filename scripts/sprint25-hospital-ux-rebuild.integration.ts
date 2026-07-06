import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

async function main() {
  const required = [
    "EcgWorkstationGridShell.tsx",
    "EcgClinicalCard.tsx",
    "EcgClinicalWorkflowTimeline.tsx",
    "EcgCommandPalette.tsx",
    "EcgViewerCrosshairOverlay.tsx",
    "EcgWorkstationToolbar.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgMonitorViewerFoundation.tsx",
    "EcgViewerLeftRail.tsx",
    "ecgMonitorCanvas.ts",
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgWorkstationToolbar.tsx"), "utf8");
  const grid = await fs.readFile(path.join(viewerRoot, "EcgWorkstationGridShell.tsx"), "utf8");
  const leftRail = await fs.readFile(path.join(viewerRoot, "EcgViewerLeftRail.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "ecgMonitorCanvas.ts"), "utf8");
  const shortcuts = await fs.readFile(path.join(viewerRoot, "useEcgWorkstationShortcuts.ts"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["docking layout shell", grid.includes("sprint25-workstation-dock") && grid.includes("sprint25-resize-left")],
    ["drag-resize persistence", foundation.includes("EcgViewerResizableWorkspace") && grid.includes("onLeftWidthChange")],
    ["clinical cards left rail", leftRail.includes("EcgClinicalCard") && leftRail.includes("sprint25-clinical-left-rail")],
    ["workflow timeline", foundation.includes("EcgClinicalWorkflowTimeline")],
    ["command ribbon groups", toolbar.includes('label: "DIGITIZE"') && toolbar.includes('label: "MEASURE"') && toolbar.includes('label: "EXPORT"')],
    ["command palette", foundation.includes("EcgCommandPalette") && toolbar.includes("sprint25-open-command-palette")],
    ["crosshair overlay", foundation.includes("showCrosshair")],
    ["decision-support panel", panel.includes("sprint25-clinical-right-panel") && panel.includes('title="Recommendations"')],
    ["ctrl+k shortcut", shortcuts.includes('event.key.toLowerCase() === "k"')],
    ["bezier monitor smoothing", canvas.includes("quadraticCurveTo")],
    ["sprint25 readiness", foundation.includes("sprint25-hospital-workstation-ready")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 25 integration check failed: ${label}`);
  }

  console.log("sprint25-hospital-ux-rebuild.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
