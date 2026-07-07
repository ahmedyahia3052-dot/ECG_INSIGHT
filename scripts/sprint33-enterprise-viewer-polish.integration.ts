import fs from "node:fs";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

function read(file: string) {
  return fs.readFileSync(path.join(viewerRoot, file), "utf8");
}

async function main() {
  const required = [
    "EcgUnifiedClinicalLeftPanel.tsx",
    "EcgZeroChromeToolbar.tsx",
    "EcgFloatingToolPalette.tsx",
    "EcgProViewerEngine.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgViewerCrosshairOverlay.tsx",
    "ecgImageEngine.ts",
    "ecgWorkstationVisualTokens.ts",
    "EcgViewerResizableWorkspace.tsx",
  ];

  for (const file of required) {
    fs.accessSync(path.join(viewerRoot, file));
  }

  const leftPanel = read("EcgUnifiedClinicalLeftPanel.tsx");
  const toolbar = read("EcgZeroChromeToolbar.tsx");
  const floating = read("EcgFloatingToolPalette.tsx");
  const viewer = read("EcgProViewerEngine.tsx");
  const rightPanel = read("EcgClinicalRightPanel.tsx");
  const imageEngine = read("ecgImageEngine.ts");
  const tokens = read("ecgWorkstationVisualTokens.ts");
  const layout = read("EcgViewerResizableWorkspace.tsx");
  const foundation = read("EcgMonitorViewerFoundation.tsx");

  const checks: Array<[string, boolean]> = [
    ["hero fit zoom", imageEngine.includes("heroFitZoom") && imageEngine.includes("ECG_HERO_FILL_TARGET")],
    ["smart initial fit", viewer.includes('applyFit("hero")')],
    ["double click reset view", viewer.includes("resetView")],
    ["compact toolbar 40% shorter", tokens.includes("toolbarMaxHeight: 20") && toolbar.includes("sprint33-compact-toolbar")],
    ["vertical floating palette", floating.includes("flexDirection: \"column\"") && floating.includes("sprint33-floating-tool-palette")],
    ["toolbar tooltips", toolbar.includes("EcgWorkstationTooltip")],
    ["floating tooltips", floating.includes("EcgWorkstationTooltip")],
    ["left panel default collapse", leftPanel.includes('title="Workflow"') && leftPanel.includes("defaultOpen={false}") && leftPanel.includes('title="Patient Summary"')],
    ["hide empty quick actions", leftPanel.includes("hasQuickActions")],
    ["compact right panel", rightPanel.includes("sprint33-clinical-right-panel")],
    ["true diagnostic exit only", foundation.includes("diagnosticExitFloating") && !foundation.includes("diagnosticHeader")],
    ["layout v7", layout.includes("panel-layout-v7")],
    ["narrow panels hero canvas", tokens.includes("leftExpandedWidth: 160") && tokens.includes("rightExpandedWidth: 240")],
    ["gpu canvas hint", viewer.includes("translateZ(0)")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 33 integration check failed: ${label}`);
  }

  console.log("sprint33-enterprise-viewer-polish.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
