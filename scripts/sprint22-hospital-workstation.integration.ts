import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

async function main() {
  const required = [
    "EcgMonitorMiniNavigator.tsx",
    "ecgMonitorCanvas.ts",
    "ecgMonitorBeatMarkers.ts",
    "EcgLiveMonitorView.tsx",
    "EcgWorkstationToolbar.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgViewerResizableWorkspace.tsx",
    "EcgMonitorViewerFoundation.tsx",
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
  const monitor = await fs.readFile(path.join(viewerRoot, "EcgLiveMonitorView.tsx"), "utf8");
  const markers = await fs.readFile(path.join(viewerRoot, "ecgMonitorBeatMarkers.ts"), "utf8");
  const navigator = await fs.readFile(path.join(viewerRoot, "EcgMonitorMiniNavigator.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["clinical workflow shell", foundation.includes("sprint30-clinical-workflow-ready")],
    ["panel collapse state", foundation.includes("panelLayout") && foundation.includes("onToggleLeftPanel")],
    ["enterprise resizable layout", layout.includes("EcgEnterpriseLayoutEngine") && layout.includes("leftCollapsed")],
    ["zero chrome toolbar", toolbar.includes("sprint35-compact-toolbar") || toolbar.includes("sprint29-zero-chrome-toolbar")],
    ["clinical measurement studio", panel.includes("EcgMeasurementStudioPanel")],
    ["history engine panel", panel.includes("EcgHistoryEnginePanel")],
    ["hospital monitor canvas RAF loop", monitor.includes("requestAnimationFrame") && monitor.includes("sprint22-hospital-monitor-canvas")],
    ["phosphor + major/minor grid", (canvas.includes("drawHospitalGrid") || canvas.includes("drawClinicalGrid") || canvas.includes("drawHospitalEcgGrid")) && canvas.includes("phosphorPersistence")],
    ["PVC + pacing markers", markers.includes("detectPvcIndices") && canvas.includes("beatMarkerPositions")],
    ["mini navigator", navigator.includes("sprint22-monitor-mini-navigator") && navigator.includes("drawMonitorOverview")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 22 integration check failed: ${label}`);
  }

  console.log("sprint22-hospital-workstation.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
