import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

const required = [
  "EcgWorkstationToolbar.tsx",
  "EcgLiveMonitorView.tsx",
  "EcgWaveformPlaybackTimeline.tsx",
  "EcgClinicalRightPanel.tsx",
  "EcgViewModeSwitcher.tsx",
  "useEcgWaveformPlayback.ts",
  "ecgMonitorPath.ts",
  "EcgMonitorViewerFoundation.tsx",
  "EcgZeroChromeToolbar.tsx",
  "EcgEnterpriseLayoutEngine.tsx",
];

async function main() {
  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbarContent = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");
  const state = await fs.readFile(path.join(viewerRoot, "useEcgEnterpriseViewerState.ts"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "EcgImageCanvas.tsx"), "utf8");
  const compare = await fs.readFile(path.join(viewerRoot, "EcgCompareViewer.tsx"), "utf8");
  const monitor = await fs.readFile(path.join(viewerRoot, "EcgLiveMonitorView.tsx"), "utf8");
  const layout = await fs.readFile(path.join(viewerRoot, "EcgViewerResizableWorkspace.tsx"), "utf8");
  const layoutEngine = await fs.readFile(path.join(viewerRoot, "EcgEnterpriseLayoutEngine.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["clinical workflow shell", foundation.includes("sprint30-clinical-workflow-ready") || foundation.includes("sprint29-zero-chrome-workstation-ready")],
    ["grouped toolbar wired", foundation.includes("EcgWorkstationToolbar")],
    ["view mode switcher", foundation.includes("EcgViewModeSwitcher")],
    [
      "live monitor mode",
      foundation.includes("EcgLiveMonitorView") || foundation.includes("EcgDiagnosticWorkstationShell") || foundation.includes("useEcgWaveformPlayback"),
    ],
    [
      "playback timeline",
      foundation.includes("EcgWaveformPlaybackTimeline") || foundation.includes("useEcgWaveformPlayback") || foundation.includes("rhythmLead"),
    ],
    ["clinical right panel", foundation.includes("EcgClinicalRightPanel")],
    ["view modes in state", state.includes("EcgWorkstationViewMode") && state.includes("setViewMode")],
    ["compare layouts", state.includes("compareLayout") && compare.includes("sprint18-ecg-compare-overlay")],
    ["waveform-only view", canvas.includes("sprint18-waveform-view")],
    ["monitor svg sweep", monitor.includes("LIVE SWEEP") && monitor.includes("requestAnimationFrame")],
    [
      "toolbar groups",
      toolbarContent.includes("sprint35-compact-toolbar") ||
        toolbarContent.includes("sprint52-grouped-toolbar") ||
        toolbarContent.includes("sprint29-zero-chrome-toolbar") ||
        toolbarContent.includes("sprint335-compact-toolbar") ||
        toolbarContent.includes("sprint33-compact-toolbar"),
    ],
    ["enterprise layout engine", layout.includes("EcgEnterpriseLayoutEngine") && layoutEngine.includes("center")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 18 integration check failed: ${label}`);
  }

  console.log("sprint18-ecg-clinical-workstation.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
