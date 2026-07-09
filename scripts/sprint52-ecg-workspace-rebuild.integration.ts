import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VIEWER = path.join(ROOT, "artifacts/ecg-insight/components/ecg/viewer");

function read(file: string) {
  return fs.readFileSync(file, "utf8");
}

const foundation = read(path.join(VIEWER, "EcgMonitorViewerFoundation.tsx"));
const switcher = read(path.join(VIEWER, "EcgViewModeSwitcher.tsx"));
const toolbar = read(path.join(VIEWER, "EcgZeroChromeToolbar.tsx"));
const imageEngine = read(path.join(VIEWER, "ecgImageEngine.ts"));
const leadLayout = read(path.join(VIEWER, "rendering-engine/twelveLeadLayout.ts"));
const palette = read(path.join(VIEWER, "EcgUnifiedClinicalLeftPanel.tsx"));

const checks: Array<[string, boolean]> = [
  ["Workspace foundation removes EcgLiveMonitorView", !foundation.includes("EcgLiveMonitorView")],
  ["Workspace foundation removes playback timeline", !foundation.includes("EcgWaveformPlaybackTimeline")],
  ["View mode switcher excludes live monitor chip", !switcher.includes('"monitor"')],
  ["Grouped toolbar IMAGE section", toolbar.includes("sprint52-toolbar-group-image")],
  ["Grouped toolbar VIEW fit controls", toolbar.includes("sprint52-fit-width")],
  ["Hero fill target 78%", imageEngine.includes("ECG_HERO_FILL_TARGET = 0.78")],
  ["Zoom presets 150/200/300", imageEngine.includes('mode === "300"')],
  ["12-lead hospital grid order", leadLayout.includes("HOSPITAL_GRID_ORDER")],
  ["Layout presets 6x2 and 3x4", leadLayout.includes('"6x2"') && leadLayout.includes('"3x4"')],
  ["Scrollable floating palette", palette.includes("ScrollView")],
  ["Left sidebar grid region", read(path.join(VIEWER, "EcgWorkstationGridShell.tsx")).includes("sprint53-left-sidebar-region")],
  ["200px minimum sidebar width", read(path.join(VIEWER, "ecgWorkstationVisualTokens.ts")).includes("leftPanelMinWidth: 200")],
  ["Floating palette removed from foundation", !foundation.includes("EcgFloatingToolPalette")],
  ["Docked left tool sections", fs.existsSync(path.join(VIEWER, "EcgWorkspaceLeftToolSections.tsx"))],
  ["Live monitor opens via route helper", foundation.includes("openLiveMonitor")],
  ["Sprint 52 workspace testID", foundation.includes("sprint52-ecg-workspace-ready")],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

if (failed > 0) process.exit(1);
console.log("sprint52-ecg-workspace-rebuild.integration.ts: all checks passed");
