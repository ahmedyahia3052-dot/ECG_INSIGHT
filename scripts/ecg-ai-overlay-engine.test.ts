import assert from "node:assert/strict";

import {
  annotationTypeLabel,
  buildAiClinicalAnnotations,
  confidenceColor,
  confidencePercent,
  confidenceTone,
  exportOverlayAnnotations,
  leadRegionInImage,
  restoreOverlayState,
} from "../artifacts/ecg-insight/components/ecg/viewer/ecgAiOverlayEngine";
import { DEFAULT_AI_OVERLAY_SETTINGS } from "../artifacts/ecg-insight/components/ecg/viewer/aiOverlayTypes";

const ecgCase = {
  confidenceScore: 0.91,
  heartRate: 78,
  id: "case-1",
  prInterval: 168,
  qrsDuration: 92,
  qtInterval: 392,
  qtcInterval: 418,
  rhythm: "Normal Sinus Rhythm",
} as never;

const annotations = buildAiClinicalAnnotations({
  ecgCase,
  explainability: {
    heatmap: {
      format: "normalized-grid-v1",
      points: [
        { intensity: 0.88, lead: "II", x: 1, y: 0 },
        { intensity: 0.42, lead: "V1", x: 0, y: 1 },
      ],
    },
    leadHighlights: [{ confidence: 0.91, finding: "ST Elevation", lead: "II", reason: "Territorial ST deviation." }],
    panel: [{ label: "Confidence", value: "91%" }],
  },
  imageHeight: 1200,
  imageWidth: 1600,
});

assert.ok(annotations.length >= 8, "expected clinical annotation set");
assert.equal(annotationTypeLabel("pr_interval"), "PR Interval");
assert.equal(confidencePercent(0.91), 91);
assert.equal(confidenceTone(96), "very-high");
assert.equal(confidenceTone(82), "high");
assert.equal(confidenceTone(58), "moderate");
assert.equal(confidenceTone(40), "low");
assert.equal(confidenceColor(96), "#22C55E");
assert.equal(confidenceColor(82), "#EAB308");
assert.equal(confidenceColor(58), "#F97316");
assert.equal(confidenceColor(40), "#EF4444");

const region = leadRegionInImage("V1", 1600, 1200);
assert.ok(region.width > 0 && region.height > 0);

const exported = exportOverlayAnnotations({
  annotations,
  selectedAnnotationIds: [annotations[0]!.id],
  settings: DEFAULT_AI_OVERLAY_SETTINGS,
  version: 1,
});
assert.equal(exported.format, "ecg-ai-overlay-v1");

const restored = restoreOverlayState({ settings: { enabled: true } });
assert.equal(restored.settings.enabled, true);

console.log("ecg-ai-overlay-engine.test.ts: all unit tests passed");
