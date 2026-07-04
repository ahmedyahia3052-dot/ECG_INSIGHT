import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredFiles = [
  "EcgProViewerEngine.tsx",
  "EcgClinicalFindingsPanel.tsx",
  "EcgRhythmStripPanel.tsx",
  "EcgDigitizedWaveformLayer.tsx",
  "EcgAiOverlayLayer.tsx",
  "ecgViewerEngine.ts",
  "useEcgClinicalFindings.ts",
];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 13 Phase 3 module: ${file}`);
}

const engine = fs.readFileSync(path.join(viewerDir, "EcgProViewerEngine.tsx"), "utf8");
const foundation = fs.readFileSync(path.join(viewerDir, "EcgMonitorViewerFoundation.tsx"), "utf8");
const toolbar = fs.readFileSync(path.join(viewerDir, "EcgViewerToolbar.tsx"), "utf8");
const controls = fs.readFileSync(path.join(viewerDir, "useEcgViewerControls.ts"), "utf8");
const findings = fs.readFileSync(path.join(viewerDir, "EcgClinicalFindingsPanel.tsx"), "utf8");
const rhythm = fs.readFileSync(path.join(viewerDir, "EcgRhythmStripPanel.tsx"), "utf8");
const grid = fs.readFileSync(path.join(viewerDir, "EcgPaperGrid.tsx"), "utf8");
const digitized = fs.readFileSync(path.join(viewerDir, "EcgDigitizedWaveformLayer.tsx"), "utf8");
const aiLayer = fs.readFileSync(path.join(viewerDir, "EcgAiOverlayLayer.tsx"), "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");
const findingsHook = fs.readFileSync(path.join(viewerDir, "useEcgClinicalFindings.ts"), "utf8");

const capabilityMarkers = [
  "EcgProViewerEngine",
  "VIEWER_LAYER",
  "sprint13-ecg-layer-image",
  "sprint13-ecg-layer-digitized",
  "sprint13-ecg-layer-ai",
  "sprint13-ecg-clinical-findings-panel",
  "sprint13-ecg-rhythm-strip-panel",
  "setViewportDimensions",
  "togglePanMode",
  "cycleGridOpacity",
  "isPanActive",
  "Awaiting AI Analysis",
  "Clinical Findings",
  "Rhythm Strip",
  "Export PDF",
  "label=\"Pan\"",
  "grid.opacity",
  "STANDARD_ECG_LEADS",
  "buildEcgClinicalFindings",
];

for (const marker of capabilityMarkers) {
  const source = [engine, foundation, toolbar, controls, findings, findingsHook, rhythm, grid, digitized, aiLayer].some((file) => file.includes(marker));
  assert(source, `Sprint 13 Phase 3 missing capability marker: ${marker}`);
}

assert(foundation.includes("EcgProViewerEngine") || foundation.includes("EcgImageCanvas"), "Foundation must render production viewer engine.");
assert(toolbar.includes('label="AI Overlay"') && toolbar.includes("disabled"), "AI Overlay must remain disabled until Sprint 14.");
assert(toolbar.includes('label="Compare"') && toolbar.includes("disabled"), "Compare must remain disabled.");
assert(pipeline.includes("sprint13-ecg-pro-viewer-engine.integration.ts"), "Integration pipeline must register Phase 3 test.");
assert(!engine.includes("TODO"), "Production engine must not contain TODO markers.");

console.log("sprint13-ecg-pro-viewer-engine.integration.ts: all Sprint 13 Phase 3 checks passed");
