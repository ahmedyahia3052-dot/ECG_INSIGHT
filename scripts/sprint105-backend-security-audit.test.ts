import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ENTERPRISE_PERMISSIONS, SYSTEM_ROLE_DEFINITIONS } from "../server/src/modules/organization-platform/permissions";

assert.equal(ENTERPRISE_PERMISSIONS.length, 21);
assert.ok(ENTERPRISE_PERMISSIONS.includes("patient.view"));
assert.ok(ENTERPRISE_PERMISSIONS.includes("ecg.analyze"));
assert.ok(ENTERPRISE_PERMISSIONS.includes("audit.access"));
assert.ok(ENTERPRISE_PERMISSIONS.includes("organization.manage"));
assert.equal(SYSTEM_ROLE_DEFINITIONS.length, 14);

const developer = SYSTEM_ROLE_DEFINITIONS.find((role) => role.slug === "developer");
assert.ok(developer);
assert.equal(developer!.permissions.length, ENTERPRISE_PERMISSIONS.length);

const viewer = SYSTEM_ROLE_DEFINITIONS.find((role) => role.slug === "viewer");
assert.ok(viewer);
assert.deepEqual(viewer!.permissions, ["patient.view"]);

const envSource = readFileSync(resolve("server/src/config/env.ts"), "utf8");
for (const marker of ["JWT_SECRET", "JWT_REFRESH_SECRET", "PHI_ENCRYPTION_KEY", "AUTH_RATE_LIMIT_MAX", "RATE_LIMIT_MAX"]) {
  assert.ok(envSource.includes(marker), `env.ts missing ${marker}`);
}

const uploadSecurity = readFileSync(resolve("server/src/utils/upload-security.ts"), "utf8");
assert.ok(uploadSecurity.includes("assertUploadContentMatchesMime"));

const tenantMiddleware = readFileSync(resolve("server/src/modules/organization-platform/tenant.middleware.ts"), "utf8");
assert.ok(tenantMiddleware.includes("requireTenantAccess"));
assert.ok(tenantMiddleware.includes("requirePermission"));

const auditReport = readFileSync(resolve("SECURITY_AUDIT_REPORT.md"), "utf8");
assert.ok(auditReport.includes("Sprint 105"));
assert.ok(auditReport.includes("Organization Isolation"));

const riskReport = readFileSync(resolve("RISK_ASSESSMENT.md"), "utf8");
assert.ok(riskReport.includes("R-01"));

const readinessReport = readFileSync(resolve("PRODUCTION_READINESS.md"), "utf8");
assert.ok(readinessReport.includes("Production Readiness"));

console.log("Sprint 105 Backend Security Audit unit tests: PASS");
