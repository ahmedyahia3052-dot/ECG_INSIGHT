import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredFiles = [
  "ecgMeasurementEngine.ts",
  "EcgMeasurementOverlay.tsx",
  "EcgMeasurementsPanel.tsx",
  "measurementTypes.ts",
  "useEcgMeasurementWorkspace.ts",
];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 14 measurement module: ${file}`);
}

const engine = fs.readFileSync(path.join(viewerDir, "ecgMeasurementEngine.ts"), "utf8");
const overlay = fs.readFileSync(path.join(viewerDir, "EcgMeasurementOverlay.tsx"), "utf8");
const panel = fs.readFileSync(path.join(viewerDir, "EcgMeasurementsPanel.tsx"), "utf8");
const workspace = fs.readFileSync(path.join(viewerDir, "useEcgMeasurementWorkspace.ts"), "utf8");
const types = fs.readFileSync(path.join(viewerDir, "measurementTypes.ts"), "utf8");
const routes = fs.readFileSync(path.join(repoRoot, "server", "src", "cases", "cases.routes.ts"), "utf8");
const toolbar = fs.readFileSync(path.join(viewerDir, "EcgViewerToolbar.tsx"), "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");

const capabilityMarkers = [
  "CLINICAL_MEASUREMENT_PRESETS",
  "createMeasurementInput",
  "exportMeasurements",
  "syncWorkspaceMeasurements",
  "dragCaliper",
  "commitDraftCaliper",
  "selectMeasurementPreset",
  "setCaliperColor",
  "updateMeasurementComments",
  "sprint15-ecg-measurements-panel",
  "sprint14-ecg-measurement-overlay",
  "pr_interval",
  "qrs_duration",
  "qt_interval",
  "qtc",
  "rr_interval",
  "pp_interval",
  "st_elevation",
  "st_depression",
  "Rhythm Strip",
  "STANDARD_ECG_LEADS",
  "Export JSON",
  "confidence",
  "version: 5",
];

for (const marker of capabilityMarkers) {
  const source = [engine, overlay, panel, workspace, types, toolbar].some((file) => file.includes(marker));
  assert(source, `Sprint 14 clinical calipers missing capability marker: ${marker}`);
}

assert(routes.includes("ecg-viewer-workspace/export/json"), "Server must expose JSON measurement export route.");
assert(pipeline.includes("sprint14-clinical-calipers.integration.ts"), "Integration pipeline must register Sprint 14 calipers test.");
assert(pipeline.includes("ecg-measurement-engine.test.ts"), "Integration pipeline must register measurement engine unit test.");
assert(overlay.includes("PanResponder"), "Measurement overlay must support drag interaction.");
assert(!engine.includes("TODO"), "Measurement engine must not contain TODO markers.");

console.log("sprint14-clinical-calipers.integration.ts: all Sprint 14 Phase 1 checks passed");
