/**
 * Sprint 60 — ECG Case Management Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/case-management-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "case-management.service.ts"),
    markers: [
      "recordCaseHistory",
      "recordCaseAudit",
      "archiveManagedCase",
      "restoreManagedCase",
      "detectDuplicateCases",
      "createCaseVersion",
    ],
  },
  {
    file: resolve(MOD, "case-management.routes.ts"),
    markers: [
      "caseManagementEngineRouter",
      "/:caseId/management-history",
      "/:caseId/archive",
      "/:caseId/restore",
      "/:caseId/audit",
    ],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: [
      "CaseManagementStatus",
      "model CaseHistory",
      "model CaseComment",
      "model CaseAttachment",
      "model CaseAudit",
      "managementStatus",
    ],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260708060000_sprint60_ecg_case_management/migration.sql"),
    markers: ["CaseHistory", "CaseComment", "CaseAttachment", "CaseAudit", "CaseManagementStatus"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["caseManagementEngineRouter"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 60 ECG Case Management Engine integration markers: PASS");
