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
  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const diagnostic = await fs.readFile(path.join(viewerRoot, "useEcgDiagnosticMode.ts"), "utf8");
  const tokens = await fs.readFile(path.join(viewerRoot, "ecgWorkstationVisualTokens.ts"), "utf8");
  const design = await fs.readFile(path.join(viewerRoot, "ecgEnterpriseDesignTokens.ts"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["zero-chrome contextual toolbar", toolbar.includes("sprint29-zero-chrome-toolbar") && toolbar.includes("contextualGroups")],
    ["smart collapsible tool groups", toolbar.includes("FILE") && toolbar.includes("DIGITIZE") && toolbar.includes("GroupChip")],
    ["toolbar max height 52px", tokens.includes("toolbarMaxHeight: 48")],
    ["floating tool palette", palette.includes("sprint29-floating-tool-palette")],
    ["enterprise layout engine", layout.includes("sprint29-enterprise-layout-engine") && layout.includes("panelAutoHideDelayMs")],
    ["resizable panels double-click reset", grid.includes("onDoubleClick") && grid.includes("sprint29-resize-left")],
    ["auto-hide panel delay", tokens.includes("panelAutoHideDelayMs")],
    ["diagnostic mode F11 ESC", diagnostic.includes("F11") && diagnostic.includes("Escape")],
    ["diagnostic chrome in foundation", foundation.includes("sprint29-diagnostic-header") && foundation.includes("EcgFloatingToolPalette")],
    ["enterprise design tokens", design.includes("ECG_ENTERPRISE_DESIGN") && design.includes("animation")],
    ["sprint29 readiness", foundation.includes("sprint29-zero-chrome-workstation-ready")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 29 zero-chrome integration check failed: ${label}`);
  }

  console.log("sprint29-zero-chrome-clinical-workspace.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
