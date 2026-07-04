import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const casesRoutes = path.join(repoRoot, "server", "src", "cases", "cases.routes.ts");
const workspaceService = path.join(repoRoot, "server", "src", "cases", "ecg-viewer-workspace.service.ts");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredFiles = [
  "EcgMeasurementOverlay.tsx",
  "EcgMeasurementsPanel.tsx",
  "ecgCalibrationMath.ts",
  "measurementTypes.ts",
  "useEcgMeasurementWorkspace.ts",
  "useEcgViewerPersistence.ts",
  "useHistoryStack.ts",
];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 13 Phase 2 module: ${file}`);
}

const foundation = fs.readFileSync(path.join(viewerDir, "EcgMonitorViewerFoundation.tsx"), "utf8");
const toolbar = fs.readFileSync(path.join(viewerDir, "EcgViewerToolbar.tsx"), "utf8");
const panel = fs.readFileSync(path.join(viewerDir, "EcgMeasurementsPanel.tsx"), "utf8");
const workspaceHook = fs.readFileSync(path.join(viewerDir, "useEcgMeasurementWorkspace.ts"), "utf8");
const overlay = fs.readFileSync(path.join(viewerDir, "EcgMeasurementOverlay.tsx"), "utf8");
const routes = fs.readFileSync(casesRoutes, "utf8");
const service = fs.readFileSync(workspaceService, "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");

const capabilityMarkers = [
  "Horizontal",
  "Vertical",
  "Dual",
  "PR Interval",
  "QRS Duration",
  "QT Interval",
  "QTc",
  "RR Interval",
  "PP Interval",
  "ST Elevation",
  "P Wave Duration",
  "T Wave Duration",
  "snapToGrid",
  "useHistoryStack",
  "event.key === \"Delete\"",
  "event.ctrlKey && event.key.toLowerCase() === \"z\"",
  "event.ctrlKey && event.key.toLowerCase() === \"y\"",
  "event.key === \"c\"",
  "event.key === \"m\"",
  "event.key === \"a\"",
  "sprint13-ecg-measurements-panel",
  "sprint13-ecg-measurement-overlay",
  "useEcgViewerPersistence",
  "buildMeasurementWorkspacePdf",
  "/ecg-viewer-workspace",
];

for (const marker of capabilityMarkers) {
  const source = [foundation, toolbar, panel, workspaceHook, overlay, routes, service].some((file) => file.includes(marker));
  assert(source, `Sprint 13 Phase 2 missing capability marker: ${marker}`);
}

assert(toolbar.includes('label="Measure"') && !toolbar.includes('disabled label="Measure"'), "Measure tool must be enabled in Phase 2.");
assert(toolbar.includes('label="Compare"') && toolbar.includes("disabled"), "Compare must remain disabled.");
assert(toolbar.includes('label="AI Overlay"') && toolbar.includes("disabled"), "AI Overlay must remain disabled.");
assert(foundation.includes("useEcgMeasurementWorkspace"), "Foundation must wire measurement workspace.");
assert(routes.includes("ecg-viewer-workspace/export"), "Server must expose measurement PDF export.");
assert(pipeline.includes("sprint13-ecg-measurement-workspace.integration.ts"), "Integration pipeline must register Phase 2 test.");

console.log("sprint13-ecg-measurement-workspace.integration.ts: all Sprint 13 Phase 2 checks passed");
