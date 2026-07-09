import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 101 marker: ${needle}`);
    }
  }
}

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerFoundationScreen.tsx", [
  "sprint101-ecg-pro-viewer-root",
  "EcgProViewerAiFindingsSidebar",
  "buildSegmentAlignedDigitizedWaveformLeads",
  "configureWaveDetection",
  "compareLayout",
  "compareOpacity",
  "EcgAiClinicalOverlay",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerClinicalMeasurementsPanel.tsx", [
  "sprint101-clinical-measurements-panel",
  "buildClinicalMeasurementCards",
  "computeLiveMeasurements",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerToolbar.tsx", [
  "sprint101-ecg-pro-viewer-toolbar",
  "Fit Width",
  "Snapshot",
  "AI Overlay",
  "AI Findings",
  "sprint101-compare-layout",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/useEcgProViewerShortcuts.ts", [
  "onSnapshot",
  "onExportJson",
  "onOverlayToggle",
  "ArrowLeft",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/clinicalMeasurementCards.ts", [
  "buildClinicalMeasurementCards",
  "bundleSeedFromMeasurements",
]);

assertContains("scripts/integration/pipeline.mjs", [
  "scripts/sprint101-ecg-pro-viewer.test.ts",
  "scripts/sprint101-ecg-pro-viewer.integration.ts",
]);

console.log("Sprint 101 ECG Pro Viewer integration checks: PASS");
