import type {
  ClinicalEvidenceItem,
  DecisionSupportEvaluationInput,
  GeneratedRecommendationDto,
  RecommendationTypeCode,
  SupportingFinding,
} from "./types";
import { DEFAULT_DECISION_SUPPORT_RULES, RECOMMENDATION_CATALOG, type DecisionRuleDefinition } from "./decision-rules";

function matchesFindingRule(rule: DecisionRuleDefinition, findings: SupportingFinding[]) {
  const codes = (rule.criteriaJson.findingCodes as string[] | undefined) ?? [];
  if (!codes.length) return false;
  return findings.some((finding) => codes.includes(finding.code));
}

function matchesMeasurementRule(rule: DecisionRuleDefinition, input: DecisionSupportEvaluationInput) {
  const qrsMin = rule.criteriaJson.qrsDurationMsMin as number | undefined;
  if (qrsMin !== undefined && (input.qrsDurationMs ?? 0) >= qrsMin) return true;
  const qtcMin = rule.criteriaJson.qtcBazettMsMin as number | undefined;
  if (qtcMin !== undefined && (input.qtcBazettMs ?? 0) >= qtcMin) return true;
  const confidenceMax = rule.criteriaJson.measurementConfidenceMax as number | undefined;
  if (confidenceMax !== undefined && (input.measurementConfidence ?? 1) <= confidenceMax) return true;
  if (rule.criteriaJson.defaultRoutine) return true;
  return false;
}

function buildEvidence(rule: DecisionRuleDefinition): ClinicalEvidenceItem[] {
  return [
    {
      reference: rule.ruleCode,
      source: rule.evidenceLevel,
      summary: rule.description,
    },
  ];
}

function priorityScoreFor(rule: DecisionRuleDefinition, finding?: SupportingFinding) {
  const base = rule.priorityWeight * 100;
  if (!finding) return Math.round(base);
  const severityBoost =
    finding.severity === "critical" ? 20 : finding.severity === "urgent" ? 12 : finding.severity === "abnormal" ? 6 : 0;
  return Math.min(100, Math.round(base + severityBoost));
}

function confidenceFor(input: DecisionSupportEvaluationInput, finding?: SupportingFinding) {
  const measurementConfidence = input.measurementConfidence ?? 0.75;
  const findingConfidence = finding?.severity === "critical" ? 0.95 : finding?.severity === "urgent" ? 0.85 : 0.75;
  return Number(Math.min(0.99, Math.max(0.45, (measurementConfidence + findingConfidence) / 2)).toFixed(3));
}

/** Generate case-scoped clinical recommendations from measurement context and findings. */
export function generateClinicalRecommendations(
  input: DecisionSupportEvaluationInput,
  rules: DecisionRuleDefinition[] = DEFAULT_DECISION_SUPPORT_RULES,
): GeneratedRecommendationDto[] {
  const findings = input.structuredFindings ?? [];
  const generated = new Map<RecommendationTypeCode, GeneratedRecommendationDto>();

  for (const rule of rules) {
    if (rule.criteriaJson.defaultRoutine) continue;
    const finding = findings.find((item) => ((rule.criteriaJson.findingCodes as string[] | undefined) ?? []).includes(item.code));
    const matched = matchesFindingRule(rule, findings) || matchesMeasurementRule(rule, input);
    if (!matched) continue;

    for (const recommendationType of rule.recommendationTypes) {
      if (generated.has(recommendationType)) continue;
      const catalog = RECOMMENDATION_CATALOG[recommendationType];
      generated.set(recommendationType, {
        action: catalog.action,
        clinicalEvidence: buildEvidence(rule),
        confidence: confidenceFor(input, finding),
        priorityScore: priorityScoreFor(rule, finding),
        reasoning: `${rule.name}: ${rule.description}`,
        recommendationType,
        ruleCode: rule.ruleCode,
        supportingFindings: finding ? [finding] : findings.slice(0, 3),
        title: catalog.title,
      });
    }
  }

  if (!generated.size) {
    const routineRule = rules.find((rule) => rule.ruleCode === "S65_ROUTINE_FOLLOWUP") ?? rules[rules.length - 1]!;
    generated.set("REPEAT_ECG", {
      action: RECOMMENDATION_CATALOG.REPEAT_ECG.action,
      clinicalEvidence: buildEvidence(routineRule),
      confidence: confidenceFor(input),
      priorityScore: priorityScoreFor(routineRule),
      reasoning: routineRule.description,
      recommendationType: "REPEAT_ECG",
      ruleCode: routineRule.ruleCode,
      supportingFindings: findings.slice(0, 2),
      title: RECOMMENDATION_CATALOG.REPEAT_ECG.title,
    });
  }

  return [...generated.values()].sort((left, right) => right.priorityScore - left.priorityScore);
}
