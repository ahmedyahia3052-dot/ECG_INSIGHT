import assert from "node:assert/strict";
import { ECG_PRO_VIEWER_THEMES } from "../artifacts/ecg-insight/components/ecg/viewer/pro-foundation/types";

assert.equal(ECG_PRO_VIEWER_THEMES.dark.grid.major, "#E36A6A");
assert.equal(ECG_PRO_VIEWER_THEMES.light.background, "#F8FAFC");
assert.ok(ECG_PRO_VIEWER_THEMES.dark.toolbar);

console.log("Sprint 93 ECG Pro Viewer foundation unit tests: PASS");
