/**
 * Sprint 48 — Hospital ECG Examination Workflow integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SERVER = resolve(ROOT, "server/src/modules/examination-workflow");
const FE = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/examination-workflow");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  { file: resolve(SERVER, "types.ts"), markers: ["examination-workflow-v48.0", "archive-examination"] },
  { file: resolve(SERVER, "examination-session.service.ts"), markers: ["getOrCreateExaminationSession", "signExaminationSession", "buildExaminationQualitySnapshot"] },
  { file: resolve(SERVER, "examination-workflow.routes.ts"), markers: ["/examination/session", "/examination/sign"] },
  { file: resolve(FE, "useExaminationWorkflowEngine.ts"), markers: ["useExaminationWorkflowEngine", "examination-session"] },
  { file: resolve(FE, "EcgExaminationWorkflowPanel.tsx"), markers: ["sprint48-examination-workflow-ready", "sprint48-lifecycle-status"] },
  { file: resolve(FE, "EcgExaminationDoctorReviewPanel.tsx"), markers: ["sprint48-examination-doctor-review", "Rejected"] },
  { file: resolve(FE, "EcgExaminationQualityControlPanel.tsx"), markers: ["sprint48-examination-quality-control", "Auto Recommendations"] },
  { file: resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer/EcgClinicalRightPanel.tsx"), markers: ['{ id: "examination", label: "Examination" }', "sprint48-examination-tab-pane"] },
  { file: resolve(ROOT, "tests/e2e/sprint48-hospital-examination-workflow.spec.ts"), markers: ["@sprint48", "sprint48-examination-workflow-ready"] },
];

for (const entry of files) assertFileContains(entry.file, entry.markers);

console.log("Sprint 48 Hospital ECG Examination Workflow integration markers: PASS");
