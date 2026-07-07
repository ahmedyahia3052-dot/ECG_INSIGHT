/**
 * Sprint 43 — Enterprise Clinical Report Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const VIEWER = resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer");
const ENGINE = resolve(VIEWER, "clinical-report-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`Missing marker "${marker}" in ${file}`);
    }
  }
}

const files = [
  {
    file: resolve(ENGINE, "types.ts"),
    markers: ["EnterpriseClinicalReportModel", "EnterpriseAiFinding", "ClinicalReportType"],
  },
  {
    file: resolve(ENGINE, "buildEnterpriseReportModel.ts"),
    markers: ["buildEnterpriseReportModel", "aiFindings", "criticalAlertsFromFindings"],
  },
  {
    file: resolve(ENGINE, "EcgEnterpriseClinicalReportView.tsx"),
    markers: ["sprint43-enterprise-clinical-report", "AI Findings", "Confidence Summary"],
  },
  {
    file: resolve(ENGINE, "EcgEnterpriseClinicalReportPanel.tsx"),
    markers: ["sprint43-clinical-report-panel", "sprint43-report-export-json", "Hospital PDF"],
  },
  {
    file: resolve(ENGINE, "exportClinicalReport.ts"),
    markers: ["exportClinicalReportFhir", "downloadClinicalReportJson", "printClinicalReport"],
  },
  {
    file: resolve(VIEWER, "EcgReportPreviewPanel.tsx"),
    markers: ["EcgEnterpriseClinicalReportPanel", "sprint43-enterprise-report-host"],
  },
  {
    file: resolve(ROOT, "server/src/modules/reports/clinical-report-html-sections.ts"),
    markers: ["buildEnterpriseClinicalReportSections", "AI Findings", "Confidence Summary"],
  },
  {
    file: resolve(ROOT, "tests/e2e/sprint43-clinical-report-engine.spec.ts"),
    markers: ["@sprint43", "sprint43-clinical-report-panel"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 43 Enterprise Clinical Report Engine integration markers: PASS");
