import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const viewerPath = path.join(repoRoot, "artifacts", "ecg-insight", "components", "ecg", "EcgProViewer.tsx");
const caseDetailPath = path.join(repoRoot, "artifacts", "ecg-insight", "app", "(protected)", "ecg-cases", "[id].tsx");
const viewer = fs.readFileSync(viewerPath, "utf8");
const caseDetail = fs.readFileSync(caseDetailPath, "utf8");

const requiredViewerCapabilities = [
  "Original ECG",
  "Digitized 12-Lead ECG",
  "GridOverlay",
  "Zoom In",
  "Zoom Out",
  "Pan ←",
  "LeadNavigator",
  "Full Screen",
  "Horizontal",
  "Vertical",
  "Heart Rate",
  "PR Interval",
  "QRS Duration",
  "QT Interval",
  "QTc",
  "MONITOR MODE",
  "Freeze",
  "Speed",
  "Gain",
  "ECG Explainability Engine",
  "AnnotationLayer",
  "Comparison Mode",
  "CRITICAL ECG ALERT",
];

for (const capability of requiredViewerCapabilities) {
  assert(viewer.includes(capability), `EcgProViewer is missing Sprint 25 capability marker: ${capability}`);
}

assert(viewer.includes("pathForMonitorLead"), "Monitor waveform must support gain-aware rendering.");
assert(viewer.includes("settings.frozen"), "Monitor workspace must support freeze/resume state.");
assert(viewer.includes("settings.speed"), "Monitor workspace must support adjustable speed.");
assert(viewer.includes("settings.gain"), "Monitor workspace must support adjustable gain.");
assert(caseDetail.includes("<EcgProViewer"), "ECG case detail must render the ECG Pro Viewer workspace.");
assert(caseDetail.includes("getDigitalECG"), "ECG case detail must load digitized ECG data for waveform rendering.");
assert(caseDetail.includes("getAIExplainability"), "ECG case detail must load AI explainability overlays.");

console.log("ECG Pro Viewer workspace regression test passed.");
