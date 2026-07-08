import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

async function main() {
  const required = [
    "EcgEnterpriseStatusBar.tsx",
    "useEnterpriseStatusMetrics.ts",
    "ecgMonitorBeatMarkers.ts",
    "EcgWorkstationToolbar.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgMonitorViewerFoundation.tsx",
    "EcgViewerResizableWorkspace.tsx",
    "EcgZeroChromeToolbar.tsx",
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const layout = await fs.readFile(path.join(viewerRoot, "EcgViewerResizableWorkspace.tsx"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "ecgMonitorCanvas.ts"), "utf8");
  const beatMarkers = await fs.readFile(path.join(viewerRoot, "ecgMonitorBeatMarkers.ts"), "utf8");
  const types = await fs.readFile(path.join(viewerRoot, "types.ts"), "utf8");
  const left = await fs.readFile(path.join(viewerRoot, "EcgUnifiedClinicalLeftPanel.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["clinical workflow shell", foundation.includes("sprint30-clinical-workflow-ready") || foundation.includes("sprint29-zero-chrome-workstation-ready")],
    ["enterprise status bar", foundation.includes("EcgEnterpriseStatusBar")],
    ["ai-review mode", types.includes('"ai-review"') && foundation.includes('"ai-review"')],
    ["toolbar export and measure", toolbar.includes("sprint18-export-pdf") && (toolbar.includes("sprint21-measurement-mode") || toolbar.includes("sprint52-toolbar-measurements") || toolbar.includes("Measurements"))],
    ["clinical patient workspace", panel.includes("EcgPatientWorkspacePanel") || (foundation.includes("EcgUnifiedClinicalLeftPanel") && left.includes('title="Patient"'))],
    ["enterprise layout engine", layout.includes("EcgEnterpriseLayoutEngine")],
    ["monitor glow + beat markers", canvas.includes("shadowBlur") && beatMarkers.includes("beatMarkerPositions")],
    ["status metrics hook", foundation.includes("useEnterpriseStatusMetrics")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 21 integration check failed: ${label}`);
  }

  console.log("sprint21-ecg-workstation-ux-revolution.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
