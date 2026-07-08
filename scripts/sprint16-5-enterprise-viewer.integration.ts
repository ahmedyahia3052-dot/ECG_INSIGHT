import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");
const required = [
  "EcgMonitorViewerFoundation.tsx",
  "EcgViewerToolbar.tsx",
  "EcgViewerLeftRail.tsx",
  "EcgViewerRightRail.tsx",
  "EcgDigitizationQualityPanel.tsx",
  "EcgCompareViewer.tsx",
  "EcgViewerSettingsPanel.tsx",
  "useEcgEnterpriseViewerState.ts",
  "ecgDigitizedWaveformSync.ts",
  "EcgWorkstationToolbar.tsx",
  "EcgClinicalRightPanel.tsx",
];

async function main() {
  for (const file of required) {
    const target = path.join(viewerRoot, file);
    await fs.access(target);
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgViewerToolbar.tsx"), "utf8");
  const rightRail = await fs.readFile(path.join(viewerRoot, "EcgViewerRightRail.tsx"), "utf8");
  const rightPanel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const zeroChrome = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["digital ECG query wired", foundation.includes("getDigitalECG")],
    ["enterprise viewer state", foundation.includes("useEcgEnterpriseViewerState")],
    ["compare viewer canvas", foundation.includes("compareMode")],
    ["digitization quality panel", rightRail.includes("EcgDigitizationQualityPanel") || rightPanel.includes("Digitization Score")],
    ["settings panel", foundation.includes("EcgViewerSettingsPanel")],
    ["enterprise workstation toolbar", foundation.includes("EcgWorkstationToolbar")],
    ["legacy viewer toolbar", toolbar.includes("sprint13-ecg-viewer-toolbar")],
    ["previous/next navigation", toolbar.includes("Previous") && toolbar.includes("Next")],
    ["waveform toggle", toolbar.includes("Wave On") || zeroChrome.includes("Waveform") || zeroChrome.includes("Digitized")],
    ["digitized waveform sync", foundation.includes("buildSegmentAlignedDigitizedWaveformLeads")],
    [
      "live monitor waveform",
      foundation.includes("EcgLiveMonitorView") ||
        foundation.includes("EcgDiagnosticWorkstationShell") ||
        foundation.includes("useEcgWaveformPlayback"),
    ],
    ["clinical findings digital merge", foundation.includes("useEcgClinicalFindings(ecgCase, workspace, analysis, explainability, digitalEcg)")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 16.5 integration check failed: ${label}`);
  }

  console.log("sprint16-5-enterprise-viewer.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
