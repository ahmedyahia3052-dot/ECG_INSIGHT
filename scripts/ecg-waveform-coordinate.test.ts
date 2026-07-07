import assert from "node:assert/strict";

import { imagePointToWaveform, readoutsFromWaveformAnchors, waveformToImagePoint, waveformContextFromImage } from "../artifacts/ecg-insight/components/ecg/viewer/waveformCoordinateSpace";

const ctx = waveformContextFromImage({ customCalibration: false, gain: 10, speed: 25 }, 1200, 800, "II", 500);

const start = imagePointToWaveform({ x: 180, y: 420 }, ctx);
const end = imagePointToWaveform({ x: 380, y: 420 }, ctx);

assert.ok(end.timeMs > start.timeMs, "horizontal waveform delta should be positive");
const readouts = readoutsFromWaveformAnchors({ caliperKind: "horizontal", end, measurementKind: "pr_interval", start });
assert.ok((readouts.milliseconds ?? 0) > 0, "PR interval readout should be positive");

const roundTrip = waveformToImagePoint(start, ctx);
assert.ok(Math.abs(roundTrip.x - 180) < 80, "waveform round-trip X should remain in lead region");
assert.ok(Math.abs(roundTrip.y - 420) < 80, "waveform round-trip Y should remain in lead region");

console.log("waveform coordinate space tests: PASS");
