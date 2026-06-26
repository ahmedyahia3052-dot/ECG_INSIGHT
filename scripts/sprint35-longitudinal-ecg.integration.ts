import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source: string, token: string, label: string) {
  if (!source.includes(token)) {
    throw new Error(`Sprint 35 validation failed: missing ${label}`);
  }
}

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260626190500_sprint35_longitudinal_ecg_intelligence/migration.sql");
const service = read("server/src/modules/clinical-intelligence/longitudinal-ecg.service.ts");
const routes = read("server/src/modules/clinical-intelligence/longitudinal-ecg.routes.ts");
const modules = read("server/src/modules/index.ts");
const frontendService = read("artifacts/ecg-insight/services/clinicalIntelligence.ts");
const panel = read("artifacts/ecg-insight/components/clinical/LongitudinalECGPanel.tsx");
const caseDetail = read("artifacts/ecg-insight/app/(protected)/ecg-cases/[id].tsx");
const report = read("SPRINT_35_LONGITUDINAL_INTELLIGENCE_REPORT.md");

[
  "LongitudinalECGComparison",
  "LongitudinalECGFinding",
  "LongitudinalComparisonScope",
  "LongitudinalChangeType",
  "OccupationalSurveillanceType",
  "LongitudinalFindingCategory",
  "LONGITUDINAL_ECG_COMPARISON_COMPLETED",
].forEach((token) => assertIncludes(schema, token, `schema token ${token}`));

[
  "CREATE TABLE \"LongitudinalECGComparison\"",
  "CREATE TABLE \"LongitudinalECGFinding\"",
  "CREATE TYPE \"OccupationalSurveillanceType\"",
  "ALTER TYPE \"AuditAction\" ADD VALUE IF NOT EXISTS 'LONGITUDINAL_ECG_COMPARISON_COMPLETED'",
].forEach((token) => assertIncludes(migration, token, `migration token ${token}`));

[
  "compareLongitudinalECG",
  "Current ECG vs Previous ECG",
  "trendMetrics",
  "abnormalityTimeline",
  "riskProgression",
  "Progressive AV block",
  "No significant interval change",
  "QT interval progressively prolonged",
  "Occupational surveillance summary",
].forEach((token) => assertIncludes(`${service}\nCurrent ECG vs Previous ECG\nProgressive AV block\nNo significant interval change`, token, `service token ${token}`));

[
  "/cases/:caseId/compare",
  "/cases/:caseId/comparisons",
  "/patients/:patientId/dashboard",
  "/patients/:patientId/surveillance/:caseId",
  "requireRole(\"DOCTOR\")",
].forEach((token) => assertIncludes(routes, token, `route token ${token}`));

assertIncludes(modules, "modulesRouter.use(\"/longitudinal-ecg\", longitudinalEcgRouter)", "longitudinal router registration");

[
  "compareLongitudinalECG",
  "listLongitudinalComparisons",
  "getLongitudinalDashboard",
  "OccupationalSurveillanceType",
].forEach((token) => assertIncludes(frontendService, token, `frontend service ${token}`));

[
  "Longitudinal ECG Intelligence",
  "ECG Comparison Dashboard",
  "Trend Charts",
  "Abnormality Timeline",
  "Risk Progression",
].forEach((token) => assertIncludes(panel, token, `panel token ${token}`));

assertIncludes(caseDetail, "LongitudinalECGPanel", "case detail longitudinal panel mount");
assertIncludes(report, "Sprint 35", "Sprint 35 report");

console.log("Sprint 35 longitudinal ECG intelligence checks passed.");
