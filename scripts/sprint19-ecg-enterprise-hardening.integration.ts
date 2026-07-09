import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

const required = [
  "EcgReportPreviewPanel.tsx",
  "ecgMonitorCanvas.ts",
  "useEcgWorkstationShortcuts.ts",
  "EcgLiveMonitorView.tsx",
  "EcgMonitorViewerFoundation.tsx",
  "types.ts",
  "EcgViewModeSwitcher.tsx",
  "EcgEnterpriseStatusBar.tsx",
];

async function main() {
  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const types = await fs.readFile(path.join(viewerRoot, "types.ts"), "utf8");
  const switcher = await fs.readFile(path.join(viewerRoot, "EcgViewModeSwitcher.tsx"), "utf8");
  const monitor = await fs.readFile(path.join(viewerRoot, "EcgLiveMonitorView.tsx"), "utf8");
  const report = await fs.readFile(path.join(viewerRoot, "EcgReportPreviewPanel.tsx"), "utf8");
  const shortcuts = await fs.readFile(path.join(viewerRoot, "useEcgWorkstationShortcuts.ts"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "ecgMonitorCanvas.ts"), "utf8");
  const status = await fs.readFile(path.join(viewerRoot, "EcgEnterpriseStatusBar.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["report view mode type", types.includes('"report"') && types.includes('"measurement"')],
    ["primary view mode chips", switcher.includes("AI Review") && (switcher.includes("Live Monitor") || switcher.includes("Original") || switcher.includes("Digitized"))],
    ["report preview wired", foundation.includes("EcgReportPreviewPanel") && foundation.includes('viewMode === "report"')],
    [
      "canvas monitor engine",
      (monitor.includes("drawMultiLeadMonitorCanvas") ||
        monitor.includes("paintHospitalMonitorFrame") ||
        monitor.includes("drawRhythmStripCanvas")) &&
        canvas.includes("drawMonitorCanvas") &&
        canvas.includes("CanvasRenderingContext2D"),
    ],
    ["keyboard shortcuts wired", foundation.includes("useEcgWorkstationShortcuts") && shortcuts.includes("ctrlKey")],
    ["enterprise status bar", status.includes("sprint17-status-fps") && foundation.includes("EcgEnterpriseStatusBar")],
    ["report generate API", report.includes("generateReport") && report.includes("reportHtmlUrl")],
    ["report finalize sign", report.includes("finalizeReport") && report.includes("signReport")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 19 integration check failed: ${label}`);
  }

  console.log("sprint19-ecg-enterprise-hardening.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
