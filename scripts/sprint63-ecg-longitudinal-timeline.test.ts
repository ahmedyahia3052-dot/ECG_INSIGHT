import { detectTrendSnapshots, clinicalSignificanceFromTrends, summarizeTrends } from "../server/src/modules/ecg-longitudinal-timeline-engine/services/trend-analysis.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseline = {
  heartRate: 72,
  prInterval: 160,
  qrsDuration: 90,
  qtInterval: 380,
  qtcInterval: 410,
  axis: 30,
  stDeviation: 0,
  rhythm: "Sinus rhythm",
  diagnosis: "Normal ECG",
  interpretation: "No acute abnormality",
};

const worsened = {
  ...baseline,
  heartRate: 95,
  qtcInterval: 460,
  qrsDuration: 128,
  diagnosis: "Left bundle branch block",
  interpretation: "Wide QRS with LBBB pattern",
  rhythm: "Atrial fibrillation",
};

const trends = detectTrendSnapshots(worsened, baseline);
assert(trends.length >= 4, "Expected multiple trend detections.");
assert(trends.some((t) => t.trendType === "QT_PROLONGATION" || t.trendType === "QTC_PROLONGATION"), "Expected QT prolongation trend.");
assert(trends.some((t) => t.trendType === "QRS_WIDENING"), "Expected QRS widening trend.");
assert(trends.some((t) => t.trendType === "RHYTHM_EVOLUTION" || t.trendType === "AF_BURDEN"), "Expected rhythm evolution.");

const summary = summarizeTrends(trends);
assert(summary.length > 10, "Expected non-trivial trend summary.");
const significance = clinicalSignificanceFromTrends(trends);
assert(significance.includes("progression") || significance.includes("meaningful"), "Expected clinical significance.");

const stableTrends = detectTrendSnapshots(baseline, { ...baseline, heartRate: 74 });
assert(stableTrends.every((t) => t.direction === "STABLE"), "Minor HR change should remain stable.");

console.log("Sprint 63 ECG longitudinal trend engine unit tests: PASS");
