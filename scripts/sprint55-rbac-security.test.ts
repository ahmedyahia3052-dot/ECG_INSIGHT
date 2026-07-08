import assert from "node:assert/strict";
import { ENTERPRISE_PERMISSIONS, SYSTEM_ROLE_DEFINITIONS } from "../server/src/modules/organization-platform/permissions";

assert.ok(ENTERPRISE_PERMISSIONS.includes("patient.create"));
assert.ok(ENTERPRISE_PERMISSIONS.includes("ecg.analyze"));
assert.ok(ENTERPRISE_PERMISSIONS.includes("audit.access"));
assert.ok(ENTERPRISE_PERMISSIONS.includes("organization.manage"));
assert.equal(ENTERPRISE_PERMISSIONS.length, 21);

const slugs = SYSTEM_ROLE_DEFINITIONS.map((r) => r.slug);
assert.ok(slugs.includes("developer"));
assert.ok(slugs.includes("super_admin"));
assert.ok(slugs.includes("organization_admin"));
assert.ok(slugs.includes("doctor"));
assert.ok(slugs.includes("viewer"));
assert.equal(SYSTEM_ROLE_DEFINITIONS.length, 14);

const admin = SYSTEM_ROLE_DEFINITIONS.find((r) => r.slug === "organization_admin");
assert.ok(admin);
assert.ok(admin!.permissions.includes("user.manage"));
assert.ok(admin!.permissions.includes("branch.manage"));

const viewer = SYSTEM_ROLE_DEFINITIONS.find((r) => r.slug === "viewer");
assert.ok(viewer);
assert.deepEqual(viewer!.permissions, ["patient.view"]);

console.log("sprint55-rbac-security.test.ts: all RBAC permission matrix tests passed");
