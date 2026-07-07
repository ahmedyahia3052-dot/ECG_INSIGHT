/**
 * Sprint 50 — Real Hospital ECG Monitor Experience integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const AUDIO = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/live-monitor-audio");
const PRO = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/live-monitor-pro");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  { file: resolve(AUDIO, "useLiveMonitorAudioEngine.ts"), markers: ["useLiveMonitorAudioEngine", "detectBeatMarkerIndices"] },
  { file: resolve(PRO, "EcgLiveMonitorProHud.tsx"), markers: ["sprint50-pro-hud", "QTc"] },
  { file: resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/monitorLayout.ts"), markers: ["6x2", "dual", "quad", "COMPARISON_PRESETS"] },
  { file: resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/useEcgLiveMonitorEngine.ts"), markers: ["focusLead", "rhythmStripWindowSec", "setComparisonPreset"] },
  { file: resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorShell.tsx"), markers: ["sprint50-monitor-experience-ready", "useLiveMonitorAudioEngine"] },
  { file: resolve(ROOT, "tests/e2e/sprint50-real-hospital-monitor.spec.ts"), markers: ["@sprint50", "sprint50-pro-hud"] },
];

for (const entry of files) assertFileContains(entry.file, entry.markers);

console.log("Sprint 50 Real Hospital ECG Monitor Experience integration markers: PASS");
