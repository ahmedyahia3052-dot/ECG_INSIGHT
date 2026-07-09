import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path, needles) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 95 marker: ${needle}`);
    }
  }
}

function assertContainsOneOf(path, needles) {
  const content = read(path);
  if (!needles.some((needle) => content.includes(needle))) {
    throw new Error(`${path} is missing one of required Sprint 95 markers: ${needles.join(", ")}`);
  }
}

assertContains("artifacts/ecg-insight/app/(protected)/ecg-viewer.tsx", [
  "EcgProViewerFoundationScreen",
  "tabsParam={tabs}",
  "useEcgWorkspaceCaseResolver",
]);

assertContainsOneOf("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerFoundationScreen.tsx", [
  "sprint95-ecg-pro-viewer-root",
  "sprint101-ecg-pro-viewer-root",
]);
assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerFoundationScreen.tsx", [
  "EcgProViewerCaseTabs",
  "EcgProViewerWaveformCanvas",
  "EcgProViewerComparisonPanel",
  "useEcgProViewerShortcuts",
  "useEcgProViewerTabs",
]);

assertContainsOneOf("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerToolbar.tsx", [
  "sprint95-ecg-pro-viewer-toolbar",
  "sprint101-ecg-pro-viewer-toolbar",
]);
assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerToolbar.tsx", [
  "12-Lead",
  "Rhythm",
  "Focus",
  "25 mm/s",
  "50 mm/s",
  "5 mm/mV",
  "10 mm/mV",
  "20 mm/mV",
  "Compare",
  "Waveform",
  "Fullscreen",
]);

assertContains("artifacts/ecg-insight/services/ecgViewerApi.ts", [
  "getEcgViewerWaveform",
  "compareEcgViewerCases",
  "getEcgViewerLeads",
  "/ecg-viewer/cases/",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerWaveformCanvas.tsx", [
  "EcgRenderingEngineView",
  "onFpsUpdate",
  "sprint95-ecg-pro-viewer-waveform-canvas",
]);

assertContains("scripts/integration/pipeline.mjs", [
  "scripts/sprint95-ecg-pro-viewer.test.ts",
  "scripts/sprint95-ecg-pro-viewer.integration.ts",
]);

console.log("Sprint 95 ECG Pro Viewer integration checks: PASS");
