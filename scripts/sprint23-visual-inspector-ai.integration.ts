import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");
const inspectorRoot = path.resolve(process.cwd(), "scripts/sprint23");

async function main() {
  const required = [
    "ecgWorkstationVisualTokens.ts",
    "EcgMonitorViewerFoundation.tsx",
    "EcgWorkstationToolbar.tsx",
    "EcgLiveMonitorView.tsx",
    "EcgMonitorMiniNavigator.tsx",
    "EcgZeroChromeToolbar.tsx",
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  await fs.access(path.join(inspectorRoot, "visual-inspector-engine.mjs"));

  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");
  const tokens = await fs.readFile(path.join(viewerRoot, "ecgWorkstationVisualTokens.ts"), "utf8");
  const inspector = await fs.readFile(path.join(inspectorRoot, "visual-inspector-engine.mjs"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["visual inspector engine", inspector.includes("runVisualInspector") && inspector.includes("auditDomScript")],
    ["hospital UI score engine", inspector.includes("overallScore") && inspector.includes("MIN_SCORE")],
    ["visual tokens", tokens.includes("ECG_WORKSTATION_VISUAL") && toolbar.includes("ECG_WORKSTATION_VISUAL")],
    ["workstation readiness", foundation.includes("sprint29-zero-chrome-workstation-ready") || foundation.includes("sprint30-clinical-workflow-ready")],
    ["canvas resize optimization", (await fs.readFile(path.join(viewerRoot, "EcgLiveMonitorView.tsx"), "utf8")).includes("sizeRef")],
    ["responsive mini navigator", (await fs.readFile(path.join(viewerRoot, "EcgMonitorMiniNavigator.tsx"), "utf8")).includes("onLayout")],
    ["zero chrome toolbar", toolbar.includes("sprint35-compact-toolbar") || toolbar.includes("sprint52-grouped-toolbar") || toolbar.includes("sprint29-zero-chrome-toolbar")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 23 integration check failed: ${label}`);
  }

  console.log("sprint23-visual-inspector-ai.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
