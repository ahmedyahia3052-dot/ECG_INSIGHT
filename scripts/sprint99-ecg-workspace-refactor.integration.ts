import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VIEWER = path.join(ROOT, "artifacts/ecg-insight/components/ecg/viewer");

function read(file: string) {
  return fs.readFileSync(file, "utf8");
}

function assertExcludes(file: string, needles: string[]) {
  const content = read(path.join(VIEWER, file));
  for (const needle of needles) {
    if (content.includes(needle)) {
      throw new Error(`${file} must not include Sprint 99 forbidden marker: ${needle}`);
    }
  }
}

function assertIncludes(file: string, needles: string[]) {
  const content = read(path.join(VIEWER, file));
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${file} is missing required Sprint 99 marker: ${needle}`);
    }
  }
}

assertExcludes("EcgViewModeSwitcher.tsx", ['"monitor"', "Live Monitor"]);
assertExcludes("EcgMonitorViewerFoundation.tsx", ["EcgLiveMonitorView", "EcgLiveMonitorShell", "ecg-live-monitor-digital-ecg"]);
assertIncludes("EcgMonitorViewerFoundation.tsx", ["openLiveMonitor", 'applyFit("width")', "ecg-workspace-digital-ecg"]);
assertIncludes("EcgClinicalRightPanel.tsx", [
  "sprint35-clinical-right-panel",
  "Clinical Interpretation",
  "Physician Notes",
  "Previous ECG",
  "EcgClinicalCollapsibleSection",
]);
assertIncludes("EcgClinicalCollapsibleSection.tsx", ["sprint99-clinical-section-"]);
assertIncludes("ecgWorkstationVisualTokens.ts", ["viewportTargetMin: 0.75", "leftPanelMinWidth: 200"]);
assertIncludes("ecgImageEngine.ts", ["ECG_HERO_FILL_TARGET = 0.78", "centeredPanForFit"]);
assertIncludes("types.ts", ['| "waveform"']);
assertExcludes("types.ts", ['| "monitor"']);

const proViewer = read(path.join(ROOT, "artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerFoundationScreen.tsx"));
if (proViewer.includes("EcgLiveMonitorShell")) {
  throw new Error("ECG Pro Viewer must remain untouched by Sprint 99 workspace refactor.");
}

const liveMonitorRoute = read(path.join(ROOT, "artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx"));
if (!liveMonitorRoute.includes("EcgLiveMonitorWorkspaceScreen")) {
  throw new Error("Live Monitor route must remain untouched.");
}

console.log("Sprint 99 ECG Workspace Refactor integration checks: PASS");
