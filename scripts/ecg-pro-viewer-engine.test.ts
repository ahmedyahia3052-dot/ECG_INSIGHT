import assert from "node:assert/strict";

import { displayDimensions, fitZoomForViewport, rhythmStripMarkers, VIEWER_LAYER } from "../artifacts/ecg-insight/components/ecg/viewer/ecgViewerEngine";
import { resolveEcgMonitorScreenPhase } from "../artifacts/ecg-insight/components/ecg/viewer/ecgMonitorRoute";

const viewport = {
  containerHeight: 600,
  containerWidth: 800,
  imageHeight: 1200,
  imageWidth: 1600,
};

const rect = displayDimensions(viewport);
assert.equal(rect.scale, 0.5);
assert.equal(rect.displayWidth, 800);
assert.equal(rect.displayHeight, 600);
assert.equal(fitZoomForViewport(viewport, "width"), 1);
assert.equal(Number(fitZoomForViewport(viewport, "height").toFixed(3)), 1);
assert.equal(VIEWER_LAYER.measurements, 5);
assert.equal(rhythmStripMarkers(25).length, 26);
assert.equal(rhythmStripMarkers(50).length, 51);

assert.equal(
  resolveEcgMonitorScreenPhase({
    authLoading: false,
    caseId: "case-1",
    casePatientId: "patient-1",
    casePhase: "success",
    hasCase: true,
    hasPatient: false,
    patientPhase: "pending",
    token: "token",
  }),
  "patient-loading",
);
assert.equal(
  resolveEcgMonitorScreenPhase({
    authLoading: false,
    caseId: "case-1",
    casePatientId: undefined,
    casePhase: "pending",
    hasCase: false,
    hasPatient: false,
    patientPhase: "idle",
    token: "token",
  }),
  "case-loading",
);
assert.equal(
  resolveEcgMonitorScreenPhase({
    authLoading: true,
    caseId: "case-1",
    casePhase: "idle",
    hasCase: false,
    hasPatient: false,
    patientPhase: "idle",
    token: undefined,
  }),
  "auth-loading",
);

console.log("ecg-pro-viewer-engine.test.ts: all unit tests passed");
