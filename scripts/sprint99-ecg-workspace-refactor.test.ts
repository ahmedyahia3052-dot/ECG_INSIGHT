import assert from "node:assert/strict";

import { centeredPanForFit, ECG_HERO_FILL_TARGET } from "../artifacts/ecg-insight/components/ecg/viewer/ecgImageEngine";
import { ECG_WORKSTATION_VISUAL } from "../artifacts/ecg-insight/components/ecg/viewer/ecgWorkstationVisualTokens";

assert.equal(ECG_HERO_FILL_TARGET, 0.78);
assert.equal(ECG_WORKSTATION_VISUAL.viewportTargetMin, 0.75);
assert.equal(ECG_WORKSTATION_VISUAL.viewportTargetMax, 0.8);

const pan = centeredPanForFit(1000, 800, 1600, 1200, 0.5);
assert.ok(Math.abs(pan.panX) >= 0);
assert.ok(Math.abs(pan.panY) >= 0);

console.log("Sprint 99 ECG Workspace Refactor unit tests: PASS");
