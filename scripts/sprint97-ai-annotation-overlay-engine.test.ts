import assert from "node:assert/strict";
import {
  AI_ANNOTATION_OVERLAY_ENGINE_VERSION,
  AI_OVERLAY_EXPORT_FORMAT,
  AI_OVERLAY_LAYER_ORDER,
  ABNORMALITY_COLORS,
} from "../server/src/modules/ai-annotation-overlay-engine/types";
import {
  DEFAULT_AI_OVERLAY_LAYER_CONFIG,
  emptyWorkspace,
} from "../server/src/modules/ai-annotation-overlay-engine/dto";
import {
  buildMeasurementOverlayAnnotations,
  confidencePercent,
  leadRegionInImage,
  mergeOverlayAnnotations,
} from "../server/src/modules/ai-annotation-overlay-engine/overlay-builder";
import { renderMultiLayerOverlay } from "../server/src/modules/ai-annotation-overlay-engine/layer-renderer";
import { validateLayerConfig, validateOverlayWorkspace } from "../server/src/modules/ai-annotation-overlay-engine/validators";

assert.equal(AI_ANNOTATION_OVERLAY_ENGINE_VERSION, "sprint97-ai-overlay-v1");
assert.equal(AI_OVERLAY_EXPORT_FORMAT, "ecg-ai-overlay-v1");
assert.equal(AI_OVERLAY_LAYER_ORDER.length, 9);
assert.equal(ABNORMALITY_COLORS.critical, "#EF4444");

const region = leadRegionInImage("II", 1600, 1200);
assert.ok(region.width > 0);
assert.ok(region.height > 0);

assert.equal(confidencePercent(0.88), 88);
assert.equal(confidencePercent(92), 92);

const generated = buildMeasurementOverlayAnnotations({
  createdBy: "test-user",
  ecgCase: {
    aiDiagnosis: "Normal Sinus Rhythm",
    caseId: "CASE-1",
    confidenceScore: 0.91,
    finalDiagnosis: null,
    heartRate: 72,
    id: "c1",
    prInterval: 160,
    recommendations: null,
  } as never,
  imageHeight: 1200,
  imageWidth: 1600,
  measurement: {
    heartRate: 72,
    prInterval: 160,
    qrsDuration: 90,
    qtInterval: 390,
    qtcInterval: 410,
    stDeviation: 0,
  } as never,
});

assert.ok(generated.length >= 8);
assert.ok(generated.some((item) => item.type === "p_wave"));
assert.ok(generated.some((item) => item.type === "qrs_complex"));
assert.ok(generated.some((item) => item.type === "qt_interval"));
assert.ok(generated.some((item) => item.type === "st_segment"));

const merged = mergeOverlayAnnotations(generated, generated);
assert.equal(merged.length, generated.length);

const workspace = {
  ...emptyWorkspace(),
  annotations: generated,
};
const validation = validateOverlayWorkspace(workspace);
assert.equal(validation.valid, true);

const layerValidation = validateLayerConfig(DEFAULT_AI_OVERLAY_LAYER_CONFIG);
assert.equal(layerValidation.valid, true);

const render = renderMultiLayerOverlay({
  annotations: generated,
  caseId: "c1",
  layerConfig: DEFAULT_AI_OVERLAY_LAYER_CONFIG,
});
assert.ok(render.layers.length > 0);
assert.ok(render.layers.some((layer) => layer.key === "p_wave_markers" || layer.key === "measurement_labels"));

console.log("Sprint 97 AI Annotation Overlay Engine unit tests: PASS");
