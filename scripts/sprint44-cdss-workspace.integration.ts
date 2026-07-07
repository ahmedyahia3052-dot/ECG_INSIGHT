/**
 * Sprint 44 — Clinical Decision Support Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const VIEWER = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer");
const CDSS = resolve(VIEWER, "cdss-workspace");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`Missing marker "${marker}" in ${file}`);
    }
  }
}

const files = [
  { file: resolve(CDSS, "types.ts"), markers: ["CdssWorkspaceModel", "CdssRuleId", "CdssTriageLevel"] },
  { file: resolve(CDSS, "clinicalRuleEngine.ts"), markers: ["evaluateClinicalRules", "inferior_stemi", "qt_prolongation"] },
  { file: resolve(CDSS, "guidelineEngine.ts"), markers: ["buildGuidelineReferences", "ACC/AHA", "Universal Definition of MI"] },
  { file: resolve(CDSS, "buildCdssWorkspaceModel.ts"), markers: ["buildCdssWorkspaceModel", "buildEnterpriseClinicalDecisionSection"] },
  { file: resolve(CDSS, "EcgCdssWorkspacePanel.tsx"), markers: ["sprint44-cdss-workspace", "Finding Relationship Graph"] },
  { file: resolve(VIEWER, "EcgClinicalRightPanel.tsx"), markers: ["sprint44-cdss-tab-pane", "id: \"cdss\""] },
  { file: resolve(VIEWER, "clinical-report-engine/EcgEnterpriseClinicalReportView.tsx"), markers: ["Clinical Decision Support", "sprint44-report-clinical-decision"] },
  { file: resolve(ROOT, "tests/e2e/sprint44-cdss-workspace.spec.ts"), markers: ["@sprint44", "sprint44-cdss-workspace"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 44 Clinical Decision Support Engine integration markers: PASS");
