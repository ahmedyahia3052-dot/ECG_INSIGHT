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
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgWorkstationToolbar.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const layout = await fs.readFile(path.join(viewerRoot, "EcgViewerResizableWorkspace.tsx"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "ecgMonitorCanvas.ts"), "utf8");
  const monitor = await fs.readFile(path.join(viewerRoot, "EcgLiveMonitorView.tsx"), "utf8");
  const markers = await fs.readFile(path.join(viewerRoot, "ecgMonitorBeatMarkers.ts"), "utf8");
  const navigator = await fs.readFile(path.join(viewerRoot, "EcgMonitorMiniNavigator.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["hospital workstation title", foundation.includes("Hospital ECG Workstation")],
    ["panel collapse state", foundation.includes("panelLayout") && foundation.includes("onToggleLeftPanel")],
    ["90% viewer layout", layout.includes("defaultSize={90}")],
    ["collapsible side panels", layout.includes("leftCollapsed") && layout.includes("rightCollapsed")],
    ["toolbar groups DIGITIZE/DISPLAY/TOOLS", toolbar.includes('label: "DIGITIZE"') && toolbar.includes('label: "DISPLAY"') && toolbar.includes('label: "TOOLS"')],
    ["clinical sidebar case + intervals + rhythm", panel.includes('title="Case"') && panel.includes('title="Intervals"') && panel.includes('title="Rhythm"')],
    ["clinical sidebar ST + history", panel.includes('title="ST"') && panel.includes('title="Previous ECG"')],
    ["hospital monitor canvas RAF loop", monitor.includes("requestAnimationFrame") && monitor.includes("sprint22-hospital-monitor-canvas")],
    ["phosphor + major/minor grid", canvas.includes("drawHospitalGrid") && canvas.includes("phosphorPersistence")],
    ["PVC + pacing markers", markers.includes("detectPvcIndices") && canvas.includes("beatMarkerPositions")],
    ["mini navigator", navigator.includes("sprint22-monitor-mini-navigator") && navigator.includes("drawMonitorOverview")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 22 integration check failed: ${label}`);
  }

  console.log("sprint22-hospital-workstation.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
