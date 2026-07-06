import assert from "node:assert/strict";

import { buildAiVisualRegions } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/aiVisualization";
import { buildTimelineMarkers } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/clinicalTimeline";
import { computeCrosshairTelemetry } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/crosshairTelemetry";
import { cycleGridPreset, gridColorsForPreset, GRID_PRESET_COLORS } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/gridPresets";
import { applyLeadFocusRegions, toggleLeadFocus } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/leadFocus";
import { deriveSignalQualityFlags, signalQualityLabel } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/signalQuality";
import { DEFAULT_CLINICAL_SETTINGS } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/types";
import { resolveWaveformStyle } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/waveformStyle";
import { applyWheelZoom, easeOutCubic, lerpZoom } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/zoomPanEngine";
import { defaultViewport } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/pipeline";
import { buildTwelveLeadRegions } from "../artifacts/ecg-insight/components/ecg/viewer/rendering-engine/twelveLeadLayout";

assert.equal(Object.keys(GRID_PRESET_COLORS).length, 4);
assert.equal(cycleGridPreset("classic-paper"), "hospital-black");

const colors = gridColorsForPreset("hospital-black", 0.75, false);
assert.ok(colors.background === "#0A0A0A");

const style = resolveWaveformStyle(DEFAULT_CLINICAL_SETTINGS, "hospital-black", true, false);
assert.equal(style.traceColor, "#FACC15");

const regions = buildTwelveLeadRegions(1200, 900);
const focused = applyLeadFocusRegions(regions, "II", 1200, 900, 1);
assert.equal(focused.find((r) => r.lead === "II")?.dimmed, false);
assert.equal(focused.find((r) => r.lead === "I")?.dimmed, true);

const focusState = toggleLeadFocus({ activeLead: null, focused: false, progress: 0 }, "V1");
assert.equal(focusState.focused, true);

const digitalEcg = {
  calibration: { confidence: 0.9, gainMmPerMv: 10, gridDetected: true, paperSpeedMmPerSec: 25 },
  leads: [{ durationSeconds: 10, lead: "II", samples: Array.from({ length: 5000 }, (_, i) => Math.sin(i / 20)), samplingRate: 500 }],
  leadSegments: [],
  measurementEngine: null,
  preprocessing: null,
  quality: { score: 45, warnings: ["High noise detected", "Baseline wander"] },
  status: "available" as const,
  validation: { warnings: ["powerline 50hz"] },
};

const flags = deriveSignalQualityFlags(digitalEcg);
assert.ok(flags.length >= 2);
assert.ok(signalQualityLabel(flags).length > 0);

const markers = buildTimelineMarkers(digitalEcg.leads[0]!, ["STEMI suspicion"]);
assert.ok(markers.length > 0);

const aiRegions = buildAiVisualRegions(
  { heatmap: { format: "points", points: [] }, leadHighlights: [{ confidence: 0.82, finding: "ST elevation", lead: "V2", reason: "AI" }], panel: [] },
  10_000,
);
assert.equal(aiRegions.length, 1);

const viewport = defaultViewport(1920, 1080);
const telemetry = computeCrosshairTelemetry(100, 100, regions, digitalEcg, { gain: 10, opacity: 0.75, speed: 25, visible: true }, viewport);
assert.ok(telemetry.milliseconds >= 0);

assert.ok(applyWheelZoom(120) < 1);
assert.ok(applyWheelZoom(-120) > 1);
assert.ok(lerpZoom(1, 2) > 1);
assert.ok(easeOutCubic(0.5) > 0);

console.log("ecg-clinical-visualization.test.ts: all Sprint 28 unit tests passed");
