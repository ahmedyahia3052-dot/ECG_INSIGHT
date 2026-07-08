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
    "EcgZeroChromeToolbar.tsx",
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");
  const grid = await fs.readFile(path.join(viewerRoot, "EcgWorkstationGridShell.tsx"), "utf8");
  const leftRail = await fs.readFile(path.join(viewerRoot, "EcgViewerLeftRail.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "ecgMonitorCanvas.ts"), "utf8");
  const shortcuts = await fs.readFile(path.join(viewerRoot, "useEcgWorkstationShortcuts.ts"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["docking layout shell", grid.includes("sprint25-workstation-dock") || grid.includes("sprint29-enterprise-layout")],
    ["drag-resize persistence", foundation.includes("EcgViewerResizableWorkspace")],
    ["clinical cards left rail", leftRail.includes("EcgClinicalCard")],
    ["workflow timeline", foundation.includes("EcgClinicalWorkflowTimeline") || foundation.includes("EcgClinicalWorkflowRibbon")],
    [
      "command ribbon digitize export",
      (toolbar.includes("sprint18-digitize") || toolbar.includes("sprint52-toolbar-digitized") || toolbar.includes("Digitized")) &&
        (toolbar.includes("sprint18-export-pdf") || toolbar.includes("sprint52-toolbar-export") || toolbar.includes("Export PDF")),
    ],
    ["command palette", foundation.includes("EcgCommandPalette") && (toolbar.includes("sprint25-open-command-palette") || foundation.includes("setCommandPaletteOpen"))],
    ["crosshair overlay", foundation.includes("showCrosshair")],
    [
      "clinical decision panel",
      (panel.includes("sprint35-clinical-right-panel") ||
        panel.includes("sprint335-clinical-right-panel") ||
        panel.includes("sprint30-clinical-right-panel")) &&
        (panel.includes("EcgAiCardiologistWorkspace") || panel.includes("EcgAiReviewWorkflowPanel")),
    ],
    ["ctrl+k shortcut", shortcuts.includes('event.key.toLowerCase() === "k"')],
    ["bezier monitor smoothing", canvas.includes("quadraticCurveTo")],
    ["sprint readiness", foundation.includes("sprint30-clinical-workflow-ready") || foundation.includes("sprint29-zero-chrome-workstation-ready")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 25 integration check failed: ${label}`);
  }

  console.log("sprint25-hospital-ux-rebuild.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
