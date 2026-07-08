import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const workflowDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer", "clinical-workflow");
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredModules = ["types.ts", "engine.ts", "alerts.ts", "index.ts"];
for (const file of requiredModules) {
  assert(fs.existsSync(path.join(workflowDir, file)), `Missing Sprint 30 workflow module: ${file}`);
}

const requiredComponents = [
  "EcgClinicalWorkflowRibbon.tsx",
  "EcgCaseTimelinePanel.tsx",
  "EcgAiReviewWorkflowPanel.tsx",
  "EcgClinicalAlertsBanner.tsx",
  "EcgPatientWorkspacePanel.tsx",
  "EcgHistoryEnginePanel.tsx",
  "EcgMeasurementStudioPanel.tsx",
  "EcgClinicalNotesPanel.tsx",
  "useClinicalWorkflowEngine.ts",
];

for (const file of requiredComponents) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 30 component: ${file}`);
}

const pipeline = fs.readFileSync(pipelinePath, "utf8");
const types = fs.readFileSync(path.join(workflowDir, "types.ts"), "utf8");
const engine = fs.readFileSync(path.join(workflowDir, "engine.ts"), "utf8");
const alerts = fs.readFileSync(path.join(workflowDir, "alerts.ts"), "utf8");
const ribbon = fs.readFileSync(path.join(viewerDir, "EcgClinicalWorkflowRibbon.tsx"), "utf8");
const alertsBanner = fs.readFileSync(path.join(viewerDir, "EcgClinicalAlertsBanner.tsx"), "utf8");
const patientPanel = fs.readFileSync(path.join(viewerDir, "EcgPatientWorkspacePanel.tsx"), "utf8");
const historyPanel = fs.readFileSync(path.join(viewerDir, "EcgHistoryEnginePanel.tsx"), "utf8");
const measurementStudio = fs.readFileSync(path.join(viewerDir, "EcgMeasurementStudioPanel.tsx"), "utf8");
const notesPanel = fs.readFileSync(path.join(viewerDir, "EcgClinicalNotesPanel.tsx"), "utf8");
const aiPanel = fs.readFileSync(path.join(viewerDir, "EcgAiReviewWorkflowPanel.tsx"), "utf8");
const timelinePanel = fs.readFileSync(path.join(viewerDir, "EcgCaseTimelinePanel.tsx"), "utf8");
const foundation = fs.readFileSync(path.join(viewerDir, "EcgMonitorViewerFoundation.tsx"), "utf8");
const rightPanel = fs.readFileSync(path.join(viewerDir, "EcgClinicalRightPanel.tsx"), "utf8");
const reportPanel = fs.readFileSync(path.join(viewerDir, "EcgReportPreviewPanel.tsx"), "utf8");

const capabilityMarkers = [
  "sprint30-clinical-workflow-ribbon",
  "sprint30-clinical-workflow-ready",
  "sprint30-clinical-alerts",
  "sprint30-patient-workspace",
  "sprint30-history-engine",
  "sprint30-measurement-studio",
  "sprint30-clinical-notes",
  "sprint30-ai-review-panel",
  "sprint30-case-timeline",
  "sprint35-clinical-right-panel",
  "sprint30-finalize-report",
  "sprint30-sign-report",
  "buildWorkflowSteps",
  "buildClinicalAlerts",
  "buildCaseTimelineEvents",
  "doctor-notes",
  "signal-reconstruction",
  "digital-signature",
  "EcgClinicalAlertsBanner",
  "EcgMeasurementStudioPanel",
  "EcgClinicalNotesPanel",
  "useClinicalWorkflowEngine",
];

for (const marker of capabilityMarkers) {
  const source = [types, engine, alerts, ribbon, alertsBanner, patientPanel, historyPanel, measurementStudio, notesPanel, aiPanel, timelinePanel, foundation, rightPanel, reportPanel, pipeline].some((file) => file.includes(marker));
  assert(source, `Sprint 30 clinical workflow missing capability: ${marker}`);
}

assert(types.includes('"export"'), "Workflow must include export stage");
assert((types.match(/id: "/g) ?? []).length >= 16, "Workflow must define 16 stages");
assert(foundation.includes("EcgClinicalWorkflowRibbon"), "Foundation must render workflow ribbon");
assert(foundation.includes("EcgClinicalAlertsBanner"), "Foundation must render clinical alerts");
assert(rightPanel.includes("EcgMeasurementStudioPanel"), "Right panel must include measurement studio");
assert(fs.existsSync(path.join(viewerDir, "EcgClinicalNotesPanel.tsx")), "Clinical notes panel component must exist");
assert(fs.existsSync(path.join(viewerDir, "EcgUnifiedClinicalLeftPanel.tsx")), "Unified left panel must expose patient context");
assert(pipeline.includes("ecg-clinical-workflow.test.ts"), "Pipeline must register Sprint 30 unit test");
assert(pipeline.includes("sprint30-clinical-workflow.integration.ts"), "Pipeline must register Sprint 30 integration test");

console.log("sprint30-clinical-workflow.integration.ts: all Sprint 30 checks passed");
