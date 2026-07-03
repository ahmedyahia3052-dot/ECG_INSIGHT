import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import { evaluateAllRules } from "./rules";
import type { ClinicalFinding, EcgClinicalInterpretation, InterpretationSeverity } from "./types";

const SEVERITY_RANK: Record<InterpretationSeverity, number> = {
  abnormal: 3,
  critical: 5,
  minor: 2,
  normal: 1,
  urgent: 4,
};

function severityFromFindings(findings: ClinicalFinding[]): InterpretationSeverity {
  if (!findings.length) return "normal";
  return findings.reduce<InterpretationSeverity>((current, item) =>
    SEVERITY_RANK[item.severity] > SEVERITY_RANK[current] ? item.severity : current, "normal");
}

function primaryDiagnosisFromFindings(findings: ClinicalFinding[]): string {
  if (!findings.length) return "No acute abnormality detected";
  const ranked = [...findings].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.confidence - a.confidence);
  return ranked[0]?.label ?? "ECG interpretation pending";
}

function recommendationsFor(findings: ClinicalFinding[], severity: InterpretationSeverity): string[] {
  const recommendations = new Set<string>();
  if (findings.some((item) => item.code === "STEMI" || item.code === "ANT_MI" || item.code === "INF_MI")) {
    recommendations.add("Activate acute coronary syndrome pathway and urgent cardiology review.");
  }
  if (findings.some((item) => item.code === "AF")) {
    recommendations.add("Assess stroke risk, rate/rhythm control, and anticoagulation candidacy.");
  }
  if (findings.some((item) => item.code === "AVB3" || item.code === "VENTRICULAR")) {
    recommendations.add("Evaluate for emergent pacing and continuous monitoring.");
  }
  if (findings.some((item) => item.code === "HYPERK")) {
    recommendations.add("Check serum potassium urgently and treat severe hyperkalemia.");
  }
  if (severity === "normal" || severity === "minor") {
    recommendations.add("Correlate with symptoms and prior ECGs; repeat if clinical status changes.");
  } else {
    recommendations.add("Correlate ECG interpretation with clinical presentation and repeat tracing if uncertain.");
  }
  return [...recommendations];
}

function measurementsUsed(measurement: EcgClinicalMeasurementResult): Record<string, number | string> {
  return {
    heartRateBpm: measurement.heartRate,
    meanQrsAxisDeg: measurement.axis.meanQrsAxisDeg,
    prIntervalMs: measurement.intervals.prIntervalMs,
    qrsDurationMs: measurement.intervals.qrsDurationMs,
    qtIntervalMs: measurement.intervals.qtIntervalMs,
    qtcBazettMs: measurement.intervals.qtcBazettMs,
    rhythm: measurement.rhythm,
    stDeviationMm: measurement.amplitudes.stDeviationMm,
  };
}

function aggregateEvidence(findings: ClinicalFinding[]) {
  const seen = new Set<string>();
  const evidence: Array<{ feature: string; value: string }> = [];
  for (const item of findings) {
    for (const row of item.evidence) {
      const key = `${row.feature}:${row.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push(row);
    }
  }
  return evidence;
}

export function buildMarkdownReport(interpretation: Omit<EcgClinicalInterpretation, "markdownReport">): string {
  const lines = [
    "# ECG Clinical Interpretation Report",
    "",
    "## Summary",
    interpretation.report.summary,
    "",
    `**Primary diagnosis:** ${interpretation.primaryDiagnosis}`,
    `**Severity:** ${interpretation.severity.toUpperCase()}`,
    `**Urgency:** ${interpretation.urgency.toUpperCase()}`,
    `**Confidence:** ${Math.round(interpretation.confidence * 100)}%`,
    "",
    "## Findings",
    ...interpretation.report.findings.map((item) => `- ${item}`),
    "",
    "## Evidence-Based Interpretation",
    ...interpretation.findings.map((item) => [
      `### ${item.label}`,
      `Detected **${item.label}** because:`,
      ...item.evidence.map((row) => `- ${row.feature} = ${row.value}`),
      "",
    ].join("\n")),
    "## Measurements Used",
    ...Object.entries(interpretation.measurementsUsed).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Recommendations",
    ...interpretation.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join("\n");
}

export function interpretFromMeasurement(measurement: EcgClinicalMeasurementResult): EcgClinicalInterpretation {
  const findings = evaluateAllRules(measurement);
  const severity = severityFromFindings(findings);
  const urgency = severity;
  const primaryDiagnosis = primaryDiagnosisFromFindings(findings);
  const confidence = Number(Math.min(0.98, Math.max(0.35, measurement.confidence * 0.85 + (findings.length ? 0.1 : 0))).toFixed(3));
  const used = measurementsUsed(measurement);
  const recommendations = recommendationsFor(findings, severity);
  const summary = findings.length
    ? `${primaryDiagnosis}. ${findings.length} evidence-based finding(s) detected from automated ECG measurements.`
    : "No significant automated ECG abnormality detected. Clinical correlation recommended.";

  const base = {
    confidence: Number(confidence),
    findings,
    measurementsUsed: used,
    primaryDiagnosis,
    recommendations,
    report: {
      confidence: Number(confidence),
      evidence: aggregateEvidence(findings),
      findings: findings.map((item) => item.label),
      measurementsUsed: used,
      recommendations,
      summary,
      urgency,
    },
    severity,
    urgency,
  };

  return {
    ...base,
    markdownReport: buildMarkdownReport(base),
  };
}
