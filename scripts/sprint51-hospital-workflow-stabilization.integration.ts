import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VIEWER = path.join(ROOT, "artifacts/ecg-insight/components/ecg/viewer");
const APP = path.join(ROOT, "artifacts/ecg-insight/app/(protected)");

function read(file: string) {
  return fs.readFileSync(file, "utf8");
}

const checks: Array<[string, boolean]> = [
  ["Examination workflow gate", read(path.join(VIEWER, "EcgExaminationWorkflowGate.tsx")).includes("ecg-examination-empty-state")],
  ["No sample ECG removed from workspace route", !read(path.join(APP, "ecg-workspace.tsx")).includes("No sample ECG available")],
  ["Case resolver auto-opens single examination", read(path.join(VIEWER, "useEcgWorkspaceCaseResolver.ts")).includes("select-examination")],
  ["Auto digitize hook", fs.existsSync(path.join(VIEWER, "useAutoDigitizeCase.ts"))],
  ["Workspace route uses examination gate", read(path.join(APP, "ecg-workspace.tsx")).includes("EcgExaminationWorkflowGate")],
  ["Live monitor route uses examination gate", read(path.join(APP, "ecg-live-monitor.tsx")).includes("EcgExaminationWorkflowGate")],
  ["Professional empty state actions", read(path.join(VIEWER, "EcgExaminationWorkflowGate.tsx")).includes("ecg-empty-upload")],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

if (failed > 0) process.exit(1);
console.log("sprint51-hospital-workflow-stabilization.integration.ts: all checks passed");
