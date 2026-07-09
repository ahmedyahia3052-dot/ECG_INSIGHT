import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 93 marker: ${needle}`);
    }
  }
}

function assertContainsOneOf(path: string, needles: string[]) {
  const content = read(path);
  if (!needles.some((needle) => content.includes(needle))) {
    throw new Error(`${path} is missing one of required markers: ${needles.join(", ")}`);
  }
}

assertContains("artifacts/ecg-insight/app/(protected)/ecg-viewer.tsx", [
  "EcgProViewerFoundationScreen",
  "useEcgWorkspaceCaseResolver",
  "ecg-viewer-resolving",
]);

assertContainsOneOf("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerFoundationScreen.tsx", [
  "sprint95-ecg-pro-viewer-root",
  "sprint101-ecg-pro-viewer-root",
]);
assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerFoundationScreen.tsx", [
  "EcgProViewerToolbar",
  "EcgProViewerToolsPanel",
  "EcgProViewerInfoPanel",
  "EcgProViewerStatusBar",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerCanvas.tsx", [
  "devicePixelRatio",
  "drawImage",
  "wheel",
  "PinchGestureHandler",
]);

assertContains("artifacts/ecg-insight/services/ecgViewerApi.ts", [
  "/ecg-viewer/cases/",
  "/ecg-storage/files/",
  "getEcgViewerBundle",
]);

assertContains("artifacts/ecg-insight/routes/registry.ts", [
  'href: "/ecg-viewer"',
  "/ecg-viewer",
]);

assertContains("artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerToolbar.tsx", [
  "Fit Width",
  "Fit Screen",
  "25 mm/s",
  "50 mm/s",
  "5 mm/mV",
  "10 mm/mV",
  "20 mm/mV",
  "Download",
  "Print",
  "Fullscreen",
]);

console.log("Sprint 93 ECG Pro Viewer foundation integration checks: PASS");
