import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const moduleRoot = path.join(root, "server/src/modules/organization-domain");

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

for (const file of ["index.ts", "routes.ts", "repository.ts", "schemas.ts", "list-query.ts", "swagger.ts", "domain-audit.ts"]) {
  assert.ok(fs.existsSync(path.join(moduleRoot, file)), `Missing organization-domain/${file}`);
}

const routes = read("server/src/modules/organization-domain/routes.ts");
for (const route of [
  '"/organizations"',
  '"/organizations/:organizationId/departments"',
  '"/departments/:departmentId"',
  '"/organizations/:organizationId/employees"',
  '"/employees/:employeeId"',
  '"/patients"',
  '"/patients/:patientId"',
  '"/organizations/:organizationId/doctors"',
  '"/doctors/:doctorId"',
  '"/cases"',
  '"/cases/:caseId"',
  '"/organizations/:organizationId/audit"',
]) {
  assert.match(routes, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const repository = read("server/src/modules/organization-domain/repository.ts");
for (const fn of [
  "listOrganizationsRepo",
  "softDeleteOrganizationRepo",
  "listDepartmentsRepo",
  "listEmployeesRepo",
  "listPatientsRepo",
  "listDoctorsRepo",
  "listEcgCasesRepo",
  "listAuditTrailRepo",
  "notDeletedWhere",
  "buildCreateUpdateAudit",
]) {
  assert.match(repository, new RegExp(fn));
}

assert.match(read("server/src/modules/index.ts"), /organization-domain/);
assert.match(read("server/src/api/docs/docs.routes.ts"), /organizationDomainOpenApiPaths/);
assert.match(read("server/src/modules/organization-domain/swagger.ts"), /sprint84-v1/);

console.log("sprint84-organization-domain.integration.ts: all checks passed");
