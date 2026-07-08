import assert from "node:assert/strict";
import { managementStatusFromCaseStatus } from "../server/src/modules/case-management-engine/types";

assert.equal(managementStatusFromCaseStatus("ARCHIVED"), "ARCHIVED");
assert.equal(managementStatusFromCaseStatus("SIGNED"), "SIGNED");
assert.equal(managementStatusFromCaseStatus("APPROVED"), "CONFIRMED");
assert.equal(managementStatusFromCaseStatus("FINALIZED"), "CONFIRMED");
assert.equal(managementStatusFromCaseStatus("REVIEWED"), "REVIEWED");
assert.equal(managementStatusFromCaseStatus("UNDER_REVIEW"), "PENDING_REVIEW");
assert.equal(managementStatusFromCaseStatus("AI_COMPLETED"), "PENDING_REVIEW");
assert.equal(managementStatusFromCaseStatus("UPLOADED"), "DRAFT");
assert.equal(managementStatusFromCaseStatus("NEW"), "DRAFT");

console.log("Sprint 60 case management unit tests: PASS");
