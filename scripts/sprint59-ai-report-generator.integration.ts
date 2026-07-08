/**
 * Sprint 59 — AI Report Generator Enterprise integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/ai-report-generator");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "composer.ts"),
    markers: [
      "composeAiClinicalReport",
      "executiveSummary",
      "fullInterpretation",
      "buildClinicalFlags",
      "buildExplanations",
      "runMedicalIntelligenceEngine",
    ],
  },
  {
    file: resolve(MOD, "ai-report-generator.service.ts"),
    markers: [
      "generateClinicalReport",
      "regenerateClinicalReport",
      "listClinicalGeneratedReportHistory",
      "serializeClinicalGeneratedReport",
      "ClinicalGeneratedReport",
    ],
  },
  {
    file: resolve(MOD, "ai-report-generator.routes.ts"),
    markers: [
      "aiReportGeneratorRouter",
      "/report/generate",
      "/report/:id",
      "/report/:id/history",
      "/report/:id/regenerate",
    ],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: [
      "ClinicalGeneratedReport",
      "ClinicalRecommendation",
      "ClinicalFinding",
      "ClinicalExplanation",
      "ClinicalRiskLevel",
      "ClinicalReportFlagType",
    ],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260708050000_sprint59_ai_report_generator/migration.sql"),
    markers: [
      "ClinicalGeneratedReport",
      "ClinicalRecommendation",
      "ClinicalFinding",
      "ClinicalExplanation",
      "ClinicalRiskLevel",
    ],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/ai-report-generator", "aiReportGeneratorRouter"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 59 AI Report Generator Enterprise integration markers: PASS");
