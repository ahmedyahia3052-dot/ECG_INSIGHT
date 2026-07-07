import fs from "node:fs";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

function read(file: string) {
  return fs.readFileSync(path.join(viewerRoot, file), "utf8");
}

async function main() {
  const required = [
    "EcgWorkstationTooltip.tsx",
    "EcgZeroChromeToolbar.tsx",
    "EcgFloatingToolPalette.tsx",
    "EcgUnifiedClinicalLeftPanel.tsx",
    "EcgClinicalRightPanel.tsx",
    "EcgClinicalWorkflowRibbon.tsx",
    "EcgEnterpriseStatusBar.tsx",
    "ecgWorkstationVisualTokens.ts",
    "ecgImageEngine.ts",
    "EcgViewerResizableWorkspace.tsx",
    "useEcgDiagnosticMode.ts",
  ];

  for (const file of required) {
    fs.accessSync(path.join(viewerRoot, file));
  }

  const tooltip = read("EcgWorkstationTooltip.tsx");
  const toolbar = read("EcgZeroChromeToolbar.tsx");
  const floating = read("EcgFloatingToolPalette.tsx");
  const left = read("EcgUnifiedClinicalLeftPanel.tsx");
  const right = read("EcgClinicalRightPanel.tsx");
  const workflow = read("EcgClinicalWorkflowRibbon.tsx");
  const status = read("EcgEnterpriseStatusBar.tsx");
  const image = read("ecgImageEngine.ts");
  const tokens = read("ecgWorkstationVisualTokens.ts");
  const layout = read("EcgViewerResizableWorkspace.tsx");
  const foundation = read("EcgMonitorViewerFoundation.tsx");
  const diagnostic = read("useEcgDiagnosticMode.ts");

  const checks: Array<[string, boolean]> = [
    ["portal tooltips", tooltip.includes("createPortal") && tooltip.includes("description")],
    ["hero fill 78%", image.includes("ECG_HERO_FILL_TARGET = 0.78")],
    ["compact toolbar 16px", tokens.includes("toolbarMaxHeight: 16") && tokens.includes("toolbarButtonSize: 20")],
    ["narrow panels 114/171", tokens.includes("leftExpandedWidth: 114") && tokens.includes("rightExpandedWidth: 171")],
    ["viewport target tokens", tokens.includes("viewportTargetMin: 0.75") && tokens.includes("viewportTargetMax: 0.8")],
    ["four tab right panel", right.includes("sprint35-clinical-tabs") && right.includes('"AI Findings"') && !right.includes('{ id: "patient"')],
    ["ai findings pane", right.includes("sprint35-ai-findings-tab-pane")],
    ["clinical summary groups", left.includes('title="Patient"') && left.includes('title="Study"') && left.includes('title="Device"') && left.includes('title="Workflow"')],
    ["floating toolbox sprint35", floating.includes("sprint35-floating-tool-palette") && floating.includes('label: "Pointer"') && floating.includes('label: "Full Screen"')],
    ["status bar clinical chips", status.includes("sprint35-enterprise-status-bar") && status.includes('label="Grid"') && status.includes('label="FPS"')],
    ["layout restore", diagnostic.includes("popLayoutSnapshot") && foundation.includes("handleExitDiagnostic")],
    ["layout v9", layout.includes("panel-layout-v9")],
    ["diagnostic status bar", foundation.includes("compact={diagnosticMode}") && read("EcgEnterpriseLayoutEngine.tsx").includes("bottom={bottom}")],
    ["workflow step labels", workflow.includes("maxWidth: 120")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 35 integration check failed: ${label}`);
  }

  console.log("sprint35-doctor-experience-polish.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
