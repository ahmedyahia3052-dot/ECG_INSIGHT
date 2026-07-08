import type { EcgMeasurementBundleDto, MeasurementValidationIssue, MeasurementValidationResult } from "../types";
import { MEASUREMENT_REFERENCE_RANGES } from "./reference-ranges";

function classify(field: string, value: number): MeasurementValidationIssue | null {
  const range = MEASUREMENT_REFERENCE_RANGES[field];
  if (!range) return null;

  let severity: MeasurementValidationIssue["severity"] = "normal";
  let message = `${field} within normal limits`;

  if (range.criticalMin !== undefined && value < range.criticalMin) {
    severity = "critical";
    message = `${field} critically low (${value}${range.unit})`;
  } else if (range.criticalMax !== undefined && value > range.criticalMax) {
    severity = "critical";
    message = `${field} critically high (${value}${range.unit})`;
  } else if (value < range.normalMin) {
    severity = range.borderlineMin !== undefined && value >= range.borderlineMin ? "borderline" : "abnormal";
    message = `${field} below normal (${value}${range.unit})`;
  } else if (value > range.normalMax) {
    severity = range.borderlineMax !== undefined && value <= range.borderlineMax ? "borderline" : "abnormal";
    message = `${field} above normal (${value}${range.unit})`;
  }

  if (severity === "normal") return null;

  return {
    code: `${field}_${severity}`,
    field,
    message,
    severity,
    value,
  };
}

/** Validate computed measurement bundle against clinical reference ranges. */
export function validateMeasurementBundle(bundle: EcgMeasurementBundleDto): MeasurementValidationResult {
  const issues: MeasurementValidationIssue[] = [];

  const scalarChecks: Array<[string, number]> = [
    ["heartRateBpm", bundle.heartRate.heartRateBpm],
    ["rrIntervalMs", bundle.heartRate.rrIntervalMs],
    ["prIntervalMs", bundle.intervals.prIntervalMs],
    ["pDurationMs", bundle.intervals.pDurationMs],
    ["qrsDurationMs", bundle.intervals.qrsDurationMs],
    ["qtIntervalMs", bundle.intervals.qtIntervalMs],
    ["qtcBazettMs", bundle.intervals.qtcBazettMs],
    ["electricalAxisDeg", bundle.axis.electricalAxisDeg],
    ["pWaveAmplitudeMv", bundle.amplitudes.pWaveAmplitudeMv],
    ["stElevationMm", bundle.stSegment.stElevationMm],
    ["stDepressionMm", bundle.stSegment.stDepressionMm],
    ["jPointMm", bundle.stSegment.jPointMm],
  ];

  for (const [field, value] of scalarChecks) {
    const issue = classify(field, value);
    if (issue) issues.push(issue);
  }

  if (bundle.progression.rProgression === "poor" || bundle.progression.rProgression === "reverse") {
    issues.push({
      code: "r_progression_abnormal",
      field: "rProgression",
      message: `R wave progression ${bundle.progression.rProgression}`,
      severity: "abnormal",
      value: 0,
    });
  }

  if (bundle.voltageCriteria.lvhVoltageCriteria) {
    issues.push({
      code: "lvh_voltage_criteria",
      field: "lvhVoltageCriteria",
      message: "Left ventricular hypertrophy voltage criteria met",
      severity: "abnormal",
      value: 1,
    });
  }

  if (bundle.voltageCriteria.rvhVoltageCriteria) {
    issues.push({
      code: "rvh_voltage_criteria",
      field: "rvhVoltageCriteria",
      message: "Right ventricular hypertrophy voltage criteria met",
      severity: "abnormal",
      value: 1,
    });
  }

  for (const pattern of bundle.bundleBranch.patterns) {
    if (pattern === "none") continue;
    issues.push({
      code: `bundle_branch_${pattern}`,
      field: "bundleBranch",
      message: `Bundle branch pattern: ${pattern}`,
      severity: pattern.includes("delay") ? "borderline" : "abnormal",
      value: 0,
    });
  }

  const abnormalCount = issues.filter((issue) => issue.severity === "abnormal" || issue.severity === "critical").length;
  return {
    abnormalCount,
    issues,
    valid: issues.every((issue) => issue.severity !== "critical"),
  };
}
