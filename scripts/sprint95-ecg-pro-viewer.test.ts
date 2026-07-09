import assert from "node:assert/strict";

import { buildDigitalEcgFromWaveforms } from "../artifacts/ecg-insight/components/ecg/viewer/pro-foundation/digitalEcgFromWaveform";
import { ECG_PRO_VIEWER_THEMES } from "../artifacts/ecg-insight/components/ecg/viewer/pro-foundation/types";

const digital = buildDigitalEcgFromWaveforms(
  [
    {
      caseId: "case-1",
      durationSeconds: 10,
      ecgFileId: "file-1",
      lead: "II",
      samples: [0, 0.1, 0.2, 0.1, 0],
      samplingRate: 500,
    },
  ],
  { gain: 10, speed: 25 },
);

assert.ok(digital);
assert.equal(digital?.leads.length, 1);
assert.equal(digital?.calibration.gainMmPerMv, 10);
assert.equal(digital?.calibration.paperSpeedMmPerSec, 25);
assert.equal(ECG_PRO_VIEWER_THEMES.dark.grid.major, "#E36A6A");

console.log("Sprint 95 ECG Pro Viewer unit tests: PASS");
