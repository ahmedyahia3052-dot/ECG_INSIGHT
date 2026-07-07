/**
 * Sprint 49 — Hospital ECG Monitor HMI integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const HMI = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/live-monitor-hmi");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  { file: resolve(HMI, "EcgLiveMonitorHmiStatusBar.tsx"), markers: ["sprint49-hmi-status-bar", "EcgLiveMonitorHospitalHud"] },
  { file: resolve(HMI, "EcgLiveMonitorHmiLeftRail.tsx"), markers: ["sprint49-hmi-left-rail", "EcgLiveMonitorLeadStrip"] },
  { file: resolve(HMI, "EcgLiveMonitorHmiRightRail.tsx"), markers: ["sprint49-hmi-right-rail", "Quick Impression"] },
  { file: resolve(HMI, "EcgLiveMonitorHmiBottomBar.tsx"), markers: ["sprint49-hmi-bottom-bar", "sprint45-floating-palette"] },
  { file: resolve(HMI, "useLiveMonitorHmiLayout.ts"), markers: ["useLiveMonitorHmiLayout", "leftRailCollapsed"] },
  { file: resolve(HMI, "ecgLiveMonitorHmiTokens.ts"), markers: ["canvasViewportRatio", "0.94"] },
  { file: resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorShell.tsx"), markers: ["sprint49-hmi-workspace-ready", "EcgLiveMonitorHmiStatusBar"] },
  { file: resolve(ROOT, "tests/e2e/sprint49-live-monitor-hmi.spec.ts"), markers: ["@sprint49", "sprint49-hmi-workspace-ready"] },
];

for (const entry of files) assertFileContains(entry.file, entry.markers);

console.log("Sprint 49 Hospital ECG Monitor HMI integration markers: PASS");
