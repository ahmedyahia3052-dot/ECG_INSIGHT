import type { EnterpriseRuleField, EnterpriseRuleLogic, EnterpriseRuleOperator } from "@prisma/client";
import type { EvaluatedCondition, RuleConditionInput, RuleEvaluationContext } from "./types";

function readField(context: RuleEvaluationContext, field: EnterpriseRuleField): string | number | boolean {
  switch (field) {
    case "QT_INTERVAL":
      return context.qtIntervalMs;
    case "QTC_INTERVAL":
      return context.qtcBazettMs;
    case "HEART_RATE":
      return context.heartRate;
    case "QRS_DURATION":
      return context.qrsDurationMs;
    case "PR_INTERVAL":
      return context.prIntervalMs;
    case "ST_DEVIATION":
      return context.stDeviationMm;
    case "ST_ELEVATION":
      return context.stElevationMm;
    case "RISK_SCORE":
      return context.riskScore;
    case "CLINICAL_PRIORITY":
      return context.clinicalPriority;
    case "PVC_COUNT":
      return context.pvcCount;
    case "AF_DETECTED":
      return context.afDetected;
    case "BBB_DETECTED":
      return context.bbbDetected;
    default:
      return 0;
  }
}

function thresholdLabel(condition: RuleConditionInput) {
  if (condition.operator === "IS_TRUE" || condition.operator === "IS_FALSE") {
    return condition.operator;
  }
  if (condition.stringValue !== undefined) return condition.stringValue;
  if (condition.threshold !== undefined) return String(condition.threshold);
  return undefined;
}

export function evaluateCondition(condition: RuleConditionInput, context: RuleEvaluationContext): EvaluatedCondition {
  const observed = readField(context, condition.field);
  const threshold = thresholdLabel(condition);
  let matched = false;

  switch (condition.operator) {
    case "GT":
      matched = Number(observed) > Number(condition.threshold ?? 0);
      break;
    case "GTE":
      matched = Number(observed) >= Number(condition.threshold ?? 0);
      break;
    case "LT":
      matched = Number(observed) < Number(condition.threshold ?? 0);
      break;
    case "LTE":
      matched = Number(observed) <= Number(condition.threshold ?? 0);
      break;
    case "EQ":
      matched = condition.stringValue !== undefined
        ? String(observed).toUpperCase() === condition.stringValue.toUpperCase()
        : Number(observed) === Number(condition.threshold);
      break;
    case "NEQ":
      matched = condition.stringValue !== undefined
        ? String(observed).toUpperCase() !== condition.stringValue.toUpperCase()
        : Number(observed) !== Number(condition.threshold);
      break;
    case "CONTAINS":
      matched = String(observed).toLowerCase().includes(String(condition.stringValue ?? "").toLowerCase());
      break;
    case "IS_TRUE":
      matched = observed === true;
      break;
    case "IS_FALSE":
      matched = observed === false;
      break;
    default:
      matched = false;
  }

  return {
    field: condition.field,
    matched,
    observed,
    operator: condition.operator,
    threshold,
  };
}

export function evaluateConditionGroups(
  conditions: RuleConditionInput[],
  context: RuleEvaluationContext,
  rootLogic: EnterpriseRuleLogic,
): { conditionResults: EvaluatedCondition[]; matched: boolean } {
  if (!conditions.length) {
    return { conditionResults: [], matched: false };
  }

  const conditionResults = conditions.map((condition) => evaluateCondition(condition, context));
  const groups = new Map<string, { logic: EnterpriseRuleLogic; results: EvaluatedCondition[] }>();

  for (let index = 0; index < conditions.length; index += 1) {
    const condition = conditions[index]!;
    const result = conditionResults[index]!;
    const groupId = condition.groupId ?? "default";
    const entry = groups.get(groupId) ?? { logic: condition.groupLogic ?? "AND", results: [] };
    entry.results.push(result);
    groups.set(groupId, entry);
  }

  const groupOutcomes = [...groups.values()].map((group) =>
    group.logic === "AND"
      ? group.results.every((result) => result.matched)
      : group.results.some((result) => result.matched),
  );

  return {
    conditionResults,
    matched: rootLogic === "AND" ? groupOutcomes.every(Boolean) : groupOutcomes.some(Boolean),
  };
}

export function parseRuleEvaluationContext(input: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    afDetected: Boolean(input.afDetected),
    bbbDetected: Boolean(input.bbbDetected),
    clinicalPriority: String(input.clinicalPriority ?? "ROUTINE").toUpperCase(),
    heartRate: Number(input.heartRate ?? 0),
    prIntervalMs: Number(input.prIntervalMs ?? 0),
    pvcCount: Number(input.pvcCount ?? 0),
    qrsDurationMs: Number(input.qrsDurationMs ?? 0),
    qtIntervalMs: Number(input.qtIntervalMs ?? 0),
    qtcBazettMs: Number(input.qtcBazettMs ?? 0),
    riskScore: Number(input.riskScore ?? 0),
    stDeviationMm: Number(input.stDeviationMm ?? 0),
    stElevationMm: Number(input.stElevationMm ?? 0),
  };
}
