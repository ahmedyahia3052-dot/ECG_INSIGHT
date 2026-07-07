import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const servicesDir = path.join(repoRoot, "artifacts", "ecg-insight", "services");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredModules = [
  "EcgAiCardiologistWorkspace.tsx",
  "ai-cardiologist/types.ts",
  "ai-cardiologist/buildCardiologistModel.ts",
  "ai-cardiologist/diagnosisLeadMap.ts",
  "ai-cardiologist/index.ts",
];

for (const file of requiredModules) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 38 module: ${file}`);
}

assert(fs.existsSync(path.join(servicesDir, "medicalIntelligence.ts")), "Missing medicalIntelligence service");

const workspace = fs.readFileSync(path.join(viewerDir, "EcgAiCardiologistWorkspace.tsx"), "utf8");
const modelBuilder = fs.readFileSync(path.join(viewerDir, "ai-cardiologist/buildCardiologistModel.ts"), "utf8");
const rightPanel = fs.readFileSync(path.join(viewerDir, "EcgClinicalRightPanel.tsx"), "utf8");
const foundation = fs.readFileSync(path.join(viewerDir, "EcgMonitorViewerFoundation.tsx"), "utf8");
const liveMonitorShell = fs.readFileSync(path.join(viewerDir, "EcgLiveMonitorShell.tsx"), "utf8");
const serverIndex = fs.readFileSync(path.join(repoRoot, "server", "src", "modules", "index.ts"), "utf8");
const pipeline = fs.readFileSync(pipelinePath, "utf8");

const sections = [
  "Rhythm Analysis",
  "Axis",
  "Intervals",
  "Wave Analysis",
  "ST Analysis",
  "Block Detection",
  "Arrhythmia",
  "Hypertrophy",
  "Ischemia / Infarction",
  "Clinical Impression",
  "Differential Diagnosis",
  "Recommendations",
  "Confidence",
  "Visualization",
];

for (const section of sections) {
  assert(workspace.includes(section), `Sprint 38 missing section: ${section}`);
}

const capabilityMarkers = [
  "sprint38-ai-cardiologist-workspace",
  "sprint30-ai-review-panel",
  "EcgAiCardiologistWorkspace",
  "buildCardiologistModel",
  "fetchOrAnalyzeMedicalIntelligence",
  "medical-intelligence",
  "onFocusLeads",
  "highlightLeads",
  "sprint38-section-",
  "sprint38-differential",
];

for (const marker of capabilityMarkers) {
  const source = [workspace, modelBuilder, rightPanel, foundation, serverIndex, pipeline].some((file) => file.includes(marker));
  assert(source, `Sprint 38 missing capability: ${marker}`);
}

assert(rightPanel.includes("EcgAiCardiologistWorkspace"), "Right panel must mount AI Cardiologist workspace");
assert(!rightPanel.includes("EcgAiReviewWorkflowPanel"), "Simple AI review panel must be replaced in right panel");
assert(!liveMonitorShell.includes("EcgAiCardiologistWorkspace"), "Sprint 37 live monitor must remain independent");
assert(serverIndex.includes('modulesRouter.use("/medical-intelligence"'), "Medical intelligence API must be registered");
assert(pipeline.includes("sprint38-ai-cardiologist-workspace.integration.ts"), "Pipeline must register Sprint 38 integration");

console.log("Sprint 38 AI Cardiologist workspace integration passed.");
