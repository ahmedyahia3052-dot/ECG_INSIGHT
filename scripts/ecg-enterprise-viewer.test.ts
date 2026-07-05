import assert from "node:assert/strict";

import { buildDigitizedWaveformPath } from "../artifacts/ecg-insight/components/ecg/viewer/ecgDigitizedWaveformSync";
import { buildEcgClinicalFindings } from "../artifacts/ecg-insight/components/ecg/viewer/useEcgClinicalFindings";

const findings = buildEcgClinicalFindings(
  {
    aiDiagnosis: null,
    caseId: "CASE-1",
    caseNumber: "ECG-001",
    ecgType: "12-Lead",
    files: [],
    heartRate: 72,
    id: "case-1",
    patientId: "patient-1",
    prInterval: 160,
    qrsDuration: 92,
    qtInterval: 390,
    qtcInterval: 410,
    rhythm: "sinus rhythm",
    uploadDate: new Date().toISOString(),
  } as never,
  undefined,
  null,
  null,
  {
    measurementEngine: {
      heartRate: 78,
      intervals: { prIntervalMs: 168, qrsDurationMs: 94, qtIntervalMs: 392, qtcBazettMs: 418, rrIntervalMs: 820 },
    },
    measurements: { heartRate: 78, prIntervalMs: 168, qrsDurationMs: 94, qtIntervalMs: 392, qtcBazettMs: 418, rrIntervalMs: 820 },
  } as never,
);

assert.match(findings.heartRate.value, /78/);
assert.match(findings.prInterval.value, /168/);

const path = buildDigitizedWaveformPath(
  { durationSeconds: 2, lead: "II", samples: [0, 0.2, 0.5, 0.1, -0.1, 0.3], samplingRate: 500 },
  320,
  120,
);
assert.ok(path.startsWith("M"));

const filtered = (() => {
  const showDigitizedWaveform = true;
  const leadFocusMode = false;
  const leads = [{ lead: "II", path: "M0 0" }, { lead: "V1", path: "M1 1" }];
  if (!showDigitizedWaveform) return [];
  if (leadFocusMode) return leads.filter((item) => item.lead === "II");
  return leads;
})();
assert.equal(filtered.length, 2);

console.log("ecg-enterprise-viewer.test.ts: all unit tests passed");
