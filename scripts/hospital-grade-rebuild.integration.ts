import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VIEWER = path.join(ROOT, "artifacts/ecg-insight/components/ecg/viewer");

function read(rel: string) {
  return fs.readFileSync(path.join(VIEWER, rel), "utf8");
}

const checks: Array<[string, boolean]> = [
  ["RE2 wired into live monitor renderer", read("hospital-monitor/hospitalMonitorRenderer.ts").includes("drawRenderEngine2MonitorFrame")],
  ["Display presets (bedside / central-station)", read("monitorLayout.ts").includes("MonitorDisplayPreset")],
  ["Extended audio alarm profiles", read("live-monitor-audio/ecgMonitorAudioTokens.ts").includes("MonitorAudioProfile")],
  ["Workspace foundation ready marker", fs.readFileSync(path.join(VIEWER, "EcgMonitorViewerFoundation.tsx"), "utf8").includes("hospital-grade-workspace-ready")],
  ["Live monitor rebuild ready marker", fs.readFileSync(path.join(VIEWER, "EcgLiveMonitorShell.tsx"), "utf8").includes("hospital-grade-rebuild-ready")],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log("hospital-grade-rebuild.integration.ts: all integration checks passed");
