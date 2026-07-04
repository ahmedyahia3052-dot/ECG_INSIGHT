import assert from "node:assert/strict";

import {
  buildReadouts,
  computeQtc,
  gridSpacingPx,
  heartRateFromRr,
  horizontalDeltaMs,
  imageDisplayRect,
  verticalDeltaMm,
  verticalDeltaMv,
} from "../artifacts/ecg-insight/components/ecg/viewer/ecgCalibrationMath";

assert.equal(gridSpacingPx(25, 10), 14);
assert.equal(gridSpacingPx(50, 10), 14 * 0.72);
assert.equal(horizontalDeltaMs(140, 25, 14), 400);
assert.equal(Number(horizontalDeltaMs(140, 50, 14 * 0.72).toFixed(1)), 277.8);
assert.equal(verticalDeltaMv(140, 10, 14), 1);
assert.equal(verticalDeltaMm(70, 14), 5);
assert.equal(heartRateFromRr(800), 75);
assert.equal(Number(computeQtc(400, 800).toFixed(1)), 447.2);

const rect = imageDisplayRect(800, 600, 1600, 1200);
assert.equal(rect.scale, 0.5);
assert.equal(rect.displayWidth, 800);
assert.equal(rect.displayHeight, 600);

const readouts = buildReadouts({
  deltaPx: 140,
  gain: 10,
  kind: "horizontal",
  spacing: 14,
  speed: 25,
});
assert.equal(readouts.milliseconds, 400);
assert.equal(readouts.smallBoxes, 10);
assert.equal(readouts.largeBoxes, 2);

console.log("ecg-calibration-math.test.ts: all unit tests passed");
