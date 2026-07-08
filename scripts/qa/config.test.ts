import assert from "node:assert/strict";

import { THRESHOLDS, WORKFLOW_MATRIX } from "./config.mjs";

assert.equal(WORKFLOW_MATRIX.length, 28, "workflow matrix must cover 28 critical enterprise workflows");
assert.ok(THRESHOLDS.coverageTargetPct >= 95, "coverage target must be 95%+");
assert.ok(WORKFLOW_MATRIX.every((w) => w.id && w.label && w.specs?.length), "each workflow needs id, label, specs");

const ids = new Set(WORKFLOW_MATRIX.map((w) => w.id));
assert.equal(ids.size, WORKFLOW_MATRIX.length, "workflow ids must be unique");

console.log("scripts/qa/config.test.ts: all QA config unit tests passed");
