/**
 * Sprint 45 — Hospital Grade ECG Monitor V2 integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const VIEWER = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer");
const V2 = resolve(VIEWER, "live-monitor-v2");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`Missing marker "${marker}" in ${file}`);
    }
  }
}

const files = [
  { file: resolve(V2, "ecgHospitalGrid.ts"), markers: ["drawHospitalEcgGrid", "sampleToClinicalY", "adaptiveTraceStrokeWidth"] },
  { file: resolve(V2, "EcgLiveMonitorHospitalHud.tsx"), markers: ["sprint45-hospital-hud", "FILTER", "BATTERY", "PATIENT"] },
  { file: resolve(V2, "EcgLiveMonitorFloatingPalette.tsx"), markers: ["sprint45-floating-palette", "EcgLiveMonitorLeadStrip", "Auto-hide"] },
  { file: resolve(VIEWER, "monitorLayout.ts"), markers: ["6-lead", "custom", "MONITOR_6_LEAD"] },
  { file: resolve(VIEWER, "useEcgLiveMonitorEngine.ts"), markers: ["cycleFilter", "horizontalScroll", "isolatedLead", "customLeads"] },
  { file: resolve(VIEWER, "ecgMonitorCanvas.ts"), markers: ["drawHospitalEcgGrid", "buildClinicalMarkers", "horizontalScroll"] },
  { file: resolve(VIEWER, "EcgLiveMonitorShell.tsx"), markers: ["EcgLiveMonitorHospitalHud", "EcgLiveMonitorFloatingPalette", "canvasViewportRatio"] },
  { file: resolve(ROOT, "tests/e2e/sprint45-hospital-monitor-v2.spec.ts"), markers: ["@sprint45", "sprint45-hospital-hud", "6 Lead"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 45 Hospital Grade ECG Monitor V2 integration markers: PASS");
