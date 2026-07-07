import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerDir = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "viewer");
const appDir = path.join(repoRoot, "artifacts", "ecg-insight", "app", "(protected)");
const pipelinePath = path.join(repoRoot, "scripts", "integration", "pipeline.mjs");

const requiredModules = [
  "ecgLiveMonitorTokens.ts",
  "useEcgLiveMonitorEngine.ts",
  "useEcgLiveMonitorShortcuts.ts",
  "EcgLiveMonitorShell.tsx",
  "EcgLiveMonitorWorkspaceScreen.tsx",
  "EcgLiveMonitorControls.tsx",
  "EcgLiveMonitorStatusPanel.tsx",
  "EcgLiveMonitorLeadStrip.tsx",
];

for (const file of requiredModules) {
  assert(fs.existsSync(path.join(viewerDir, file)), `Missing Sprint 37 live monitor module: ${file}`);
}

assert(fs.existsSync(path.join(appDir, "ecg-live-monitor.tsx")), "Missing ecg-live-monitor route");
assert(fs.existsSync(path.join(appDir, "ecg-live-monitor", "[caseId].tsx")), "Missing ecg-live-monitor/[caseId] route");

const pipeline = fs.readFileSync(pipelinePath, "utf8");
const shell = fs.readFileSync(path.join(viewerDir, "EcgLiveMonitorShell.tsx"), "utf8");
const controls = fs.readFileSync(path.join(viewerDir, "EcgLiveMonitorControls.tsx"), "utf8");
const status = fs.readFileSync(path.join(viewerDir, "EcgLiveMonitorStatusPanel.tsx"), "utf8");
const leads = fs.readFileSync(path.join(viewerDir, "EcgLiveMonitorLeadStrip.tsx"), "utf8");
const engine = fs.readFileSync(path.join(viewerDir, "useEcgLiveMonitorEngine.ts"), "utf8");
const shortcuts = fs.readFileSync(path.join(viewerDir, "useEcgLiveMonitorShortcuts.ts"), "utf8");
const workspaceScreen = fs.readFileSync(path.join(viewerDir, "EcgLiveMonitorWorkspaceScreen.tsx"), "utf8");
const liveMonitorView = fs.readFileSync(path.join(viewerDir, "EcgLiveMonitorView.tsx"), "utf8");
const liveMonitorRoute = fs.readFileSync(path.join(appDir, "ecg-live-monitor.tsx"), "utf8");
const foundation = fs.readFileSync(path.join(viewerDir, "EcgMonitorViewerFoundation.tsx"), "utf8");
const enterpriseUi = fs.readFileSync(
  path.join(repoRoot, "artifacts", "ecg-insight", "components", "enterprise", "EnterpriseUI.tsx"),
  "utf8",
);

const capabilityMarkers = [
  "sprint37-live-monitor-ready",
  "sprint37-live-monitor-workspace-ready",
  "sprint37-live-monitor-status",
  "sprint37-live-monitor-controls",
  "sprint37-live-monitor-leads",
  "sprint37-exit-diagnostic",
  "sprint37-live-monitor-canvas-host",
  "useEcgLiveMonitorEngine",
  "useEcgLiveMonitorShortcuts",
  "EcgLiveMonitorShell",
  "EcgLiveMonitorWorkspaceScreen",
  "Rhythm Strip",
  "Diagnostic Monitor",
  "jumpToStart",
  "jumpToEnd",
  "frameStepForward",
  "toggleRecord",
  "/ecg-live-monitor",
  "Live Monitor",
];

for (const marker of capabilityMarkers) {
  const source = [shell, controls, status, leads, engine, shortcuts, workspaceScreen, liveMonitorView, liveMonitorRoute, pipeline, enterpriseUi].some((file) => file.includes(marker));
  assert(source, `Sprint 37 live monitor missing capability: ${marker}`);
}

assert(!foundation.includes("EcgLiveMonitorShell"), "Review workspace foundation must remain independent from live monitor shell");
assert(pipeline.includes("sprint37-live-monitor-workspace.integration.ts"), "Pipeline must register Sprint 37 live monitor integration");

console.log("Sprint 37 live monitor workspace integration passed.");
