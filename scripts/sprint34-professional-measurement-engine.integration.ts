import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredFiles = [
  "ecgWaveDetectionBridge.ts",
  "ecgMultiLeadSync.ts",
  "ecgMeasurementHistory.ts",
  "ecgLiveMeasurements.ts",
  "EcgMeasurementFloatingToolbar.tsx",
  "EcgMeasurementHistoryPanel.tsx",
];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 34 module: ${file}`);
}

const workspace = fs.readFileSync(path.join(viewerDir, "useEcgMeasurementWorkspace.ts"), "utf8");
const overlay = fs.readFileSync(path.join(viewerDir, "EcgMeasurementOverlay.tsx"), "utf8");
const studio = fs.readFileSync(path.join(viewerDir, "EcgMeasurementStudioPanel.tsx"), "utf8");
const types = fs.readFileSync(path.join(viewerDir, "measurementTypes.ts"), "utf8");
const aiOverlay = fs.readFileSync(path.join(viewerDir, "ecgAiOverlayEngine.ts"), "utf8");
const proViewer = fs.readFileSync(path.join(viewerDir, "EcgProViewerEngine.tsx"), "utf8");
const toolbar = fs.readFileSync(path.join(viewerDir, "EcgMeasurementFloatingToolbar.tsx"), "utf8");
const historyPanel = fs.readFileSync(path.join(viewerDir, "EcgMeasurementHistoryPanel.tsx"), "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");

const markers = [
  "measurementHistory",
  "snapSettings",
  "multiLeadSync",
  "seedCalipersFromDigital",
  "detectWaveFiducials",
  "snapToNearestFiducial",
  "replicateHorizontalCaliper",
  "syncTimestampMarkers",
  "sprint34-measurement-floating-toolbar",
  "sprint34-live-measurements-panel",
  "sprint34-measurement-history-panel",
  "computeLiveMeasurements",
  "appendAnnotationPoint",
  "commitDraftAnnotation",
  "nudgeSelectedCaliper",
  "atrial_fibrillation",
  "pvc",
  "pac",
  "lbbb",
  "rbbb",
  "EcgMeasurementFloatingToolbar",
];

for (const marker of markers) {
  const source = [workspace, overlay, studio, types, aiOverlay, proViewer, toolbar, historyPanel].some((file) => file.includes(marker));
  assert(source, `Sprint 34 missing capability marker: ${marker}`);
}

assert(pipeline.includes("sprint34-professional-measurement-engine.integration.ts"), "Pipeline must register Sprint 34 measurement integration.");
assert(pipeline.includes("ecg-wave-detection-bridge.test.ts"), "Pipeline must register wave detection unit test.");

console.log("sprint34-professional-measurement-engine.integration.ts: all Sprint 34 checks passed");
