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
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgWorkstationToolbar.tsx"), "utf8");
  const panel = await fs.readFile(path.join(viewerRoot, "EcgClinicalRightPanel.tsx"), "utf8");
  const layout = await fs.readFile(path.join(viewerRoot, "EcgViewerResizableWorkspace.tsx"), "utf8");
  const canvas = await fs.readFile(path.join(viewerRoot, "ecgMonitorCanvas.ts"), "utf8");
  const types = await fs.readFile(path.join(viewerRoot, "types.ts"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["enterprise workstation title", foundation.includes("ECG Insight Enterprise Workstation")],
    ["enterprise status bar", foundation.includes("EcgEnterpriseStatusBar")],
    ["ai-review mode", types.includes('"ai-review"') && foundation.includes('"ai-review"')],
    ["toolbar groups FILE/VIEW/ECG/MEASURE/AI/EXPORT", toolbar.includes('label: "EXPORT"') && toolbar.includes('label: "MEASURE"')],
    ["clinical sidebar patient card", panel.includes('title="Patient"') && panel.includes('title="Warnings"')],
    ["88% viewer layout", layout.includes("defaultSize={88}")],
    ["monitor glow + beat markers", canvas.includes("shadowBlur") && canvas.includes("beatMarkerPositions")],
    ["status metrics hook", foundation.includes("useEnterpriseStatusMetrics")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 21 integration check failed: ${label}`);
  }

  console.log("sprint21-ecg-workstation-ux-revolution.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
