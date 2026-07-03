import type { DigitizedLead } from "../ecg-digitization/types";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import type { EcgClinicalInterpretation } from "../ecg-interpretation/types";
import { normalizeLabel, RULE_CODE_TO_LABEL, type AiDiagnosisLabel } from "./diagnosis-codes";
import { predictDeepLearning, type DiagnosisProbability } from "./dl-predictor";
import { generateLlmClinicalReasoning } from "./llm-reasoning";
import type { AiDiagnosisCandidate, EcgAiDiagnosisResult } from "./types";

const SOURCE_WEIGHTS = {
  deep_learning: 0.35,
  measurement: 0.1,
  rules: 0.45,
} as const;

function ruleProbabilities(interpretation: EcgClinicalInterpretation): DiagnosisProbability[] {
  const totals = new Map<AiDiagnosisLabel, number>();
  for (const finding of interpretation.findings) {
    const label = RULE_CODE_TO_LABEL[finding.code] ?? normalizeLabel(finding.label);
    if (!label) continue;
    totals.set(label, (totals.get(label) ?? 0) + finding.confidence);
  }
  const sum = [...totals.values()].reduce((total, value) => total + value, 0) || 1;
  return [...totals.entries()].map(([label, value]) => ({
    label,
    probability: Number((value / sum).toFixed(4)),
    source: "feature_model" as const,
  }));
}

function measurementConfidenceModifier(measurement: EcgClinicalMeasurementResult) {
  return Math.max(0.35, Math.min(1, measurement.confidence));
}

function fuseProbabilities(
  ruleScores: DiagnosisProbability[],
  dlScores: DiagnosisProbability[],
  modifier: number,
): DiagnosisProbability[] {
  const merged = new Map<AiDiagnosisLabel, number>();
  for (const item of ruleScores) {
    merged.set(item.label, (merged.get(item.label) ?? 0) + item.probability * SOURCE_WEIGHTS.rules * modifier);
  }
  for (const item of dlScores) {
    merged.set(item.label, (merged.get(item.label) ?? 0) + item.probability * SOURCE_WEIGHTS.deep_learning * modifier);
  }
  merged.set("Normal ECG", (merged.get("Normal ECG") ?? 0) + SOURCE_WEIGHTS.measurement * modifier);
  const total = [...merged.values()].reduce((sum, value) => sum + value, 0) || 1;
  return [...merged.entries()]
    .map(([label, value]) => ({ label, probability: Number((value / total).toFixed(4)), source: "deep_learning" as const }))
    .sort((a, b) => b.probability - a.probability);
}

function agreementScore(rulePrimary: string, ensemblePrimary: AiDiagnosisLabel) {
  const normalizedRule = normalizeLabel(rulePrimary) ?? rulePrimary;
  if (normalizedRule === ensemblePrimary) return 1;
  if (normalizedRule.includes("STEMI") && ensemblePrimary.includes("STEMI")) return 0.75;
  if (normalizedRule.includes("MI") && ensemblePrimary.includes("MI")) return 0.7;
  return 0.25;
}

function buildCandidates(probabilities: DiagnosisProbability[], interpretation: EcgClinicalInterpretation): AiDiagnosisCandidate[] {
  return probabilities.slice(0, 5).map((item) => ({
    agreementWithRules: agreementScore(interpretation.primaryDiagnosis, item.label),
    confidence: item.probability,
    evidence: interpretation.findings
      .filter((finding) => (RULE_CODE_TO_LABEL[finding.code] ?? normalizeLabel(finding.label)) === item.label)
      .flatMap((finding) => finding.evidence.map((row) => `${row.feature} = ${row.value}`)),
    label: item.label,
    probability: item.probability,
    source: item.source === "onnx" ? "deep_learning" : item.source === "feature_model" ? "rules" : "deep_learning",
  }));
}

function disagreementExplanation(rulePrimary: string, ensemblePrimary: AiDiagnosisLabel, dlTop: AiDiagnosisLabel) {
  if (normalizeLabel(rulePrimary) === ensemblePrimary) {
    return "Rule engine and deep-learning ensemble agree on the primary diagnosis.";
  }
  return `Rule engine prioritized ${rulePrimary}, while the ensemble selected ${ensemblePrimary} based on waveform model emphasis on ${dlTop}. Review both evidence sets before clinical action.`;
}

export async function runEnsembleDiagnosis(input: {
  imageAvailable: boolean;
  interpretation: EcgClinicalInterpretation;
  leads: DigitizedLead[];
  measurement: EcgClinicalMeasurementResult;
  qualityScore: number;
}): Promise<EcgAiDiagnosisResult> {
  const { interpretation, leads, measurement, qualityScore } = input;
  const ruleScores = ruleProbabilities(interpretation);
  const dlScores = await predictDeepLearning(measurement, interpretation, leads);
  const modifier = measurementConfidenceModifier(measurement) * (qualityScore >= 50 ? 1 : 0.7);
  const fused = fuseProbabilities(ruleScores, dlScores, modifier);
  const topFive = buildCandidates(fused, interpretation);
  const primary = topFive[0]?.label ?? "Normal ECG";
  const dlTop = dlScores[0]?.label ?? primary;
  const agreement = agreementScore(interpretation.primaryDiagnosis, primary);
  const clinicalReasoning = await generateLlmClinicalReasoning({
    ensemblePrimary: primary,
    measurement,
    probabilities: fused,
    ruleFindings: interpretation.findings,
    rulePrimary: interpretation.primaryDiagnosis,
  });

  return {
    agreementWithRules: Number(agreement.toFixed(3)),
    clinicalReasoning,
    confidence: Number((topFive[0]?.confidence ?? 0).toFixed(3)),
    disagreementExplanation: disagreementExplanation(interpretation.primaryDiagnosis, primary, dlTop),
    ensembleSources: ["measurement_engine", "rule_engine", "deep_learning_model", "local_llm_reasoning"],
    evidence: topFive[0]?.evidence ?? [],
    markdownReport: [
      "# AI ECG Diagnosis Ensemble",
      "",
      `**Primary diagnosis:** ${primary}`,
      `**Confidence:** ${Math.round((topFive[0]?.confidence ?? 0) * 100)}%`,
      `**Agreement with rules:** ${Math.round(agreement * 100)}%`,
      "",
      "## Top 5 Diagnoses",
      ...topFive.map((item, index) => `${index + 1}. ${item.label} — ${Math.round(item.probability * 100)}%`),
      "",
      "## Disagreement Analysis",
      disagreementExplanation(interpretation.primaryDiagnosis, primary, dlTop),
      "",
      "## Clinical Reasoning",
      clinicalReasoning,
    ].join("\n"),
    primaryDiagnosis: primary,
    recommendations: interpretation.recommendations,
    topDiagnoses: topFive,
    urgency: interpretation.urgency,
  };
}
