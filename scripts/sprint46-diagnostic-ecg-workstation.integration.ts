/**
 * Sprint 46 — Diagnostic ECG Workstation integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const VIEWER = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer");
const DIAG = resolve(VIEWER, "diagnostic-workstation");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`Missing marker "${marker}" in ${file}`);
    }
  }
}

const files = [
  { file: resolve(DIAG, "useDiagnosticWorkstationEngine.ts"), markers: ["linkFromFinding", "compareSync", "toggleLeadPin"] },
  { file: resolve(DIAG, "ecgDiagnosticReportLinking.ts"), markers: ["resolveReportLinkFromFinding", "reorderLeads"] },
  { file: resolve(DIAG, "ecgDiagnosticCompareEngine.ts"), markers: ["computeDiagnosticDifferenceRegions", "syncBeatOffset"] },
  { file: resolve(DIAG, "EcgDiagnosticWorkstationShell.tsx"), markers: ["sprint46-diagnostic-workstation-ready", "sprint46-diagnostic-center-canvas"] },
  { file: resolve(DIAG, "EcgDiagnosticLeadToolsBar.tsx"), markers: ["sprint46-diagnostic-lead-tools", "sprint46-compare-difference"] },
  { file: resolve(DIAG, "EcgDiagnosticRhythmStrip.tsx"), markers: ["sprint46-diagnostic-rhythm-strip", "sprint46-rhythm-strip-canvas"] },
  { file: resolve(DIAG, "EcgDiagnosticPanelsRibbon.tsx"), markers: ["sprint46-diagnostic-panels-ribbon", "sprint46-panel-"] },
  { file: resolve(VIEWER, "EcgMonitorViewerFoundation.tsx"), markers: ["EcgDiagnosticWorkstationShell", "sprint46-diagnostic-workstation-ready", "computeDiagnosticDifferenceRegions"] },
  { file: resolve(VIEWER, "EcgCompareViewer.tsx"), markers: ["sprint46-compare-difference-banner", "differenceHighlight"] },
  { file: resolve(ROOT, "tests/e2e/sprint46-diagnostic-ecg-workstation.spec.ts"), markers: ["@sprint46", "sprint46-diagnostic-workstation-ready"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 46 Diagnostic ECG Workstation integration markers: PASS");
