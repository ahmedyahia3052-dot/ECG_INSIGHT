import assert from "node:assert/strict";

import {
  computeAngleDegrees,
  deltaPixelsForCaliper,
  polylineLength,
} from "../artifacts/ecg-insight/components/ecg/viewer/ecgCaliperGeometry";
import { resolveGridSpacing } from "../artifacts/ecg-insight/components/ecg/viewer/ecgCalibrationMath";
import {
  computeQtDispersion,
  exportMeasurements,
} from "../artifacts/ecg-insight/components/ecg/viewer/ecgMeasurementEngine";
import { evaluateMeasurementReference } from "../artifacts/ecg-insight/components/ecg/viewer/ecgMeasurementReference";
import { ECG_ZOOM_PRESETS } from "../artifacts/ecg-insight/components/ecg/viewer/ecgImageEngine";

const angle = computeAngleDegrees({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 });
assert.equal(angle, 90);

const multiLength = polylineLength([
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
]);
assert.equal(multiLength, 20);

const multiDelta = deltaPixelsForCaliper({
  color: "#2563EB",
  createdAt: new Date().toISOString(),
  end: { x: 10, y: 10 },
  hidden: false,
  id: "c1",
  kind: "multi",
  locked: false,
  snapToGrid: true,
  start: { x: 0, y: 0 },
  updatedAt: new Date().toISOString(),
  waypoints: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ],
});
assert.equal(multiDelta, 20);

const customSpacing = resolveGridSpacing({
  customCalibration: true,
  gain: 10,
  opacity: 0.75,
  pixelsPerSmallBox: 16,
  speed: 25,
  visible: true,
});
assert.equal(customSpacing, 16);

assert.deepEqual(ECG_ZOOM_PRESETS, [1, 2, 4, 8, 16]);

const evaluation = evaluateMeasurementReference("pr_interval", 180, "ms");
assert.equal(evaluation.status, "normal");

const dispersion = computeQtDispersion([
  {
    aiInterpretation: null,
    caliperId: "a",
    confidence: null,
    durationMs: 410,
    end: { x: 0, y: 0 },
    hidden: false,
    id: "m1",
    kind: "qt_interval",
    name: "QT",
    operator: "Clinician",
    readouts: {},
    start: { x: 0, y: 0 },
    timestamp: new Date().toISOString(),
    type: "QT Interval",
    unit: "ms",
    updatedAt: new Date().toISOString(),
    value: 410,
  },
  {
    aiInterpretation: null,
    caliperId: "b",
    confidence: null,
    durationMs: 430,
    end: { x: 0, y: 0 },
    hidden: false,
    id: "m2",
    kind: "qt_interval",
    name: "QT",
    operator: "Clinician",
    readouts: {},
    start: { x: 0, y: 0 },
    timestamp: new Date().toISOString(),
    type: "QT Interval",
    unit: "ms",
    updatedAt: new Date().toISOString(),
    value: 430,
  },
]);
assert.ok(dispersion);
assert.equal(dispersion?.value, 20);

const csvExport = exportMeasurements([], "csv") as { csv: string; format: string };
assert.equal(csvExport.format, "csv");
assert.ok(csvExport.csv.includes("name,type,kind"));

console.log("ecg-caliper-geometry.test.ts: all unit tests passed");
