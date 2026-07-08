import assert from "node:assert/strict";
import {
  assertLifecycleTransition,
  lifecycleFromCaseStatus,
  managementStatusForLifecycle,
} from "../server/src/modules/clinical-case-management/domain/lifecycle";

assert.equal(lifecycleFromCaseStatus("UPLOADED"), "uploaded");
assert.equal(lifecycleFromCaseStatus("PROCESSING"), "processing");
assert.equal(managementStatusForLifecycle("finalized"), "FINALIZED");

assert.doesNotThrow(() => assertLifecycleTransition("reviewed", "finalized"));
assert.throws(() => assertLifecycleTransition("archived", "draft"));

console.log("Sprint 87 clinical case management unit tests: PASS");
