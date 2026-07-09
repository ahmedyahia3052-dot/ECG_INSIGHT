import assert from "node:assert/strict";

import { manualPayloadFromWorkspace } from "../artifacts/ecg-insight/components/ecg/viewer/pro-foundation/clinicalMeasurementMapper";
import { CLINICAL_MEASUREMENT_ENGINE_VERSION } from "../server/src/modules/clinical-measurement-engine/types";
import { createWorkspaceState } from "../artifacts/ecg-insight/components/ecg/viewer/measurementTypes";

const workspace = createWorkspaceState({
  measurements: [
    {
      approvalStatus: "pending",
      caliperId: "c1",
      confidence: null,
      end: { x: 10, y: 10 },
      id: "m1",
      kind: "pr_interval",
      name: "PR",
      operator: "Dr Test",
      start: { x: 0, y: 10 },
      timestamp: new Date().toISOString(),
      type: "PR Interval",
      unit: "ms",
      updatedAt: new Date().toISOString(),
      value: 160,
    },
  ],
});

const payload = manualPayloadFromWorkspace(workspace);
assert.equal(payload.prIntervalMs, 160);
assert.equal(CLINICAL_MEASUREMENT_ENGINE_VERSION, "sprint96-v1");

console.log("Sprint 96 clinical measurement engine unit tests: PASS");
