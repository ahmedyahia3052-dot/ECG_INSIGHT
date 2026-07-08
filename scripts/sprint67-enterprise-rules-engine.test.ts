/**
 * Sprint 67 — Enterprise Rules Engine unit tests.
 */
import { ENTERPRISE_SYSTEM_RULE_TEMPLATES, listSystemRuleTemplateIds } from "../server/src/modules/enterprise-rules-engine/catalog";
import { evaluateSingleRule, matchedRuleResults } from "../server/src/modules/enterprise-rules-engine/engine";
import {
  evaluateCondition,
  evaluateConditionGroups,
  parseRuleEvaluationContext,
} from "../server/src/modules/enterprise-rules-engine/evaluator";
import type { ExecutableRule } from "../server/src/modules/enterprise-rules-engine/engine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(listSystemRuleTemplateIds().length === 11, "Expected 11 system rule templates");
assert(ENTERPRISE_SYSTEM_RULE_TEMPLATES.every((template) => template.conditions.length >= 1), "Templates need conditions");
assert(ENTERPRISE_SYSTEM_RULE_TEMPLATES.every((template) => template.actions.length >= 1), "Templates need actions");

const context = parseRuleEvaluationContext({
  afDetected: true,
  bbbDetected: false,
  clinicalPriority: "CRITICAL",
  heartRate: 38,
  prIntervalMs: 260,
  pvcCount: 8,
  qrsDurationMs: 140,
  qtIntervalMs: 520,
  qtcBazettMs: 520,
  riskScore: 72,
  stDeviationMm: -1.2,
  stElevationMm: 2.4,
});

const qtCondition = evaluateCondition(
  { field: "QTC_INTERVAL", operator: "GT", threshold: 470 },
  context,
);
assert(qtCondition.matched, "QTc > 470 should match");

const hrCondition = evaluateCondition(
  { field: "HEART_RATE", operator: "LT", threshold: 50 },
  context,
);
assert(hrCondition.matched, "HR < 50 should match");

const priorityCondition = evaluateCondition(
  { field: "CLINICAL_PRIORITY", operator: "EQ", stringValue: "CRITICAL" },
  context,
);
assert(priorityCondition.matched, "Critical priority should match");

const groupResult = evaluateConditionGroups(
  [
    { field: "HEART_RATE", operator: "LT", threshold: 50, groupId: "rate", groupLogic: "AND" },
    { field: "QTC_INTERVAL", operator: "GT", threshold: 470, groupId: "rate", groupLogic: "AND" },
    { field: "AF_DETECTED", operator: "IS_TRUE", boolValue: true, groupId: "rhythm", groupLogic: "OR" },
  ],
  context,
  "OR",
);
assert(groupResult.matched, "Grouped OR logic should match when rhythm group matches");
assert(groupResult.conditionResults.length === 3, "Should evaluate all grouped conditions");

const executableRule: ExecutableRule = {
  actions: [{ actionType: "MARK_CRITICAL" }, { actionType: "NOTIFY_PHYSICIAN" }],
  conditionRootLogic: "AND",
  conditions: [{ field: "ST_ELEVATION", operator: "GT", threshold: 1 }],
  id: "rule-test-1",
  name: "ST Elevation Test Rule",
  priority: 1,
  ruleKey: "st-elevation-test",
  version: 1,
};

const ruleResult = evaluateSingleRule(executableRule, context);
assert(ruleResult.matched, "ST elevation rule should match critical context");
assert(ruleResult.actions.length === 2, "Matched rule should emit configured actions");
assert(ruleResult.conditionResults[0]?.matched, "Condition result should be matched");

const nonMatchRule: ExecutableRule = {
  ...executableRule,
  conditions: [{ field: "HEART_RATE", operator: "GT", threshold: 200 }],
  id: "rule-test-2",
  ruleKey: "hr-unreachable",
};
const nonMatch = evaluateSingleRule(nonMatchRule, context);
assert(!nonMatch.matched, "Unreachable threshold should not match");
assert(nonMatch.actions.length === 0, "Non-matching rule should emit no actions");

const batch = [
  evaluateSingleRule(executableRule, context),
  evaluateSingleRule(nonMatchRule, context),
];
assert(matchedRuleResults(batch).length === 1, "Only one rule should match in batch");

console.log("Sprint 67 Enterprise Rules Engine unit tests: PASS");
