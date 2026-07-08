import type { EnterpriseRuleLogic } from "@prisma/client";
import { evaluateConditionGroups } from "./evaluator";
import type {
  RuleActionInput,
  RuleConditionInput,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from "./types";

export type ExecutableRule = {
  actions: RuleActionInput[];
  conditionRootLogic: EnterpriseRuleLogic;
  conditions: RuleConditionInput[];
  id: string;
  name: string;
  priority: number;
  ruleKey: string;
  version: number;
};

export function evaluateSingleRule(rule: ExecutableRule, context: RuleEvaluationContext): RuleEvaluationResult {
  const { conditionResults, matched } = evaluateConditionGroups(
    rule.conditions,
    context,
    rule.conditionRootLogic,
  );

  return {
    actions: matched
      ? rule.actions.map((action) => ({
          actionType: action.actionType,
          payload: action.payload,
        }))
      : [],
    conditionResults,
    matched,
    ruleId: rule.id,
    ruleKey: rule.ruleKey,
    ruleName: rule.name,
    ruleVersion: rule.version,
  };
}

export function evaluateRulesEngine(rules: ExecutableRule[], context: RuleEvaluationContext): RuleEvaluationResult[] {
  return [...rules]
    .sort((a, b) => a.priority - b.priority)
    .map((rule) => evaluateSingleRule(rule, context));
}

export function matchedRuleResults(results: RuleEvaluationResult[]) {
  return results.filter((result) => result.matched);
}
