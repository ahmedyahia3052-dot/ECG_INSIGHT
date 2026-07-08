import { describe, expect, it } from "vitest";

import {
  CLINICAL_MEASUREMENT_PRESETS,
  computeQtDispersion,
  deleteMeasurementFromState,
  enrichMeasurement,
  exportMeasurements,
  presetForKind,
  restoreMeasurement,
  serializeMeasurement,
} from "@/components/ecg/viewer/ecgMeasurementEngine";
import { createWorkspaceState } from "@/components/ecg/viewer/measurementTypes";
import type { EcgClinicalMeasurement } from "@/components/ecg/viewer/measurementTypes";

function qtMeasurement(id: string, durationMs: number): EcgClinicalMeasurement {
  return {
    caliperId: id,
    confidence: null,
    durationMs,
    end: { x: 10, y: 0 },
    hidden: false,
    id,
    kind: "qt_interval",
    name: "QT",
    operator: "QA",
    start: { x: 0, y: 0 },
    timestamp: "2026-01-01T00:00:00.000Z",
    type: "QT Interval",
    unit: "ms",
    updatedAt: "2026-01-01T00:00:00.000Z",
    value: durationMs,
  };
}

describe("ecgMeasurementEngine extended", () => {
  it("exposes clinical measurement presets for caliper tools", () => {
    expect(CLINICAL_MEASUREMENT_PRESETS.some((p) => p.kind === "qrs_duration")).toBe(true);
    expect(presetForKind("qt_interval").label).toBe("QT");
  });

  it("computes QT dispersion when multiple QT intervals exist", () => {
    const dispersion = computeQtDispersion([qtMeasurement("a", 380), qtMeasurement("b", 420)]);
    expect(dispersion?.kind).toBe("qt_dispersion");
    expect(dispersion?.value).toBe(40);
    expect(computeQtDispersion([qtMeasurement("a", 380)])).toBeNull();
  });

  it("enriches measurements with reference ranges", () => {
    const enriched = enrichMeasurement(
      {
        caliperId: "c1",
        confidence: null,
        end: { x: 10, y: 0 },
        hidden: false,
        id: "m1",
        kind: "heart_rate",
        name: "HR",
        operator: "QA",
        start: { x: 0, y: 0 },
        timestamp: "2026-01-01T00:00:00.000Z",
        type: "Heart Rate",
        unit: "bpm",
        updatedAt: "2026-01-01T00:00:00.000Z",
        value: 180,
      },
      { gain: 10, spacing: 14, speed: 25 },
    );
    expect(enriched.referenceRange).toContain("bpm");
    expect(enriched.clinicalSignificance).toContain("180");
  });

  it("serializes and restores measurement payloads for import/export", () => {
    const original = qtMeasurement("m1", 390);
    const serialized = serializeMeasurement(original);
    const restored = restoreMeasurement(serialized, "c1", "Dr. QA");
    expect(restored.kind).toBe("qt_interval");
    expect(restored.caliperId).toBe("c1");
    expect(restored.value).toBe(390);
  });

  it("exports measurements in JSON, CSV, FHIR, and HL7 formats", () => {
    const measurements = [qtMeasurement("m1", 390)];
    const json = exportMeasurements(measurements, "json") as { format: string };
    expect(json.format).toBe("json");
    const csvBundle = exportMeasurements(measurements, "csv") as { csv: string };
    expect(csvBundle.csv).toContain("QT Interval");
    const fhir = exportMeasurements(measurements, "fhir") as { resourceType: string };
    expect(fhir.resourceType).toBe("Bundle");
    const hl7 = exportMeasurements(measurements, "hl7") as { segments: string[] };
    expect(hl7.segments[0]).toContain("OBX|");
  });

  it("deletes measurements and linked calipers from workspace state", () => {
    const state = createWorkspaceState({
      calipers: [{ id: "c1", color: "#2563EB", createdAt: "2026-01-01T00:00:00.000Z", createdBy: "QA", end: { x: 1, y: 0 }, hidden: false, kind: "horizontal", start: { x: 0, y: 0 }, updatedAt: "2026-01-01T00:00:00.000Z" }],
      measurements: [{ ...qtMeasurement("m1", 390), caliperId: "c1" }],
      selectedCaliperId: "c1",
      selectedMeasurementId: "m1",
    });
    const next = deleteMeasurementFromState(state, "m1");
    expect(next.measurements).toHaveLength(0);
    expect(next.calipers).toHaveLength(0);
    expect(next.selectedMeasurementId).toBeNull();
  });
});
