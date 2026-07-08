import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

async function main() {
  const required = [
    "EcgZeroChromeToolbar.tsx",
    "EcgFloatingToolPalette.tsx",
    "EcgEnterpriseLayoutEngine.tsx",
    "ecgEnterpriseDesignTokens.ts",
    "useEcgDiagnosticMode.ts",
    "EcgMonitorViewerFoundation.tsx",
    "EcgWorkstationGridShell.tsx",
    "ecgWorkstationVisualTokens.ts",
  ];

  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");
  const palette = await fs.readFile(path.join(viewerRoot, "EcgFloatingToolPalette.tsx"), "utf8");
  const layout = await fs.readFile(path.join(viewerRoot, "EcgEnterpriseLayoutEngine.tsx"), "utf8");
  const grid = await fs.readFile(path.join(viewerRoot, "EcgWorkstationGridShell.tsx"), "utf8");
  const foundation = await fs.readFile(path.join(viewerRoot, "EcgZeroChromeToolbar.tsx"), "utf8");
  const foundationMain = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const diagnostic = await fs.readFile(path.join(viewerRoot, "useEcgDiagnosticMode.ts"), "utf8");
  const tokens = await fs.readFile(path.join(viewerRoot, "ecgWorkstationVisualTokens.ts"), "utf8");
  const design = await fs.readFile(path.join(viewerRoot, "ecgEnterpriseDesignTokens.ts"), "utf8");

  const shortcuts = await fs.readFile(path.join(viewerRoot, "useEcgWorkstationShortcuts.ts"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["compact clinical toolbar", toolbar.includes("sprint35-compact-toolbar") || toolbar.includes("sprint52-grouped-toolbar")],
    ["primary toolbar actions", (toolbar.includes("Export PDF") || toolbar.includes("Export")) && (toolbar.includes("Digitized") || toolbar.includes("Digitize"))],
    ["floating tool palette", palette.includes("sprint35-floating-tool-palette")],
    ["enterprise layout engine", layout.includes("sprint29-enterprise-layout-engine")],
    ["resizable panels", grid.includes("sprint29-resize-left") || grid.includes("EcgViewerResizableWorkspace")],
    ["auto-hide panel delay", tokens.includes("panelAutoHideDelayMs") || foundationMain.includes("leftCollapsed")],
    ["diagnostic mode F11 ESC", diagnostic.includes("F11") && (diagnostic.includes("Escape") || shortcuts.includes("Escape"))],
    ["diagnostic chrome in foundation", foundationMain.includes("sprint35-exit-diagnostic") && palette.includes("sprint35-floating-tool-palette")],
    ["enterprise design tokens", design.includes("ECG_ENTERPRISE_DESIGN")],
    ["sprint readiness", foundationMain.includes("sprint29-zero-chrome-workstation-ready") || foundationMain.includes("sprint30-clinical-workflow-ready")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 29 zero-chrome integration check failed: ${label}`);
  }

  console.log("sprint29-zero-chrome-clinical-workspace.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
