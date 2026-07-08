import type { ECGTrendDirection } from "@prisma/client";
import type { TrendSnapshotDto } from "../types";

type MetricInput = {
  heartRate?: number | null;
  prInterval?: number | null;
  qrsDuration?: number | null;
  qtInterval?: number | null;
  qtcInterval?: number | null;
  axis?: number | null;
  stDeviation?: number | null;
  rhythm?: string | null;
  diagnosis?: string | null;
  interpretation?: string | null;
};

function directionFromDelta(delta: number, threshold: number, higherIsWorse = true): ECGTrendDirection {
  if (Math.abs(delta) < threshold) return "STABLE";
  if (higherIsWorse) return delta > 0 ? "WORSENING" : "IMPROVING";
  return delta > 0 ? "IMPROVING" : "WORSENING";
}

function containsAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function compareNumericTrend(
  trendType: string,
  metric: string,
  unit: string,
  current: number | null | undefined,
  previous: number | null | undefined,
  threshold: number,
  higherIsWorse = true,
  significanceLabel?: string,
): TrendSnapshotDto | null {
  if (current == null || previous == null) return null;
  const delta = current - previous;
  const direction = directionFromDelta(delta, threshold, higherIsWorse);
  const statement =
    direction === "STABLE"
      ? `No significant ${metric} change (${previous}${unit} to ${current}${unit}).`
      : direction === "WORSENING"
        ? `Progressive ${metric} change detected (${previous}${unit} to ${current}${unit}, delta ${delta > 0 ? "+" : ""}${delta}${unit}).`
        : `Improved ${metric} compared with previous ECG (${previous}${unit} to ${current}${unit}).`;

  return {
    trendType,
    direction,
    metric,
    currentValue: current,
    previousValue: previous,
    delta,
    threshold,
    statement,
    significance: significanceLabel ?? (direction === "WORSENING" ? "clinically_significant" : direction === "STABLE" ? "none" : "favorable"),
  };
}

function textBlob(input: MetricInput) {
  return `${input.diagnosis ?? ""} ${input.interpretation ?? ""} ${input.rhythm ?? ""}`.toLowerCase();
}

export function detectTrendSnapshots(current: MetricInput, previous: MetricInput): TrendSnapshotDto[] {
  const trends: TrendSnapshotDto[] = [];

  const metricTrends = [
    compareNumericTrend("HEART_RATE_TREND", "heart rate", " bpm", current.heartRate, previous.heartRate, 10, true),
    compareNumericTrend("PR_INTERVAL_PROGRESSION", "PR interval", " ms", current.prInterval, previous.prInterval, 20, true),
    compareNumericTrend("QRS_WIDENING", "QRS duration", " ms", current.qrsDuration, previous.qrsDuration, 10, true, "conduction_progression"),
    compareNumericTrend("QT_PROLONGATION", "QT interval", " ms", current.qtInterval, previous.qtInterval, 20, true, "repolarization_risk"),
    compareNumericTrend("QTC_PROLONGATION", "QTc interval", " ms", current.qtcInterval, previous.qtcInterval, 20, true, "repolarization_risk"),
    compareNumericTrend("AXIS_DEVIATION", "electrical axis", "°", current.axis, previous.axis, 15, true),
    compareNumericTrend("INTERVAL_PROGRESSION", "composite intervals", " ms", current.qtcInterval, previous.qtcInterval, 15, true),
    compareNumericTrend("MEASUREMENT_PROGRESSION", "heart rate", " bpm", current.heartRate, previous.heartRate, 5, true),
  ].filter((entry): entry is TrendSnapshotDto => entry !== null);

  trends.push(...metricTrends);

  const currentText = textBlob(current);
  const previousText = textBlob(previous);

  if (containsAny(currentText, ["st elevation", "stemi"]) && !containsAny(previousText, ["st elevation", "stemi"])) {
    trends.push({
      trendType: "ST_WORSENING",
      direction: "WORSENING",
      metric: "st_segment",
      currentValue: current.stDeviation ?? null,
      previousValue: previous.stDeviation ?? null,
      delta: null,
      threshold: null,
      statement: "ST elevation pattern appears new or worsened compared with previous ECG.",
      significance: "acute_ischemia_signal",
    });
  } else if (!containsAny(currentText, ["st elevation", "stemi", "st depression"]) && containsAny(previousText, ["st elevation", "stemi", "st depression"])) {
    trends.push({
      trendType: "ST_IMPROVEMENT",
      direction: "IMPROVING",
      metric: "st_segment",
      currentValue: current.stDeviation ?? null,
      previousValue: previous.stDeviation ?? null,
      delta: null,
      threshold: null,
      statement: "Improved ST segment pattern compared with previous ECG.",
      significance: "favorable",
    });
  } else if (containsAny(currentText, ["st depression"]) && !containsAny(previousText, ["st depression"])) {
    trends.push({
      trendType: "ST_WORSENING",
      direction: "WORSENING",
      metric: "st_segment",
      currentValue: current.stDeviation ?? null,
      previousValue: previous.stDeviation ?? null,
      delta: null,
      threshold: null,
      statement: "New ST depression compared with previous ECG.",
      significance: "ischemia_signal",
    });
  }

  const afNow = containsAny(currentText, ["atrial fibrillation", " af "]);
  const afBefore = containsAny(previousText, ["atrial fibrillation", " af "]);
  if (afNow && afBefore) {
    trends.push({
      trendType: "AF_BURDEN",
      direction: "STABLE",
      metric: "rhythm",
      currentValue: null,
      previousValue: null,
      delta: null,
      threshold: null,
      statement: "Persistent atrial fibrillation across serial ECGs.",
      significance: "persistent_arrhythmia",
    });
  } else if (afNow && !afBefore) {
    trends.push({
      trendType: "RHYTHM_EVOLUTION",
      direction: "NEW",
      metric: "rhythm",
      currentValue: null,
      previousValue: null,
      delta: null,
      threshold: null,
      statement: "Rhythm evolved to atrial fibrillation compared with previous ECG.",
      significance: "new_arrhythmia",
    });
  } else if (current.rhythm && previous.rhythm && current.rhythm !== previous.rhythm) {
    trends.push({
      trendType: "RHYTHM_EVOLUTION",
      direction: "INDETERMINATE",
      metric: "rhythm",
      currentValue: null,
      previousValue: null,
      delta: null,
      threshold: null,
      statement: `Rhythm changed from ${previous.rhythm} to ${current.rhythm}.`,
      significance: "rhythm_change",
    });
  }

  if (containsAny(currentText, ["pvc", "ventricular ectopy", "frequent pvc"]) || containsAny(previousText, ["pvc", "ventricular ectopy"])) {
    trends.push({
      trendType: "PVC_BURDEN",
      direction: containsAny(currentText, ["pvc", "ventricular ectopy"]) ? (containsAny(previousText, ["pvc"]) ? "STABLE" : "NEW") : "RESOLVED",
      metric: "ectopy",
      currentValue: null,
      previousValue: null,
      delta: null,
      threshold: null,
      statement: containsAny(currentText, ["pvc"]) ? "PVC burden noted on serial comparison." : "Prior PVC burden not evident on current ECG.",
      significance: "ectopy_tracking",
    });
  }

  if (containsAny(currentText, ["bundle branch", "lbbb", "rbbb"]) && containsAny(previousText, ["bundle branch", "conduction"])) {
    trends.push({
      trendType: "BUNDLE_BRANCH_PROGRESSION",
      direction: "WORSENING",
      metric: "qrs_conduction",
      currentValue: current.qrsDuration ?? null,
      previousValue: previous.qrsDuration ?? null,
      delta: current.qrsDuration != null && previous.qrsDuration != null ? current.qrsDuration - previous.qrsDuration : null,
      threshold: 10,
      statement: "Bundle branch or conduction disease progression signal across serial ECGs.",
      significance: "conduction_progression",
    });
  }

  if (containsAny(currentText, ["lvh", "left ventricular hypertrophy"]) && containsAny(previousText, ["lvh", "left ventricular hypertrophy"])) {
    trends.push({
      trendType: "LVH_PROGRESSION",
      direction: "STABLE",
      metric: "hypertrophy",
      currentValue: null,
      previousValue: null,
      delta: null,
      threshold: null,
      statement: "LVH pattern persists across historical ECG interpretations.",
      significance: "structural_persistence",
    });
  } else if (containsAny(currentText, ["lvh", "left ventricular hypertrophy"]) && !containsAny(previousText, ["lvh"])) {
    trends.push({
      trendType: "LVH_PROGRESSION",
      direction: "NEW",
      metric: "hypertrophy",
      currentValue: null,
      previousValue: null,
      delta: null,
      threshold: null,
      statement: "Possible LVH progression — hypertrophy criteria newly met.",
      significance: "structural_progression",
    });
  }

  return trends;
}

export function summarizeTrends(trends: TrendSnapshotDto[]): string {
  if (trends.length === 0) return "No significant interval changes.";
  const worsening = trends.filter((t) => t.direction === "WORSENING" || t.direction === "NEW");
  if (worsening.length > 0) return worsening[0]!.statement;
  const improving = trends.find((t) => t.direction === "IMPROVING" || t.direction === "RESOLVED");
  if (improving) return improving.statement;
  return trends[0]!.statement;
}

export function clinicalSignificanceFromTrends(trends: TrendSnapshotDto[]): string {
  if (trends.some((t) => t.significance === "acute_ischemia_signal" || t.trendType === "ST_WORSENING")) {
    return "Possible disease progression — urgent clinical correlation recommended.";
  }
  if (trends.some((t) => t.direction === "WORSENING" || t.direction === "NEW")) {
    return "Clinically meaningful serial ECG change detected.";
  }
  if (trends.every((t) => t.direction === "STABLE")) {
    return "No significant interval changes.";
  }
  return "Mixed serial ECG changes — review with clinical context.";
}
