/**
 * Sprint 90 — Medical Report Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/medical-report-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "types.ts"),
    markers: ["MEDICAL_REPORT_ENGINE_VERSION", "MEDICAL_REPORT_SECTIONS", "PdfRenderStage"],
  },
  {
    file: resolve(MOD, "dto.ts"),
    markers: ["MedicalReportDto", "MedicalReportFhirExportDto", "PrintLayoutDto", "PdfArchitectureDto"],
  },
  {
    file: resolve(MOD, "validators.ts"),
    markers: ["validateDraftReportUpdate", "validateFinalizeReport", "validateSignReport"],
  },
  {
    file: resolve(MOD, "repository.ts"),
    markers: ["findReportById", "createReportVersionRecord", "finalizeReportRecord"],
  },
  {
    file: resolve(MOD, "medical-report.service.ts"),
    markers: ["createDraftMedicalReport", "finalizeMedicalReport", "exportReportAsFhir", "verifyMedicalReportQr"],
  },
  {
    file: resolve(MOD, "exporters.ts"),
    markers: ["exportMedicalReportJson", "exportMedicalReportFhir", "describePdfArchitecture", "buildPrintLayout"],
  },
  {
    file: resolve(MOD, "medical-report.routes.ts"),
    markers: ["/drafts", "/export/json", "/export/fhir", "/print-layout", "/pdf-architecture", "/verify/:reportUuid"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/medical-report-engine", "medicalReportEngineRouter"],
  },
  {
    file: resolve(ROOT, "SPRINT90_REPORT_ENGINE.md"),
    markers: ["Draft reports", "Final reports", "QR verification", "PDF generation architecture", "Export FHIR"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 90 Medical Report Engine integration markers: PASS");
