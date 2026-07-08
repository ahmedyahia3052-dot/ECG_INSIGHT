/**
 * Sprint 57 — Enterprise Report Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/enterprise-report-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  { file: resolve(MOD, "templates.ts"), markers: ["ENTERPRISE_REPORT_TEMPLATES", "hospital-standard", "occupational-medicine", "teaching-case", "AI_DIAGNOSTIC"] },
  { file: resolve(MOD, "composer.ts"), markers: ["composeEnterpriseReportDocument", "verificationHash", "attachmentManifest", "brandingSnapshot"] },
  { file: resolve(MOD, "html-renderer.ts"), markers: ["renderEnterpriseReportHtml", "Patient Information", "AI Section", "Doctor Section", "Attachments"] },
  { file: resolve(MOD, "pdf-renderer.ts"), markers: ["renderEnterpriseReportPdf", "Helvetica", "Page"] },
  { file: resolve(MOD, "fhir-export.ts"), markers: ["buildFhirBundle", "DiagnosticReport", "Bundle"] },
  { file: resolve(MOD, "security.ts"), markers: ["computeVerificationHash", "verifyReportIntegrity", "tampered"] },
  { file: resolve(MOD, "history.service.ts"), markers: ["reportExportLog", "reportHistoryEvent", "REPORT_EXPORTED"] },
  { file: resolve(MOD, "enterprise-report.routes.ts"), markers: ["enterpriseReportEngineRouter", "/templates", "/fhir", "/history", "/verify/:reportUuid"] },
  { file: resolve(ROOT, "prisma/schema.prisma"), markers: ["EnterpriseReportType", "EnterpriseReportTemplate", "ReportExportLog", "ReportHistoryEvent", "reportUuid", "verificationHash"] },
  { file: resolve(ROOT, "prisma/migrations/20260708030000_sprint57_enterprise_report_engine/migration.sql"), markers: ["EnterpriseReportTemplate", "ReportExportLog", "ReportHistoryEvent"] },
  { file: resolve(ROOT, "server/src/modules/index.ts"), markers: ["/enterprise-report-engine", "enterpriseReportEngineRouter"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 57 Enterprise Report Engine integration markers: PASS");
