/**
 * Sprint 70 — Enterprise Performance & Database Optimization integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(ROOT, "server/src/modules/enterprise-rules-engine/repository.ts"),
    markers: ["persistRuleExecutionsBatch", "createManyAndReturn", "systemRulesSeeded"],
  },
  {
    file: resolve(ROOT, "server/src/modules/enterprise-rules-engine/audit.ts"),
    markers: ["recordEngineAuditsBatch", "createMany"],
  },
  {
    file: resolve(ROOT, "server/src/modules/enterprise-rules-engine/enterprise-rules.service.ts"),
    markers: ["persistRuleExecutionsBatch", "recordEngineAuditsBatch"],
  },
  {
    file: resolve(ROOT, "server/src/modules/ai-report-generator/ai-report-generator.service.ts"),
    markers: ["patientId: input.patientId", "patientId: ecgCase.patientId"],
  },
  {
    file: resolve(ROOT, "server/src/modules/medical-intelligence/persist.ts"),
    markers: ["listMedicalIntelligenceReports(caseId: string, limit = 20)", "take: limit"],
  },
  {
    file: resolve(ROOT, "server/src/modules/clinical-alerts-risk-engine/clinical-alerts-risk.service.ts"),
    markers: ["return result.alerts", "return result.assessment"],
  },
  {
    file: resolve(ROOT, "server/src/cases/cases.routes.ts"),
    markers: ["caseListInclude", "pageSize", "totalPages"],
  },
  {
    file: resolve(ROOT, "server/src/modules/enterprise-report-engine/enterprise-report.service.ts"),
    markers: ["ensureEnterpriseReportTemplatesSeeded", "enterpriseTemplatesSeeded"],
  },
  {
    file: resolve(ROOT, "server/src/performance/query-profiler.ts"),
    markers: ["profileQuery", "summarizeTimings"],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: [
      "@@index([caseId, createdAt])",
      "@@index([caseId, sourceEngine, status])",
      "@@index([caseId, versionNumber])",
    ],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260708090000_sprint70_performance_optimization/migration.sql"),
    markers: [
      "ECGMeasurement_caseId_createdAt_idx",
      "ECGClinicalAlert_caseId_sourceEngine_status_idx",
      "AuditLog_caseId_createdAt_idx",
    ],
  },
  {
    file: resolve(ROOT, "reports/SPRINT70_PERFORMANCE_OPTIMIZATION_REPORT.md"),
    markers: ["Sprint 70", "Benchmark Comparison", "Composite Indexes"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 70 Performance Optimization integration markers: PASS");
