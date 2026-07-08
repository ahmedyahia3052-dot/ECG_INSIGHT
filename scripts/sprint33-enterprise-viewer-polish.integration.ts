import fs from "node:fs";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

function read(file: string) {
  return fs.readFileSync(path.join(viewerRoot, file), "utf8");
}

async function main() {
  const leftPanel = read("EcgUnifiedClinicalLeftPanel.tsx");
  const toolbar = read("EcgZeroChromeToolbar.tsx");
  const floating = read("EcgFloatingToolPalette.tsx");
  const viewer = read("EcgProViewerEngine.tsx");
  const rightPanel = read("EcgClinicalRightPanel.tsx");
  const imageEngine = read("ecgImageEngine.ts");
  const layout = read("EcgViewerResizableWorkspace.tsx");
  const foundation = read("EcgMonitorViewerFoundation.tsx");

  const checks: Array<[string, boolean]> = [
    ["hero fit zoom", imageEngine.includes("heroFitZoom")],
    ["smart initial fit", viewer.includes('applyFit("hero")')],
    ["compact toolbar", toolbar.includes("sprint35-compact-toolbar") || toolbar.includes("sprint52-grouped-toolbar")],
    ["vertical floating palette", floating.includes("sprint35-floating-tool-palette")],
    ["unified left panel", leftPanel.includes("sprint35-clinical-summary-panel")],
    ["compact right panel", rightPanel.includes("sprint35-clinical-right-panel")],
    ["diagnostic exit control", foundation.includes("sprint35-exit-diagnostic")],
    ["layout v7", layout.includes("panel-layout-v")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 33 integration check failed: ${label}`);
  }

  console.log("sprint33-enterprise-viewer-polish.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
