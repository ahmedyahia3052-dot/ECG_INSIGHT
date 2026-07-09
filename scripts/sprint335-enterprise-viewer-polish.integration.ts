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
    ["hero fill target", image.includes("ECG_HERO_FILL_TARGET")],
    ["toolbar compact tokens", tokens.includes("toolbarMaxHeight") && tokens.includes("toolbarButtonSize")],
    ["clinical summary panel", left.includes("sprint35-clinical-summary-panel") && left.includes('title="Patient"')],
    ["tab spacing right panel", (right.includes("marginHorizontal") && (right.includes("sprint35-clinical-tabs") || right.includes("sprint335-clinical-tabs"))) || (right.includes("EcgClinicalCollapsibleSection") && right.includes('id="ai-findings"'))],
    ["compact workflow ribbon", workflow.includes("scrollIntoView") && workflow.includes("stepComplete")],
    ["collapsible lead alerts", alerts.includes("sprint335-compact-clinical-alerts") && alerts.includes("expanded")],
    ["status bar simplified", (status.includes("sprint35-enterprise-status-bar") || status.includes("sprint335-enterprise-status-bar")) && !status.includes("patientName")],
    ["floating palette idle hide", floating.includes("panelAutoHideDelayMs") && floating.includes("mousemove")],
    ["layout persistence", layout.includes("panel-layout-v")],
    ["view mode switcher wired", foundation.includes("EcgViewModeSwitcher")],
    ["panel width tokens", tokens.includes("leftExpandedWidth") && tokens.includes("rightExpandedWidth")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 33.5 integration check failed: ${label}`);
  }

  console.log("sprint335-enterprise-viewer-polish.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
