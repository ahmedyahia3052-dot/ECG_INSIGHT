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
const settingsPanel = fs.readFileSync(path.join(viewerDir, "EcgViewerSettingsPanel.tsx"), "utf8");
const controls = fs.readFileSync(path.join(viewerDir, "useEcgViewerControls.ts"), "utf8");
const workspace = fs.readFileSync(path.join(viewerDir, "EcgViewerResizableWorkspace.tsx"), "utf8");
const canvas = fs.readFileSync(path.join(viewerDir, "EcgImageCanvas.tsx"), "utf8");
const proEngine = fs.readFileSync(path.join(viewerDir, "EcgProViewerEngine.tsx"), "utf8");
const paperGrid = fs.readFileSync(path.join(viewerDir, "EcgPaperGrid.tsx"), "utf8");
const leftRail = fs.readFileSync(path.join(viewerDir, "EcgViewerLeftRail.tsx"), "utf8");
const rightRail = fs.readFileSync(path.join(viewerDir, "EcgViewerRightRail.tsx"), "utf8");
const clinicalPanel = fs.readFileSync(path.join(viewerDir, "EcgClinicalFindingsPanel.tsx"), "utf8");
const rhythmStrip = fs.readFileSync(path.join(viewerDir, "EcgRhythmStripPanel.tsx"), "utf8");
const route = fs.readFileSync(routePath, "utf8");
const enterpriseUi = fs.readFileSync(enterpriseUiPath, "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");

const capabilitySources = [foundation, toolbar, settingsPanel, controls, workspace, canvas, proEngine, paperGrid, leftRail, rightRail, clinicalPanel, rhythmStrip];

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
  "mm/s",
  "mm/mV",
  "Clinical Findings",
  "Measurements",
  "Study History",
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
  assert(capabilitySources.some((file) => file.includes(marker)), `Sprint 13 viewer foundation missing capability marker: ${marker}`);
}

assert(route.includes("EcgEnterpriseWorkspaceScreen") || route.includes("EcgMonitorViewerFoundation"), "ecg-monitor route must render enterprise workspace screen.");
assert(route.includes("resolveEcgMonitorScreenPhase") || route.includes("EcgEnterpriseWorkspaceScreen"), "ecg-monitor route must resolve loading phases before rendering foundation.");
assert(route.includes("sprint13-ecg-monitor-loading") || route.includes("sprint13-ecg-monitor"), "ecg-monitor route must expose loading test id during startup.");
assert(route.includes("patient-loading") || route.includes("EcgEnterpriseWorkspaceScreen"), "ecg-monitor route must wait for patient context before ready state.");
assert(enterpriseUi.includes("/ecg-monitor"), "Enterprise shell must register ecg-monitor workspace route.");
assert(pipeline.includes("sprint13-ecg-viewer-foundation.integration.ts"), "Integration pipeline must register Sprint 13 viewer foundation test.");
assert(toolbar.includes("Compare") && toolbar.includes("onCompareToggle"), "Compare tool must be wired in enterprise toolbar.");
assert(toolbar.includes("toggleOverlay") || toolbar.includes("Overlay"), "AI Overlay must remain available in viewer toolbar.");
assert(toolbar.includes('label="Measure"'), "Measure tool must exist in viewer toolbar.");
assert(foundation.includes("useEcgAiOverlayWorkspace"), "Foundation must wire AI clinical overlay workspace.");
assert(foundation.includes("getDigitalECG"), "Enterprise workspace must wire digitized waveform source.");
assert(foundation.includes("EcgRhythmStripPanel"), "Enterprise workspace must render rhythm strip panel.");

console.log("sprint13-ecg-viewer-foundation.integration.ts: all Sprint 13 viewer foundation checks passed");
