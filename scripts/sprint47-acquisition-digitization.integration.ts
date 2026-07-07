/**
 * Sprint 47 — ECG Acquisition & Digitization Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SERVER = resolve(ROOT, "server/src/modules/ecg-digitization");
const ACQ = resolve(SERVER, "acquisition");
const FE = resolve(ROOT, "artifacts/ecg-insight/components/ecg/acquisition");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  { file: resolve(ACQ, "smart-ecg-detector.ts"), markers: ["detectSmartEcgFeatures", "paperBordersDetected"] },
  { file: resolve(SERVER, "signal-reconstruction/index.ts"), markers: ["reconstructLeadSignal", "preserveMorphologySmooth"] },
  { file: resolve(SERVER, "quality-tier.ts"), markers: ["qualityTierFromScore", "Excellent"] },
  { file: resolve(SERVER, "jobs/digitization-job-queue.ts"), markers: ["runDigitizationJob", "cancelDigitizationJob"] },
  { file: resolve(SERVER, "types.ts"), markers: ["ecg-digitization-v47.0", "SmartEcgDetectionSnapshot"] },
  { file: resolve(FE, "EcgDigitizationOverlayStudio.tsx"), markers: ["sprint47-digitization-overlay", "overlay"] },
  { file: resolve(FE, "digitizationBridge.ts"), markers: ["buildDigitizationBridgeModel"] },
  { file: resolve(ROOT, "server/src/modules/ecg-processing/ecg-processing.routes.ts"), markers: ["/digitization/jobs", "/grid-overlay"] },
  { file: resolve(ROOT, "tests/e2e/sprint47-acquisition-digitization.spec.ts"), markers: ["@sprint47", "sprint47-acquisition"] },
];

for (const entry of files) assertFileContains(entry.file, entry.markers);

console.log("Sprint 47 ECG Acquisition & Digitization Engine integration markers: PASS");
