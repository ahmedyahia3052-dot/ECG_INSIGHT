import fs from "node:fs/promises";
import path from "node:path";

import { runIntegrationMain } from "./finish-integration";

const viewerRoot = path.resolve(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");

const required = [
  "EcgProViewerEngine.tsx",
  "EcgMiniNavigator.tsx",
  "EcgViewerToolbar.tsx",
  "EcgViewerTimeline.tsx",
  "useViewerRuntimeMetrics.ts",
  "ecgViewerExport.ts",
  "useEcgViewerControls.ts",
  "ecgImageEngine.ts",
];

async function main() {
  for (const file of required) {
    await fs.access(path.join(viewerRoot, file));
  }

  const engine = await fs.readFile(path.join(viewerRoot, "EcgProViewerEngine.tsx"), "utf8");
  const toolbar = await fs.readFile(path.join(viewerRoot, "EcgViewerToolbar.tsx"), "utf8");
  const timeline = await fs.readFile(path.join(viewerRoot, "EcgViewerTimeline.tsx"), "utf8");
  const foundation = await fs.readFile(path.join(viewerRoot, "EcgMonitorViewerFoundation.tsx"), "utf8");
  const controls = await fs.readFile(path.join(viewerRoot, "useEcgViewerControls.ts"), "utf8");
  const imageEngine = await fs.readFile(path.join(viewerRoot, "ecgImageEngine.ts"), "utf8");
  const leftRail = await fs.readFile(path.join(viewerRoot, "EcgViewerLeftRail.tsx"), "utf8");

  const checks: Array<[string, boolean]> = [
    ["cursor-anchored wheel zoom", engine.includes("zoomAtAnchor")],
    ["momentum pan", engine.includes("startMomentum")],
    ["mini navigator", engine.includes("EcgMiniNavigator")],
    ["crisp image rendering", engine.includes("crisp-edges")],
    ["runtime metrics hook", engine.includes("useViewerRuntimeMetrics")],
    ["zoom presets 100-1600", imageEngine.includes("[1, 2, 4, 8, 16]")],
    ["toolbar export png", toolbar.includes("Export PNG")],
    ["toolbar digitize", toolbar.includes("Digitize")],
    ["toolbar speed gain", toolbar.includes("cycleSpeed") && toolbar.includes("cycleGain")],
    ["toolbar brightness contrast", toolbar.includes("adjustBrightness") && toolbar.includes("adjustContrast")],
    ["toolbar zoom preset buttons", toolbar.includes("setZoomPreset")],
    ["clinical status bar paper speed", timeline.includes("sprint17-status-paper-speed")],
    ["clinical status bar fps", timeline.includes("sprint17-status-fps")],
    ["clinical status bar dpi", timeline.includes("sprint17-status-dpi")],
    ["clinical status bar coords", timeline.includes("sprint17-status-coords")],
    ["foundation runtime wiring", foundation.includes("estimateImageDpi") && foundation.includes("setRenderFps")],
    ["lead focus mode", leftRail.includes("Lead Focus") && foundation.includes("leadFocusMode")],
    ["controls zoom at anchor", controls.includes("zoomAtAnchor")],
    ["controls grid opacity", controls.includes("setGridOpacity")],
  ];

  for (const [label, passed] of checks) {
    if (!passed) throw new Error(`Sprint 17 integration check failed: ${label}`);
  }

  console.log("sprint17-ecg-pro-viewer-enterprise.integration.ts: all integration checks passed");
}

runIntegrationMain(main);
