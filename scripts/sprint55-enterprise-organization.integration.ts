/**
 * Sprint 55 — Enterprise Organization & Multi-Tenant Platform integration.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/organization-platform");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  { file: resolve(MOD, "permissions.ts"), markers: ["ENTERPRISE_PERMISSIONS", "SYSTEM_ROLE_DEFINITIONS", "organization.manage"] },
  { file: resolve(MOD, "tenant.middleware.ts"), markers: ["requireTenantAccess", "requirePermission", "TENANT_FORBIDDEN"] },
  { file: resolve(MOD, "organization.service.ts"), markers: ["createOrganization", "OrganizationSubscription", "OrganizationBranch", "seedSystemEnterpriseRoles"] },
  { file: resolve(MOD, "organization-platform.routes.ts"), markers: ["organizationPlatformRouter", "/:organizationId/branches", "/:organizationId/audit"] },
  { file: resolve(ROOT, "prisma/schema.prisma"), markers: ["OrganizationBranch", "OrganizationSubscription", "OrganizationBranding", "EnterpriseRole", "OrganizationMember", "LoginHistory", "OrganizationNotification"] },
  { file: resolve(ROOT, "prisma/migrations/20260708010000_sprint55_enterprise_organization/migration.sql"), markers: ["OrganizationBranch", "EnterpriseRole", "OrganizationMember"] },
  { file: resolve(ROOT, "server/src/modules/index.ts"), markers: ["/organization-platform", "organizationPlatformRouter"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 55 Enterprise Organization & Multi-Tenant Platform integration markers: PASS");
