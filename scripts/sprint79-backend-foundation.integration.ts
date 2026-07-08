import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const foundationRoot = path.resolve("artifacts/ecg-insight/services/foundation");

const requiredDirs = [
  "config",
  "api",
  "auth",
  "logging",
  "repositories",
  "services",
  "hooks",
  "state",
];

for (const dir of requiredDirs) {
  assert.ok(fs.existsSync(path.join(foundationRoot, dir)), `Missing foundation/${dir}`);
}

const version = fs.readFileSync(path.join(foundationRoot, "version.ts"), "utf8");
assert.match(version, /sprint79-v1/);

const bootstrap = fs.readFileSync(path.join(foundationRoot, "bootstrap.ts"), "utf8");
assert.match(bootstrap, /initializeApiFoundation/);
assert.match(bootstrap, /registerEnterpriseInterceptors/);

const interceptors = fs.readFileSync(path.join(foundationRoot, "api/interceptors.ts"), "utf8");
assert.match(interceptors, /registerEnterpriseInterceptors/);
assert.match(interceptors, /correlationHeader/);
assert.match(interceptors, /createCorrelationId/);

const abstraction = fs.readFileSync(path.join(foundationRoot, "api/abstraction.ts"), "utf8");
assert.match(abstraction, /executeFoundationRequest/);
assert.match(abstraction, /withRetryStrategy/);

const caseRepository = fs.readFileSync(path.join(foundationRoot, "repositories/case-repository.ts"), "utf8");
assert.match(caseRepository, /assignDoctor/);
assert.match(caseRepository, /getTimeline/);

const clinicalService = fs.readFileSync(path.join(foundationRoot, "services/clinical-api-service.ts"), "utf8");
assert.match(clinicalService, /loadWorkspaceSnapshot/);

const layout = fs.readFileSync(path.resolve("artifacts/ecg-insight/app/_layout.tsx"), "utf8");
assert.match(layout, /initializeApiFoundation/);

const authContext = fs.readFileSync(path.resolve("artifacts/ecg-insight/context/AuthContext.tsx"), "utf8");
assert.match(authContext, /initializeApiFoundation/);

console.log("Sprint 79 backend foundation integration checks passed.");
