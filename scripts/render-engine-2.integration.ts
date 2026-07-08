/**
 * Render Engine 2.0 — Hospital Visualization Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const RE2 = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/render-engine-2");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`Missing marker "${marker}" in ${file}`);
    }
  }
}

const modules = [
  "types.ts",
  "displayProfile.ts",
  "medicalGrid.ts",
  "waveformProcessor.ts",
  "hospitalRenderer.ts",
  "leadRenderer.ts",
  "realtimeEngine.ts",
  "performanceMetrics.ts",
  "benchmark.ts",
  "index.ts",
];

for (const mod of modules) {
  assertFileContains(resolve(RE2, mod), ["export"]);
}

const files = [
  { file: resolve(RE2, "realtimeEngine.ts"), markers: ["HospitalRealtimeEngine", "CircularScrollBuffer", "OffscreenCanvas", "drawRenderEngine2MonitorFrame"] },
  { file: resolve(RE2, "medicalGrid.ts"), markers: ["drawMedicalEcgGrid", "computeMedicalGridMetrics", "subPixelAlign"] },
  { file: resolve(RE2, "hospitalRenderer.ts"), markers: ["drawPhosphorTrace", "dynamicTraceStrokeWidth", "imageSmoothingQuality"] },
  { file: resolve(RE2, "waveformProcessor.ts"), markers: ["processWaveformSamples", "baselineWander", "clinicalSmoothing"] },
  { file: resolve(RE2, "leadRenderer.ts"), markers: ["LeadRenderer", "updateSyncClock", "resampleSubPixel"] },
  { file: resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/hospital-monitor/hospitalMonitorRenderer.ts"), markers: ["drawRenderEngine2MonitorFrame", "HospitalRealtimeEngine"] },
  { file: resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorView.tsx"), markers: ["paintHospitalMonitorFrame", "sprint22-hospital-monitor-canvas"] },
  { file: resolve(ROOT, "tests/e2e/render-engine-2-hospital-visualization.spec.ts"), markers: ["@render-engine-2", "data-render-engine"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Render Engine 2.0 Hospital Visualization Engine integration markers: PASS");
