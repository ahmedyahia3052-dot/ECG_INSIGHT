import assert from "node:assert/strict";

import { computeQtc, buildReadouts } from "../artifacts/ecg-insight/components/ecg/viewer/ecgCalibrationMath";
import {
  CLINICAL_MEASUREMENT_PRESETS,
  createMeasurementInput,
  exportMeasurements,
  presetForKind,
  resolveLatestRrMs,
  syncWorkspaceMeasurements,
} from "../artifacts/ecg-insight/components/ecg/viewer/ecgMeasurementEngine";
import { createWorkspaceState, migrateWorkspaceState } from "../artifacts/ecg-insight/components/ecg/viewer/measurementTypes";

assert.equal(CLINICAL_MEASUREMENT_PRESETS.length, 9);
assert.equal(presetForKind("pr_interval").label, "PR");
assert.equal(presetForKind("qtc").caliperKind, "horizontal");

const { caliper, measurement } = createMeasurementInput({
  caliperKind: "horizontal",
  createdBy: "Dr. QA",
  end: { x: 150, y: 100 },
  gain: 10,
  kind: "rr_interval",
  lead: "II",
  spacing: 14,
  speed: 25,
  start: { x: 50, y: 100 },
});
assert.equal(caliper.color, presetForKind("rr_interval").color);
assert.equal(measurement.lead, "II");
assert.ok(measurement.durationMs != null && measurement.durationMs > 0);

const rrMs = resolveLatestRrMs(
  [
    {
      ...caliper,
      end: { x: 150, y: 100 },
      hidden: false,
      id: "caliper-rr",
      kind: "horizontal",
      measurementKind: "rr_interval",
      start: { x: 50, y: 100 },
    },
  ],
  14,
  25,
);
assert.ok(rrMs && rrMs > 0);

const workspace = createWorkspaceState({
  calipers: [
    {
      ...caliper,
      end: { x: 150, y: 100 },
      id: "caliper-rr",
      measurementKind: "rr_interval",
      start: { x: 50, y: 100 },
    },
    {
      ...caliper,
      color: presetForKind("qtc").color,
      end: { x: 120, y: 100 },
      id: "caliper-qt",
      measurementKind: "qtc",
      start: { x: 50, y: 100 },
    },
  ],
});
const syncedRrMs = resolveLatestRrMs(workspace.calipers, 14, 25);
assert.ok(syncedRrMs && syncedRrMs > 0);
const synced = syncWorkspaceMeasurements(workspace.calipers, [], { gain: 10, operator: "Dr. QA", speed: 25 });
assert.equal(synced.length, 2);
const qtc = synced.find((item) => item.kind === "qtc");
assert.ok(qtc);
assert.ok((qtc?.durationMs ?? 0) > 0);

const qtcReadouts = buildReadouts({
  deltaPx: 140,
  gain: 10,
  kind: "horizontal",
  measurementKind: "qtc",
  rrMs: 800,
  spacing: 14,
  speed: 25,
});
assert.equal(qtcReadouts.milliseconds, Number(computeQtc(400, 800).toFixed(1)));

const migrated = migrateWorkspaceState({ ...workspace, version: 2 as never });
assert.equal(migrated.version, 4);
assert.equal(migrated.activeLead, "II");

const jsonExport = exportMeasurements(synced, "json") as { schemaVersion: number };
assert.equal(jsonExport.schemaVersion, 3);
const fhirExport = exportMeasurements(synced, "fhir") as { resourceType: string };
assert.equal(fhirExport.resourceType, "Bundle");
const hl7Export = exportMeasurements(synced, "hl7") as { segments: string[] };
assert.ok(hl7Export.segments.length >= 2);

console.log("ecg-measurement-engine.test.ts: all unit tests passed");
