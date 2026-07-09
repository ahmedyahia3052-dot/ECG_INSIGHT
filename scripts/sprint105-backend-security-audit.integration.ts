/**
 * Sprint 105 — Enterprise Backend Security Audit integration checks.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function assertExists(relativePath: string) {
  const absolute = resolve(ROOT, relativePath);
  if (!existsSync(absolute)) throw new Error(`Missing Sprint 105 file: ${relativePath}`);
}

function assertContains(relativePath: string, markers: string[]) {
  const content = readFileSync(resolve(ROOT, relativePath), "utf8");
  for (const marker of markers) {
    if (!content.includes(marker)) throw new Error(`${relativePath} missing marker: ${marker}`);
  }
}

const deliverables = [
  "SECURITY_AUDIT_REPORT.md",
  "RISK_ASSESSMENT.md",
  "PRODUCTION_READINESS.md",
];

for (const file of deliverables) assertExists(file);

assertContains("SECURITY_AUDIT_REPORT.md", [
  "Sprint 105",
  "Authentication",
  "Authorization",
  "JWT",
  "Refresh Tokens",
  "RBAC",
  "Organization Isolation",
  "Rate Limiting",
  "Audit Logging",
  "File Upload Security",
  "OCR Security",
  "AI Endpoint Security",
  "Subscription Validation",
  "Environment Variables",
  "Database Transactions",
]);

assertContains("RISK_ASSESSMENT.md", [
  "R-01",
  "R-02",
  "Critical",
  "Remediation",
]);

assertContains("PRODUCTION_READINESS.md", [
  "Production Readiness",
  "Blockers",
  "Ready",
]);

const securityModules = [
  "server/src/middleware/auth.ts",
  "server/src/middleware/api-security.ts",
  "server/src/middleware/auth-rate-limit.ts",
  "server/src/middleware/validate.ts",
  "server/src/middleware/error.ts",
  "server/src/utils/jwt.ts",
  "server/src/utils/upload-security.ts",
  "server/src/utils/upload-access.ts",
  "server/src/utils/resource-access.ts",
  "server/src/modules/authentication/service/session.service.ts",
  "server/src/modules/organization-platform/tenant.middleware.ts",
  "server/src/modules/organization-platform/permissions.ts",
  "server/src/modules/audit/audit.routes.ts",
  "server/src/modules/security/security.routes.ts",
  "server/src/modules/ocr/ocr.routes.ts",
  "server/src/ai/ai.routes.ts",
  "server/src/subscriptions/monetization.service.ts",
  "server/src/config/env.ts",
];

for (const file of securityModules) assertExists(file);

assertContains("server/src/middleware/auth.ts", ["requireAuth", "requireRole"]);
assertContains("server/src/modules/authentication/service/session.service.ts", ["tokenVersion", "REFRESH_REUSE"]);
assertContains("server/src/middleware/api-security.ts", ["csrf", "validSignature"]);
assertContains("server/src/utils/upload-security.ts", ["assertUploadContentMatchesMime"]);
assertContains("server/src/modules/organization-domain/routes.ts", ["resolveScopedOrganizationId", "TENANT_FORBIDDEN"]);

assertContains("scripts/integration/pipeline.mjs", [
  "scripts/sprint105-backend-security-audit.test.ts",
  "scripts/sprint105-backend-security-audit.integration.ts",
]);

console.log("Sprint 105 Backend Security Audit integration checks: PASS");
