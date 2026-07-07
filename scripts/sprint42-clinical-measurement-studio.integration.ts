/**
 * Sprint 42 — Clinical Measurement Studio integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const VIEWER = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`Missing marker "${marker}" in ${file}`);
    }
  }
}

const files = [
  { file: resolve(VIEWER, "waveformCoordinateSpace.ts"), markers: ["imagePointToWaveform", "waveformToImagePoint", "readoutsFromWaveformAnchors"] },
  { file: resolve(VIEWER, "ecgAutoSnapEngine.ts"), markers: ["applyAutoSnap", "p_onset", "r_peak", "st_junction"] },
  { file: resolve(VIEWER, "ecgMeasurementEngine.ts"), markers: ["MEASUREMENT_WORKFLOW_PRESETS", "measurementFromWaveformCaliper", "format === \"xml\""] },
  { file: resolve(VIEWER, "EcgMeasurementsPanel.tsx"), markers: ["sprint42-measurement-studio-sidebar", "sprint42-export-xml", "applyWorkflowPreset"] },
  { file: resolve(VIEWER, "useEcgMeasurementWorkspace.ts"), markers: ["approveMeasurement", "applyWorkflowPreset", "syncCalipersFromWaveform"] },
  { file: resolve(ROOT, "tests/e2e/sprint42-clinical-measurement-studio.spec.ts"), markers: ["@sprint42", "sprint42-measurement-studio-sidebar"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 42 Clinical Measurement Studio integration markers: PASS");
