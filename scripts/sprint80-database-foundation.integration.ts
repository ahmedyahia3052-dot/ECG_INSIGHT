import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

assert.match(read("prisma/schema.prisma"), /sprint80-v1|Sprint 80 — Database foundation/);

const migration = read("prisma/migrations/20260709000000_sprint80_database_foundation/migration.sql");
for (const table of ["Patient", "Organization", "Department", "ECGCase", "ClinicalDocument", "ClinicalReport", "AIAnalysis", "Notification"]) {
  assert.match(migration, new RegExp(table));
}

const schema = read("prisma/schema.prisma");
for (const marker of [
  "recordUuid",
  "CaseCreatedBy",
  "PatientCreatedBy",
  "OrganizationCreatedBy",
  "DepartmentCreatedBy",
  "ClinicalDocumentUploader",
  "AIAnalysisCreatedBy",
]) {
  assert.match(schema, new RegExp(marker));
}

const contracts = read("server/src/database/foundation/contracts.ts");
assert.match(contracts, /DATABASE_FOUNDATION_VERSION = "sprint80-v1"/);
assert.match(contracts, /DATABASE_ENTITY_REGISTRY/);
assert.match(contracts, /assertDatabaseFoundationRegistry/);

for (const entity of ["organization", "department", "doctor", "patient", "ecgCase", "clinicalDocument", "clinicalReport", "subscription", "license", "auditLog", "notification", "aiAnalysis"]) {
  assert.match(contracts, new RegExp(`"${entity}"`));
}

const softDelete = read("server/src/database/foundation/soft-delete.ts");
assert.match(softDelete, /notDeletedWhere/);
assert.match(softDelete, /softDeleteData/);

const validator = read("server/src/database/foundation/repository-validator.ts");
assert.match(validator, /validateRepositoryQuery/);
assert.match(validator, /assertRepositoryQuery/);

console.log("sprint80-database-foundation.integration.ts: all checks passed");
