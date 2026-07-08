import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const authRoot = path.resolve("server/src/modules/authentication");

const requiredPaths = [
  "version.ts",
  "domain/roles.ts",
  "domain/constants.ts",
  "repository/session.repository.ts",
  "repository/user-auth.repository.ts",
  "service/authentication.service.ts",
  "service/session.service.ts",
  "service/password.service.ts",
  "service/token.service.ts",
  "openapi.ts",
];

for (const relativePath of requiredPaths) {
  assert.ok(fs.existsSync(path.join(authRoot, relativePath)), `Missing authentication/${relativePath}`);
}

const version = fs.readFileSync(path.join(authRoot, "version.ts"), "utf8");
assert.match(version, /sprint83-v1/);

const roles = fs.readFileSync(path.join(authRoot, "domain/roles.ts"), "utf8");
assert.match(roles, /organization_admin/);
assert.match(roles, /technician/);
assert.match(roles, /ORGANIZATION_ADMIN/);
assert.match(roles, /TECHNICIAN/);

const sessionService = fs.readFileSync(path.join(authRoot, "service/session.service.ts"), "utf8");
assert.match(sessionService, /rotateRefreshSession/);
assert.match(sessionService, /tokenVersion/);
assert.match(sessionService, /REFRESH_REUSE/);

const passwordService = fs.readFileSync(path.join(authRoot, "service/password.service.ts"), "utf8");
assert.match(passwordService, /assertPasswordPolicy/);

const authServiceFacade = fs.readFileSync(path.resolve("server/src/auth/auth.service.ts"), "utf8");
assert.match(authServiceFacade, /authenticationService/);

const migration = fs.readFileSync(
  path.resolve("prisma/migrations/20260709020000_sprint83_authentication_backend/migration.sql"),
  "utf8",
);
assert.match(migration, /ORGANIZATION_ADMIN/);
assert.match(migration, /TECHNICIAN/);
assert.match(migration, /tokenVersion/);

console.log("Sprint 83 authentication backend integration checks passed.");
