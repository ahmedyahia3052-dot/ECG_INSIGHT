import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const routePath = path.join(repoRoot, "artifacts", "ecg-insight", "app", "(protected)", "ecg-monitor", "[caseId].tsx");
const enterpriseUiPath = path.join(repoRoot, "artifacts", "ecg-insight", "components", "enterprise", "EnterpriseUI.tsx");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredFiles = [
  "EcgImageCanvas.tsx",
  "EcgMonitorViewerFoundation.tsx",
  "EcgPaperGrid.tsx",
  "EcgViewerLeftRail.tsx",
  "EcgViewerResizableWorkspace.tsx",
  "EcgViewerRightRail.tsx",
  "EcgViewerTimeline.tsx",
  "EcgViewerToolbar.tsx",
  "ecgImageEngine.ts",
  "useEcgViewerControls.ts",
  "index.ts",
];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 13 viewer module: ${file}`);
}

const foundation = fs.readFileSync(path.join(viewerDir, "EcgMonitorViewerFoundation.tsx"), "utf8");
const toolbar = fs.readFileSync(path.join(viewerDir, "EcgViewerToolbar.tsx"), "utf8");
const controls = fs.readFileSync(path.join(viewerDir, "useEcgViewerControls.ts"), "utf8");
const workspace = fs.readFileSync(path.join(viewerDir, "EcgViewerResizableWorkspace.tsx"), "utf8");
const canvas = fs.readFileSync(path.join(viewerDir, "EcgImageCanvas.tsx"), "utf8");
const leftRail = fs.readFileSync(path.join(viewerDir, "EcgViewerLeftRail.tsx"), "utf8");
const rightRail = fs.readFileSync(path.join(viewerDir, "EcgViewerRightRail.tsx"), "utf8");
const route = fs.readFileSync(routePath, "utf8");
const enterpriseUi = fs.readFileSync(enterpriseUiPath, "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");

const capabilityMarkers = [
  "Fit Width",
  "Fit Height",
  "100%",
  "Reset View",
  "Flip H",
  "Flip V",
  "Grayscale",
  "Invert",
  "Sharpen",
  "Grid On",
  "mm/sec",
  "mm/mV",
  "AI Findings",
  "Measurements",
  "Previous ECGs",
  "sprint13-ecg-monitor-ready",
  "sprint13-ecg-viewer-toolbar",
  "react-resizable-panels",
  "EcgPaperGrid",
  "handleDoubleClickZoom",
  "event.key === \"F11\"",
  "event.ctrlKey && event.key === \"0\"",
  "event.code === \"Space\"",
];

for (const marker of capabilityMarkers) {
  const source = [foundation, toolbar, controls, workspace, canvas, leftRail, rightRail].some((file) => file.includes(marker));
  assert(source, `Sprint 13 viewer foundation missing capability marker: ${marker}`);
}

assert(route.includes("EcgMonitorViewerFoundation"), "ecg-monitor route must render EcgMonitorViewerFoundation.");
assert(enterpriseUi.includes("/ecg-monitor"), "Enterprise shell must register ecg-monitor workspace route.");
assert(pipeline.includes("sprint13-ecg-viewer-foundation.integration.ts"), "Integration pipeline must register Sprint 13 viewer foundation test.");
assert(toolbar.includes('label="Measure"') && toolbar.includes("disabled"), "Measure tool must remain disabled in Phase 1.");
assert(toolbar.includes('label="Compare"') && toolbar.includes("disabled"), "Compare tool must remain disabled in Phase 1.");
assert(toolbar.includes('label="AI Overlay"') && toolbar.includes("disabled"), "AI Overlay must remain disabled in Phase 1.");
assert(!foundation.includes("AnnotationLayer"), "Phase 1 foundation must not include AI annotation overlays.");
assert(!foundation.includes("WaveformGrid"), "Phase 1 foundation must not include waveform digitization UI.");

console.log("sprint13-ecg-viewer-foundation.integration.ts: all Sprint 13 Phase 1 checks passed");
