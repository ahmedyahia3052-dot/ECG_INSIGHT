import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source: string, token: string, label: string) {
  if (!source.includes(token)) {
    throw new Error(`Sprint 34 validation failed: missing ${label}`);
  }
}

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260626184000_sprint34_cdss/migration.sql");
const service = read("server/src/modules/clinical-intelligence/cdss.service.ts");
const routes = read("server/src/modules/clinical-intelligence/cdss.routes.ts");
const modules = read("server/src/modules/index.ts");
const frontendService = read("artifacts/ecg-insight/services/clinicalIntelligence.ts");
const panel = read("artifacts/ecg-insight/components/clinical/CDSSDecisionPanel.tsx");
const caseDetail = read("artifacts/ecg-insight/app/(protected)/ecg-cases/[id].tsx");
const report = read("SPRINT_34_CLINICAL_DECISION_SUPPORT_REPORT.md");

[
  "ClinicalDecisionRule",
  "ClinicalDecisionSupportRun",
  "ClinicalDecisionFinding",
  "CDSSRiskCategory",
  "CDSSOccupationalDecision",
  "CDSSFindingType",
  "CDSS_DECISION_GENERATED",
].forEach((token) => assertIncludes(schema, token, `schema token ${token}`));

[
  "CREATE TABLE \"ClinicalDecisionRule\"",
  "CREATE TABLE \"ClinicalDecisionSupportRun\"",
  "CREATE TABLE \"ClinicalDecisionFinding\"",
  "ALTER TYPE \"AuditAction\" ADD VALUE IF NOT EXISTS 'CDSS_DECISION_GENERATED'",
].forEach((token) => assertIncludes(migration, token, `migration token ${token}`));

[
  "CDSS-RHY-001",
  "CDSS-QT-002",
  "CDSS-ISC-001",
  "CDSS-OCC-001",
  "evaluateCDSS",
  "occupationalDecision",
  "trendInterpretation",
  "explainability",
  "createNotification",
].forEach((token) => assertIncludes(service, token, `service token ${token}`));

[
  "/cases/:caseId/evaluate",
  "/cases/:caseId/runs",
  "/rules",
  "requireRole(\"DOCTOR\")",
  "canAccessCase",
].forEach((token) => assertIncludes(routes, token, `route token ${token}`));

assertIncludes(modules, "modulesRouter.use(\"/cdss\", cdssRouter)", "CDSS router registration");

[
  "evaluateCDSS",
  "listCDSSRuns",
  "CDSSRiskCategory",
  "CDSSOccupationalDecision",
].forEach((token) => assertIncludes(frontendService, token, `frontend service ${token}`));

[
  "Clinical Decision Support Engine",
  "Risk Panel",
  "Red Flag Alerts",
  "Occupational Decision",
  "Explainability",
  "Trend Intelligence",
].forEach((token) => assertIncludes(panel, token, `panel token ${token}`));

assertIncludes(caseDetail, "CDSSDecisionPanel", "case detail CDSS panel mount");
assertIncludes(report, "Sprint 34", "Sprint 34 report");

console.log("Sprint 34 CDSS integration checks passed.");
