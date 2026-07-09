import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 96 marker: ${needle}`);
    }
  }
}

function assertContainsOneOf(path: string, needles: string[]) {
  const content = read(path);
  if (!needles.some((needle) => content.includes(needle))) {
    throw new Error(`${path} is missing one of required Sprint 96 markers: ${needles.join(", ")}`);
  }
}

assertContainsOneOf("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerFoundationScreen.tsx", [
  "sprint96-ecg-pro-viewer-image-canvas",
  "sprint101-ecg-pro-viewer-image-canvas",
]);
assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerFoundationScreen.tsx", [
  "EcgProViewerMeasurementLayer",
  "EcgProViewerClinicalMeasurementsPanel",
  "useEcgProViewerClinicalMeasurements",
  "useEcgMeasurementWorkspace",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerToolsPanel.tsx", [
  "sprint96-ecg-pro-viewer-tools",
  "sprint96-tool-calipers",
  "sprint96-tool-measurement",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerMeasurementLayer.tsx", [
  "EcgMeasurementOverlay",
  "EcgMeasurementFloatingToolbar",
  "sprint96-ecg-pro-viewer-measurement-layer",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/clinicalMeasurementCards.ts", [
  "Heart Rate",
  "QTc",
  "T Duration",
  "Axis",
  "tWaveDurationMs",
]);

assertContainsOneOf("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerClinicalMeasurementsPanel.tsx", [
  "sprint96-auto-measurement",
  "sprint101-auto-measurement",
]);
assertContainsOneOf("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerClinicalMeasurementsPanel.tsx", [
  "sprint96-save-manual-measurement",
  "sprint101-save-manual-measurement",
]);
assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerClinicalMeasurementsPanel.tsx", [
  "buildClinicalMeasurementCards",
]);

assertContains("artifacts/ecg-insight/services/clinicalMeasurementApi.ts", [
  "/clinical-measurement-engine/cases/",
  "runAutoClinicalMeasurement",
  "saveManualClinicalMeasurement",
]);

assertContains("server/src/modules/clinical-measurement-engine/clinical-measurement-engine.routes.ts", [
  "/cases/:caseId/auto",
  "/cases/:caseId/manual",
  "getClinicalMeasurementEngineStatus",
]);

assertContains("server/src/modules/clinical-measurement-engine/service.ts", [
  "ClinicalMeasurementRecord",
  "runAutoClinicalMeasurement",
  "saveManualClinicalMeasurement",
  "tWaveDurationMs",
  "pAxisDeg",
  "qrsAxisDeg",
  "tAxisDeg",
]);

assertContains("prisma/schema.prisma", [
  "model ClinicalMeasurementRecord",
  "ClinicalMeasurementSource",
  "tWaveDurationMs",
]);

assertContains("server/src/modules/index.ts", [
  "/clinical-measurement-engine",
  "clinicalMeasurementEngineRouter",
]);

console.log("Sprint 96 clinical measurement engine integration checks: PASS");
