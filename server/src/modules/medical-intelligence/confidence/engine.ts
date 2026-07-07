import type { ConfidenceAssessment, ConfidenceLevel, RuleFinding } from "../types";
import type { EcgClinicalMeasurementResult } from "../../ecg-measurement/types";

const LEVEL_THRESHOLDS: Array<{ min: number; level: ConfidenceLevel }> = [
  { min: 0.75, level: "high" },
  { min: 0.55, level: "medium" },
  { min: 0.35, level: "low" },
  { min: 0, level: "unknown" },
];

function levelFromScore(score: number): ConfidenceLevel {
  for (const { min, level } of LEVEL_THRESHOLDS) {
    if (score >= min) return level;
  }
  return "unknown";
}

export function assessFindingConfidence(
  finding: RuleFinding,
  measurement: EcgClinicalMeasurementResult,
): ConfidenceAssessment {
  const factors: ConfidenceAssessment["factors"] = [];
  let score = finding.rawConfidence;

  const metEvidence = finding.evidence.filter((e) => e.met).length;
  const totalEvidence = finding.evidence.length;
  const evidenceRatio = totalEvidence > 0 ? metEvidence / totalEvidence : 0;
  factors.push({
    factor: `${metEvidence}/${totalEvidence} diagnostic criteria met`,
    impact: evidenceRatio >= 0.8 ? "positive" : evidenceRatio >= 0.5 ? "neutral" : "negative",
    weight: evidenceRatio * 0.3,
  });
  score += evidenceRatio * 0.1;

  if (measurement.confidence >= 0.8) {
    factors.push({ factor: "High measurement signal quality", impact: "positive", weight: 0.15 });
    score += 0.08;
  } else if (measurement.confidence < 0.5) {
    factors.push({ factor: "Low measurement signal quality", impact: "negative", weight: -0.15 });
    score -= 0.12;
  }

  if (finding.triggeredBy.length >= 3) {
    factors.push({ factor: "Multiple independent rule triggers", impact: "positive", weight: 0.1 });
    score += 0.05;
  }

  score = Number(Math.min(0.98, Math.max(0.05, score)).toFixed(3));
  const level = levelFromScore(score);

  const explanation = buildConfidenceExplanation(level, factors, finding.label);

  return { level, score, explanation, factors };
}

export function assessOverallConfidence(
  findings: RuleFinding[],
  measurement: EcgClinicalMeasurementResult,
  assessments: ConfidenceAssessment[],
): ConfidenceAssessment {
  if (!findings.length) {
    return {
      level: measurement.confidence >= 0.7 ? "medium" : "low",
      score: Number((measurement.confidence * 0.6).toFixed(3)),
      explanation: "No diagnostic findings detected; confidence reflects measurement quality only.",
      factors: [{ factor: "No rule findings triggered", impact: "neutral", weight: 0 }],
    };
  }

  const avgScore = assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length;
  const maxScore = Math.max(...assessments.map((a) => a.score));
  const blended = Number((avgScore * 0.4 + maxScore * 0.6).toFixed(3));
  const level = levelFromScore(blended);

  return {
    level,
    score: blended,
    explanation: `${findings.length} finding(s) detected with ${level} overall confidence (blended from individual assessments).`,
    factors: [
      { factor: `${findings.length} concurrent findings`, impact: "positive", weight: 0.2 },
      { factor: `Measurement confidence ${Math.round(measurement.confidence * 100)}%`, impact: measurement.confidence >= 0.7 ? "positive" : "negative", weight: measurement.confidence * 0.2 },
    ],
  };
}

function buildConfidenceExplanation(
  level: ConfidenceLevel,
  factors: ConfidenceAssessment["factors"],
  label: string,
): string {
  const positive = factors.filter((f) => f.impact === "positive").map((f) => f.factor);
  const negative = factors.filter((f) => f.impact === "negative").map((f) => f.factor);

  const parts = [`${level.toUpperCase()} confidence for ${label}.`];
  if (positive.length) parts.push(`Supporting: ${positive.join("; ")}.`);
  if (negative.length) parts.push(`Limiting: ${negative.join("; ")}.`);
  if (level === "unknown") parts.push("Insufficient evidence to determine confidence reliably.");
  return parts.join(" ");
}
