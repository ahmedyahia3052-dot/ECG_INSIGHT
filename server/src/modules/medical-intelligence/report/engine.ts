import type {
  ClinicalSeverity,
  ClinicalUrgency,
  ConfidenceAssessment,
  ExplainabilityArtifact,
  MedicalIntelligenceReport,
  RuleFinding,
} from "../types";
import type { EcgClinicalMeasurementResult } from "../../ecg-measurement/types";
import type { ClinicalRecommendation } from "../types";
import type { DifferentialDiagnosisEntry } from "../types";

const SEVERITY_RANK: Record<ClinicalSeverity, number> = {
  normal: 1,
  minor: 2,
  abnormal: 3,
  urgent: 4,
  critical: 5,
};

const URGENCY_RANK: Record<ClinicalUrgency, number> = {
  routine: 1,
  urgent: 2,
  emergent: 3,
  critical: 4,
};

export interface ReportBuildInput {
  findings: RuleFinding[];
  confidenceAssessments: ConfidenceAssessment[];
  explainabilityArtifacts: ExplainabilityArtifact[];
  differentialMaps: Map<string, DifferentialDiagnosisEntry[]>;
  recommendations: ClinicalRecommendation[];
  measurement: EcgClinicalMeasurementResult;
  overallConfidence: ConfidenceAssessment;
  explainabilitySummary: string;
}

export function extractMeasurements(m: EcgClinicalMeasurementResult): Record<string, number | string> {
  return {
    heartRateBpm: m.heartRate,
    prIntervalMs: m.intervals.prIntervalMs,
    qrsDurationMs: m.intervals.qrsDurationMs,
    qtIntervalMs: m.intervals.qtIntervalMs,
    qtcBazettMs: m.intervals.qtcBazettMs,
    qtcFridericiaMs: m.intervals.qtcFridericiaMs,
    rrIntervalMs: m.intervals.rrIntervalMs,
    pWaveDurationMs: m.intervals.pWaveDurationMs,
    meanQrsAxisDeg: m.axis.meanQrsAxisDeg,
    frontalPlaneAxisDeg: m.axis.frontalPlaneAxisDeg,
    stDeviationMm: m.amplitudes.stDeviationMm,
    tWaveAmplitudeMv: m.amplitudes.tWaveAmplitudeMv,
    qrsAmplitudeMv: m.amplitudes.qrsAmplitudeMv,
    rhythm: m.rhythm,
    measurementConfidence: m.confidence,
    morphologyFlags: m.morphology.join(", ") || "none",
  };
}

export function rankFindings(findings: RuleFinding[]): RuleFinding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.rawConfidence - a.rawConfidence,
  );
}

export function deriveOverallSeverity(findings: RuleFinding[]): ClinicalSeverity {
  if (!findings.length) return "normal";
  return findings.reduce<ClinicalSeverity>(
    (current, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[current] ? f.severity : current),
    "normal",
  );
}

export function deriveOverallUrgency(findings: RuleFinding[]): ClinicalUrgency {
  if (!findings.length) return "routine";
  return findings.reduce<ClinicalUrgency>(
    (current, f) => (URGENCY_RANK[f.urgency] > URGENCY_RANK[current] ? f.urgency : current),
    "routine",
  );
}

export function buildCriticalFindings(findings: RuleFinding[]): string[] {
  return findings
    .filter((f) => f.severity === "critical" || f.urgency === "critical" || f.urgency === "emergent")
    .map((f) => `${f.label} (${f.code}) — ${f.severity}/${f.urgency}`);
}

export function buildWarnings(
  findings: RuleFinding[],
  measurement: EcgClinicalMeasurementResult,
): string[] {
  const warnings: string[] = [];

  if (measurement.confidence < 0.6) {
    warnings.push("Low measurement confidence — manual verification recommended");
  }
  if (findings.filter((f) => f.category === "rhythm").length > 2) {
    warnings.push("Multiple competing rhythm interpretations detected");
  }
  if (findings.some((f) => f.code === "WPW") && findings.some((f) => f.code === "AF")) {
    warnings.push("CRITICAL: WPW with AF — avoid AV nodal blocking agents");
  }
  if (findings.some((f) => f.code === "LBBB") && findings.some((f) => f.code === "STEMI")) {
    warnings.push("LBBB present — apply modified Sgarbossa criteria for STEMI detection");
  }
  if (findings.length === 0) {
    warnings.push("No automated findings — does not exclude pathology; clinical correlation essential");
  }

  return warnings;
}

export function buildMedicalReport(input: ReportBuildInput): MedicalIntelligenceReport {
  const ranked = rankFindings(input.findings);
  const primary = ranked[0] ?? null;
  const overallSeverity = deriveOverallSeverity(input.findings);
  const overallUrgency = deriveOverallUrgency(input.findings);

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    engineId: "ecg-medical-intelligence-engine",
    measurements: extractMeasurements(input.measurement),
    findings: ranked.map((finding, index) => ({
      code: finding.code,
      label: finding.label,
      category: finding.category,
      severity: finding.severity,
      urgency: finding.urgency,
      confidence: input.confidenceAssessments[index]!,
      explainability: input.explainabilityArtifacts[index]!,
      differentialDiagnosis: input.differentialMaps.get(finding.code) ?? [],
    })),
    primaryDiagnosis: {
      code: primary?.code ?? null,
      label: primary?.label ?? "No acute abnormality detected",
      confidence: primary
        ? input.confidenceAssessments[ranked.indexOf(primary)]!
        : input.overallConfidence,
    },
    recommendations: input.recommendations,
    warnings: buildWarnings(input.findings, input.measurement),
    criticalFindings: buildCriticalFindings(input.findings),
    overallSeverity,
    overallUrgency,
    overallConfidence: input.overallConfidence,
    explainabilitySummary: input.explainabilitySummary,
  };
}
