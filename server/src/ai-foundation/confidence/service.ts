import type { ECGAnalysisOutput } from "../../ai/domain";
import { assessOverallConfidence } from "../../modules/medical-intelligence/confidence/engine";
import type { MedicalIntelligenceReport } from "../../modules/medical-intelligence/types";
import type { AiConfidenceResult } from "../types";

function levelFromScore(score: number): AiConfidenceResult["level"] {
  if (score >= 0.8) return "high";
  if (score >= 0.55) return "medium";
  if (score > 0) return "low";
  return "unknown";
}

export function scoreEcgAnalysisConfidence(output: ECGAnalysisOutput): AiConfidenceResult {
  const signalQuality = output.featureExtraction?.rhythmRegularity ?? 0.7;
  const evidenceCount = output.interpretationRationale.length;
  const severityPenalty = output.clinicalSeverity === "CRITICAL" ? 0.05 : 0;
  const blended = Math.min(1, Math.max(0, output.confidenceScore * 0.7 + signalQuality * 0.2 + Math.min(evidenceCount, 5) * 0.02 - severityPenalty));

  return {
    explanation: `Blended confidence from provider score (${output.confidenceScore.toFixed(2)}), signal quality, and evidence count.`,
    factors: [
      { factor: "provider_confidence", impact: "positive", weight: 0.7 },
      { factor: "signal_quality", impact: signalQuality >= 0.7 ? "positive" : "negative", weight: 0.2 },
      { factor: "evidence_count", impact: evidenceCount >= 2 ? "positive" : "neutral", weight: 0.1 },
    ],
    level: levelFromScore(blended),
    score: Number(blended.toFixed(4)),
  };
}

export function scoreClinicalReasoningConfidence(report: MedicalIntelligenceReport): AiConfidenceResult {
  const overall = report.overallConfidence;
  return {
    explanation: overall.explanation,
    factors: overall.factors.map((factor) => ({
      factor: factor.factor,
      impact: factor.impact,
      weight: factor.weight,
    })),
    level: overall.level,
    score: overall.score,
  };
}

export function scoreLlmConfidence(content: string): AiConfidenceResult {
  const lengthFactor = Math.min(content.length / 500, 1);
  const hasUncertainty = /\b(may|might|uncertain|cannot determine|insufficient)\b/i.test(content);
  const score = hasUncertainty ? Math.min(0.6, 0.4 + lengthFactor * 0.2) : Math.min(0.9, 0.65 + lengthFactor * 0.25);

  return {
    explanation: hasUncertainty
      ? "Response contains uncertainty language; confidence capped."
      : "Heuristic confidence from response completeness.",
    factors: [
      { factor: "response_length", impact: lengthFactor > 0.5 ? "positive" : "neutral", weight: 0.3 },
      { factor: "uncertainty_language", impact: hasUncertainty ? "negative" : "positive", weight: 0.7 },
    ],
    level: levelFromScore(score),
    score: Number(score.toFixed(4)),
  };
}

export { assessOverallConfidence };
