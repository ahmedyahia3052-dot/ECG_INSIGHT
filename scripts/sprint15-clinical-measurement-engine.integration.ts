import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const serverContracts = path.join(repoRoot, "server", "src", "cases", "ecg-viewer-workspace.contracts.ts");
const casesRoutes = path.join(repoRoot, "server", "src", "cases", "cases.routes.ts");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredFiles = [
  "ecgCaliperGeometry.ts",
  "ecgMeasurementReference.ts",
  "ecgMeasurementExport.ts",
];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 15 module: ${file}`);
}

const geometry = fs.readFileSync(path.join(viewerDir, "ecgCaliperGeometry.ts"), "utf8");
const engine = fs.readFileSync(path.join(viewerDir, "ecgMeasurementEngine.ts"), "utf8");
const panel = fs.readFileSync(path.join(viewerDir, "EcgMeasurementsPanel.tsx"), "utf8");
const toolbar = fs.readFileSync(path.join(viewerDir, "EcgViewerToolbar.tsx"), "utf8");
const controls = fs.readFileSync(path.join(viewerDir, "useEcgViewerControls.ts"), "utf8");
const types = fs.readFileSync(path.join(viewerDir, "measurementTypes.ts"), "utf8");
const overlay = fs.readFileSync(path.join(viewerDir, "EcgMeasurementOverlay.tsx"), "utf8");
const contracts = fs.readFileSync(serverContracts, "utf8");
const routes = fs.readFileSync(casesRoutes, "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");

const markers = [
  "computeAngleDegrees",
  "polylineLength",
  "computeQtDispersion",
  "evaluateMeasurementReference",
  "measurementsToCsv",
  "ECG_ZOOM_PRESETS",
  "cycleZoomPreset",
  "toggleCustomCalibration",
  "Finish Multi",
  "qt_dispersion",
  "p_amplitude",
  "electrical_axis",
  "Export CSV",
  "version: 5",
  "export/csv",
  "sprint15-ecg-measurements-panel",
];

for (const marker of markers) {
  const source = [geometry, engine, panel, toolbar, controls, types, overlay, contracts, routes].some((file) => file.includes(marker));
  assert(source, `Sprint 15 missing capability marker: ${marker}`);
}

assert(pipeline.includes("sprint15-clinical-measurement-engine.integration.ts"), "Pipeline must register Sprint 15 integration test.");
assert(pipeline.includes("ecg-caliper-geometry.test.ts"), "Pipeline must register caliper geometry unit test.");

console.log("sprint15-clinical-measurement-engine.integration.ts: all Sprint 15 checks passed");
