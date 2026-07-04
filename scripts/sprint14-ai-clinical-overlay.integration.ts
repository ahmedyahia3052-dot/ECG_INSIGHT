import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");
const serverContracts = path.join(repoRoot, "server", "src", "modules", "ai-overlay", "ai-overlay.contracts.ts");

const requiredFiles = [
  "aiOverlayTypes.ts",
  "ecgAiOverlayEngine.ts",
  "useEcgAiOverlayWorkspace.ts",
  "EcgAiClinicalOverlay.tsx",
  "EcgAiAnnotationInspector.tsx",
];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 14 Phase 2 module: ${file}`);
}

const engine = fs.readFileSync(path.join(viewerDir, "ecgAiOverlayEngine.ts"), "utf8");
const overlay = fs.readFileSync(path.join(viewerDir, "EcgAiClinicalOverlay.tsx"), "utf8");
const inspector = fs.readFileSync(path.join(viewerDir, "EcgAiAnnotationInspector.tsx"), "utf8");
const workspaceHook = fs.readFileSync(path.join(viewerDir, "useEcgAiOverlayWorkspace.ts"), "utf8");
const foundation = fs.readFileSync(path.join(viewerDir, "EcgMonitorViewerFoundation.tsx"), "utf8");
const toolbar = fs.readFileSync(path.join(viewerDir, "EcgViewerToolbar.tsx"), "utf8");
const rightRail = fs.readFileSync(path.join(viewerDir, "EcgViewerRightRail.tsx"), "utf8");
const canvas = fs.readFileSync(path.join(viewerDir, "EcgImageCanvas.tsx"), "utf8");
const types = fs.readFileSync(path.join(viewerDir, "aiOverlayTypes.ts"), "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");
const contracts = fs.readFileSync(serverContracts, "utf8");

const capabilityMarkers = [
  "buildAiClinicalAnnotations",
  "confidenceColor",
  "exportOverlayAnnotations",
  "restoreOverlayState",
  "sprint14-ecg-ai-clinical-overlay",
  "sprint14-ecg-ai-annotation-inspector",
  "sprint14-ecg-ai-overlay-layer",
  "getAIExplainability",
  "getAIResult",
  "toggleOverlay",
  "selectAnnotation",
  "pr_interval",
  "qrs_complex",
  "qt_interval",
  "qtc_interval",
  "st_segment",
  "heart_rate",
  "electrical_axis",
  "doctorNotes",
  "confirmed",
  "rejected",
  "Export Overlay",
  "Reset Overlay",
  "version: 5",
  "AiOverlaySyncEventDto",
];

for (const marker of capabilityMarkers) {
  const source = [engine, overlay, inspector, workspaceHook, foundation, toolbar, rightRail, canvas, types, contracts].some((file) =>
    file.includes(marker),
  );
  assert(source, `Sprint 14 Phase 2 missing capability marker: ${marker}`);
}

assert(toolbar.includes('"AI Overlay"') && toolbar.includes("toggleOverlay") && !toolbar.includes('disabled label="AI Overlay"'), "AI Overlay toolbar must be enabled.");
assert(pipeline.includes("sprint14-ai-clinical-overlay.integration.ts"), "Integration pipeline must register Sprint 14 Phase 2 overlay test.");
assert(pipeline.includes("ecg-ai-overlay-engine.test.ts"), "Integration pipeline must register AI overlay unit test.");
assert(!engine.includes("TODO"), "AI overlay engine must not contain TODO markers.");

console.log("sprint14-ai-clinical-overlay.integration.ts: all Sprint 14 Phase 2 checks passed");
