/**
 * Sprint 87 — Clinical Case Management integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/clinical-case-management");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "version.ts"),
    markers: ["sprint87-v1"],
  },
  {
    file: resolve(MOD, "domain/lifecycle.ts"),
    markers: ["CLINICAL_CASE_LIFECYCLE", "assertLifecycleTransition", "FINALIZED"],
  },
  {
    file: resolve(MOD, "repository/case.repository.ts"),
    markers: ["CaseRepository", "updateLifecycle", "restoreFromSnapshot"],
  },
  {
    file: resolve(MOD, "repository/history.repository.ts"),
    markers: ["recordHistory", "recordAudit", "listStatusHistory"],
  },
  {
    file: resolve(MOD, "repository/lock.repository.ts"),
    markers: ["findBlockingLock", "acquire", "release"],
  },
  {
    file: resolve(MOD, "service/lifecycle.service.ts"),
    markers: ["transition", "archive", "restore"],
  },
  {
    file: resolve(MOD, "service/timeline.service.ts"),
    markers: ["getUnifiedTimeline", "getStatusHistory"],
  },
  {
    file: resolve(MOD, "service/notes.service.ts"),
    markers: ["addNote", "INTERNAL", "CLINICAL"],
  },
  {
    file: resolve(MOD, "service/assignment.service.ts"),
    markers: ["reassignCase", "updatePriority", "updateCriticalFlag", "updateLabels"],
  },
  {
    file: resolve(MOD, "service/locking.service.ts"),
    markers: ["acquire", "release", "Case is locked"],
  },
  {
    file: resolve(MOD, "service/version.service.ts"),
    markers: ["restore", "CLINICAL_CASE_VERSION_RESTORED", "markRestored"],
  },
  {
    file: resolve(MOD, "routes/clinical-case-management.routes.ts"),
    markers: ["/cases/:caseId/timeline", "/cases/:caseId/lifecycle", "/cases/:caseId/lock", "versions/:versionId/restore"],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: ["UPLOADED", "PROCESSING", "FINALIZED", "CaseCommentNoteType", "noteType"],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260709030000_sprint87_clinical_case_management/migration.sql"),
    markers: ["CaseCommentNoteType", "UPLOADED", "PROCESSING", "FINALIZED"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/clinical-case-management", "clinicalCaseManagementRouter"],
  },
  {
    file: resolve(ROOT, "SPRINT87_CASE_MANAGEMENT_REPORT.md"),
    markers: ["Case Lifecycle", "Timeline", "Lock Enforcement", "Version History"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 87 Clinical Case Management integration markers: PASS");
