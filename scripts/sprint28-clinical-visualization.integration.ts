import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const clinicalDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer", "clinical-visualization");
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredModules = [
  "types.ts",
  "gridPresets.ts",
  "waveformStyle.ts",
  "crosshairTelemetry.ts",
  "signalQuality.ts",
  "leadFocus.ts",
  "aiVisualization.ts",
  "zoomPanEngine.ts",
  "clinicalTimeline.ts",
  "index.ts",
];

for (const file of requiredModules) {
  assert(fs.existsSync(path.join(clinicalDir, file)), `Missing Sprint 28 clinical module: ${file}`);
}

const requiredComponents = [
  "EcgClinicalVisualizationCanvas.tsx",
  "EcgClinicalCrosshairPanel.tsx",
  "EcgClinicalMiniNavigator.tsx",
  "EcgClinicalTimelineBar.tsx",
];

for (const file of requiredComponents) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 28 component: ${file}`);
}

const pipeline = fs.readFileSync(pipelinePath, "utf8");
const canvas = fs.readFileSync(path.join(viewerDir, "EcgClinicalVisualizationCanvas.tsx"), "utf8");
const crosshair = fs.readFileSync(path.join(viewerDir, "EcgClinicalCrosshairPanel.tsx"), "utf8");
const miniNav = fs.readFileSync(path.join(viewerDir, "EcgClinicalMiniNavigator.tsx"), "utf8");
const timeline = fs.readFileSync(path.join(viewerDir, "EcgClinicalTimelineBar.tsx"), "utf8");
const gridPresets = fs.readFileSync(path.join(clinicalDir, "gridPresets.ts"), "utf8");
const imageCanvas = fs.readFileSync(path.join(viewerDir, "EcgImageCanvas.tsx"), "utf8");
const statusBar = fs.readFileSync(path.join(viewerDir, "EcgEnterpriseStatusBar.tsx"), "utf8");
const foundation = fs.readFileSync(path.join(viewerDir, "EcgMonitorViewerFoundation.tsx"), "utf8");

const capabilityMarkers = [
  "sprint28-clinical-visualization-canvas",
  "sprint28-clinical-render-svg",
  "sprint28-clinical-crosshair-panel",
  "sprint28-clinical-mini-navigator",
  "sprint28-clinical-timeline",
  "sprint28-signal-quality",
  "sprint28-enterprise-status-bar",
  "sprint28-status-gpu",
  "sprint28-status-signal-quality",
  "EcgClinicalVisualizationCanvas",
  "GRID_PRESET_COLORS",
  "buildAiVisualRegions",
  "computeCrosshairTelemetry",
  "applyLeadFocusRegions",
  "buildTimelineMarkers",
  "applyWheelZoom",
  "leadFocusEnabled",
  "showAiHeatmap",
];

for (const marker of capabilityMarkers) {
  const source = [canvas, crosshair, miniNav, timeline, gridPresets, imageCanvas, statusBar, foundation, pipeline].some((file) => file.includes(marker));
  assert(source, `Sprint 28 clinical visualization missing capability: ${marker}`);
}

assert(pipeline.includes("ecg-clinical-visualization.test.ts"), "Pipeline must register Sprint 28 unit test");
assert(pipeline.includes("sprint28-clinical-visualization.integration.ts"), "Pipeline must register Sprint 28 integration test");
assert(imageCanvas.includes("EcgClinicalVisualizationCanvas"), "Waveform view must use clinical visualization canvas");
assert(!canvas.includes("TODO"), "Clinical canvas must not contain TODO markers");

console.log("sprint28-clinical-visualization.integration.ts: all Sprint 28 checks passed");
