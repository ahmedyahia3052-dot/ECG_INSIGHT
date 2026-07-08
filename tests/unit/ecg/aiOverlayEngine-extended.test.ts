import { describe, expect, it } from "vitest";

import {
  deleteAnnotation,
  exportOverlayAnnotations,
  filterAnnotationsByLead,
  mergeGeneratedAnnotations,
  restoreOverlayState,
  serializeOverlayState,
  updateAnnotation,
} from "@/components/ecg/viewer/ecgAiOverlayEngine";
import type { EcgAiClinicalAnnotation, EcgAiOverlayState } from "@/components/ecg/viewer/aiOverlayTypes";

function annotation(overrides: Partial<EcgAiClinicalAnnotation>): EcgAiClinicalAnnotation {
  return {
    aiGenerated: true,
    confidence: 0.9,
    confirmed: false,
    coordinates: { height: 10, width: 20, x: 0, y: 0 },
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "AI",
    doctorEdited: false,
    evidence: ["ST elevation >= 1mm"],
    id: "a1",
    lead: "V2",
    locked: false,
    rejected: false,
    selected: false,
    type: "st_segment",
    updatedAt: "2026-01-01T00:00:00.000Z",
    visible: true,
    ...overrides,
  };
}

describe("ecgAiOverlayEngine state", () => {
  it("serializes and restores overlay state for workspace persistence", () => {
    const state: EcgAiOverlayState = {
      annotations: [annotation({ id: "a1" })],
      selectedAnnotationIds: ["a1"],
      settings: { enabled: true, fontScale: 1, opacity: 0.8, showAnnotations: true, showConfidence: true, showHeatmap: false, showLabels: true, theme: "clinical" },
      version: 1,
    };
    const serialized = serializeOverlayState(state);
    const restored = restoreOverlayState(serialized);
    expect(restored.annotations).toHaveLength(1);
    expect(restored.selectedAnnotationIds).toEqual(["a1"]);
  });

  it("returns defaults when restoring corrupt overlay payloads", () => {
    const restored = restoreOverlayState(null);
    expect(restored.annotations).toEqual([]);
    expect(restored.settings.showLabels).toBe(true);
  });

  it("updates and deletes annotations in overlay collections", () => {
    const list = [annotation({ id: "a1" }), annotation({ id: "a2", lead: "V3" })];
    const updated = updateAnnotation(list, "a1", { doctorNotes: "Edited" });
    expect(updated.find((a) => a.id === "a1")?.doctorNotes).toBe("Edited");
    expect(updated.find((a) => a.id === "a1")?.doctorEdited).toBe(true);
    expect(deleteAnnotation(list, "a2")).toHaveLength(1);
  });

  it("filters annotations by lead including rhythm strip alias", () => {
    const list = [annotation({ lead: "II" }), annotation({ id: "a2", lead: "V1" })];
    expect(filterAnnotationsByLead(list, "ALL")).toHaveLength(2);
    expect(filterAnnotationsByLead(list, "Rhythm Strip")).toHaveLength(1);
    expect(filterAnnotationsByLead(list, "V1")).toHaveLength(1);
  });

  it("merges generated findings without overwriting clinician-locked annotations", () => {
    const existing = [
      annotation({ id: "locked", doctorEdited: true, type: "st_segment", lead: "V2" }),
      annotation({ id: "open", type: "t_wave", lead: "V3" }),
    ];
    const generated = [
      annotation({ id: "gen1", type: "st_segment", lead: "V2" }),
      annotation({ id: "gen2", type: "qt_interval", lead: "II" }),
    ];
    const merged = mergeGeneratedAnnotations(existing, generated);
    expect(merged.find((a) => a.id === "locked")).toBeTruthy();
    expect(merged.some((a) => a.type === "qt_interval")).toBe(true);
    expect(merged.filter((a) => a.type === "st_segment" && a.lead === "V2")).toHaveLength(1);
  });

  it("exports overlay bundle for report generation", () => {
    const state: EcgAiOverlayState = {
      annotations: [annotation({ id: "a1" })],
      selectedAnnotationIds: [],
      settings: { enabled: true, fontScale: 1, opacity: 0.8, showAnnotations: true, showConfidence: true, showHeatmap: false, showLabels: true, theme: "clinical" },
      version: 1,
    };
    const bundle = exportOverlayAnnotations(state);
    expect(bundle.format).toBe("ecg-ai-overlay-v1");
    expect(bundle.annotations).toHaveLength(1);
    expect(bundle.exportedAt).toMatch(/^\d{4}-/);
  });
});
