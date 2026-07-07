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
    "EcgClinicalAlertsBanner.tsx",
    "EcgEnterpriseStatusBar.tsx",
    "ecgSpacingTokens.ts",
    "ecgImageEngine.ts",
    "EcgViewerResizableWorkspace.tsx",
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
  const alerts = read("EcgClinicalAlertsBanner.tsx");
  const status = read("EcgEnterpriseStatusBar.tsx");
  const image = read("ecgImageEngine.ts");
  const tokens = read("ecgWorkstationVisualTokens.ts");
  const layout = read("EcgViewerResizableWorkspace.tsx");
  const foundation = read("EcgMonitorViewerFoundation.tsx");

  const checks: Array<[string, boolean]> = [
    ["portal tooltips no clip", tooltip.includes("createPortal") && tooltip.includes("TOOLTIP_MAX_WIDTH") && tooltip.includes("wordBreak")],
    ["tooltip descriptions", tooltip.includes("description") && toolbar.includes("description:")],
    ["hero fill 90%", image.includes("ECG_HERO_FILL_TARGET = 0.9")],
    ["toolbar 18px height", tokens.includes("toolbarMaxHeight: 18") && tokens.includes("toolbarButtonSize: 22")],
    ["two column clinical summary", left.includes("infoLeader") && left.includes("sprint335-clinical-summary-panel")],
    ["tab spacing right panel", right.includes("marginHorizontal") && right.includes("sprint335-clinical-tabs")],
    ["compact workflow ribbon", workflow.includes("scrollIntoView") && workflow.includes("stepComplete")],
    ["collapsible lead alerts", alerts.includes("sprint335-compact-clinical-alerts") && alerts.includes("expanded")],
    ["status bar simplified", status.includes("sprint335-enterprise-status-bar") && !status.includes("patientName")],
    ["floating palette idle hide", floating.includes("panelAutoHideDelayMs") && floating.includes("mousemove")],
    ["layout v8", layout.includes("panel-layout-v8")],
    ["no view mode switcher chrome", !foundation.includes("EcgViewModeSwitcher")],
    ["narrow hero panels", tokens.includes("leftExpandedWidth: 152") && tokens.includes("rightExpandedWidth: 228")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 33.5 integration check failed: ${label}`);
  }

  console.log("sprint335-enterprise-viewer-polish.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
