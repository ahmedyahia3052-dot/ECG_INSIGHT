import assert from "node:assert/strict";

import { buildClinicalMeasurementCards, bundleSeedFromMeasurements } from "../artifacts/ecg-insight/components/ecg/viewer/pro-foundation/clinicalMeasurementCards";
import { formatCompareMetric } from "../artifacts/ecg-insight/components/ecg/viewer/pro-foundation/compareMetricLabels";
import { buildDigitalEcgFromWaveforms } from "../artifacts/ecg-insight/components/ecg/viewer/pro-foundation/digitalEcgFromWaveform";

const cards = buildClinicalMeasurementCards({
  bundleSeed: bundleSeedFromMeasurements({
    heartRate: 72,
    prIntervalMs: 160,
    qrsDurationMs: 92,
    qtIntervalMs: 410,
    qtcIntervalMs: 430,
    rrIntervalMs: 830,
    stDeviationMm: 1.2,
    electricalAxisDeg: 58,
  }),
  record: null,
});

assert.equal(cards.length, 10);
assert.equal(cards.find((card) => card.id === "hr")?.value, "72 bpm");
assert.equal(cards.find((card) => card.id === "axis")?.value, "58°");
assert.match(formatCompareMetric("heartRate", 6), /Heart Rate: \+6 bpm/);

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
  {
    aiDiagnosis: "Normal sinus rhythm",
    confidence: 0.91,
    heartRate: 72,
    prIntervalMs: 160,
    qrsDurationMs: 92,
    qtIntervalMs: 410,
    qtcIntervalMs: 430,
  },
);

assert.ok(digital);
assert.equal(digital?.measurementEngine.heartRate, 72);
assert.equal(digital?.aiDiagnosis.primaryDiagnosis, "Normal sinus rhythm");
assert.equal(digital?.measurements.prIntervalMs, 160);

console.log("Sprint 101 ECG Pro Viewer unit tests: PASS");
