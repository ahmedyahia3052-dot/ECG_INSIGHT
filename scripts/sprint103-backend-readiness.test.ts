import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { BOLT_MIGRATION_FLAGS, isLegacyUiActive } from "../shared/config/feature-flags.ts";
import { HTTP_ERROR_CONTRACTS, errorBodyForStatus } from "../shared/types/errors.ts";
import { resolveLoadingContract } from "../shared/types/loading.ts";
import { ROLE_PERMISSIONS } from "../shared/types/role.ts";

assert.equal(BOLT_MIGRATION_FLAGS.length, 9);
assert.equal(isLegacyUiActive(), true);
assert.equal(HTTP_ERROR_CONTRACTS[401].code, "UNAUTHORIZED");
assert.equal(errorBodyForStatus(404).code, "NOT_FOUND");
assert.ok(ROLE_PERMISSIONS.doctor.includes("cases.read"));

const loading = resolveLoadingContract({
  data: [],
  emptyWhen: (data) => !data?.length,
  isError: false,
  isLoading: false,
});
assert.equal(loading.status, "empty");

const registry = JSON.parse(readFileSync(resolve("contracts/api-registry.json"), "utf8"));
assert.equal(registry.version, "sprint103-v1");
assert.ok(registry.modules.length >= 10);

console.log("Sprint 103 Backend Readiness unit tests: PASS");
