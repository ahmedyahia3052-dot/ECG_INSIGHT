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
  const status = await fs.readFile(path.join(viewerRoot, "EcgViewerTimeline.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["report view mode type", types.includes('"report"') && types.includes('"measurement"')],
    ["report + measurement chips", switcher.includes('"report"') && switcher.includes('"measurement"')],
    ["report preview wired", foundation.includes("EcgReportPreviewPanel") && foundation.includes('viewMode === "report"')],
    ["canvas monitor engine", monitor.includes("drawMonitorCanvas") && canvas.includes("CanvasRenderingContext2D")],
    ["keyboard shortcuts wired", foundation.includes("useEcgWorkstationShortcuts") && shortcuts.includes("ctrlKey")],
    ["monitor status bar", status.includes("sprint19-status-monitor")],
    ["report generate API", report.includes("generateReport") && report.includes("reportHtmlUrl")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 19 integration check failed: ${label}`);
  }

  console.log("sprint19-ecg-enterprise-hardening.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
