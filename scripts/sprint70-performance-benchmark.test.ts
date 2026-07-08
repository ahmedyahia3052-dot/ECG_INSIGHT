import assert from "node:assert/strict";
import { ENTERPRISE_SYSTEM_RULE_TEMPLATES } from "../server/src/modules/enterprise-rules-engine/catalog";
import { evaluateRulesEngine } from "../server/src/modules/enterprise-rules-engine/engine";
import { toExecutableRule } from "../server/src/modules/enterprise-rules-engine/repository";
import { parseRuleEvaluationContext } from "../server/src/modules/enterprise-rules-engine/evaluator";
import { summarizeTimings } from "../server/src/performance/query-profiler";

const ITERATIONS = 24;
const RULE_EVAL_P95_BUDGET_MS = 12;

function buildSyntheticRules() {
  return ENTERPRISE_SYSTEM_RULE_TEMPLATES.map((template, index) =>
    toExecutableRule({
      actions: template.actions.map((action, actionIndex) => ({
        actionType: action.actionType,
        id: `action-${index}-${actionIndex}`,
        payload: action.payload ?? null,
        ruleId: `rule-${index}`,
        sortOrder: action.sortOrder ?? actionIndex,
      })),
      category: template.category,
      conditionRootLogic: template.conditionRootLogic ?? "AND",
      conditions: template.conditions.map((condition, conditionIndex) => ({
        boolValue: condition.boolValue ?? null,
        field: condition.field,
        groupId: condition.groupId ?? "default",
        groupLogic: condition.groupLogic ?? "AND",
        id: `condition-${index}-${conditionIndex}`,
        operator: condition.operator,
        ruleId: `rule-${index}`,
        sortOrder: condition.sortOrder ?? conditionIndex,
        stringValue: condition.stringValue ?? null,
        threshold: condition.threshold ?? null,
      })),
      createdAt: new Date(),
      createdById: null,
      currentVersion: 1,
      description: template.description,
      enabled: true,
      id: `rule-${index}`,
      name: template.name,
      organizationId: null,
      priority: template.priority ?? 100,
      ruleKey: template.ruleKey,
      status: "ACTIVE",
      updatedAt: new Date(),
    }),
  );
}

function main() {
  const rules = buildSyntheticRules();
  const context = parseRuleEvaluationContext({
    afDetected: true,
    bbbDetected: false,
    clinicalPriority: "URGENT",
    heartRate: 132,
    prIntervalMs: 180,
    pvcCount: 2,
    qrsDurationMs: 96,
    qtIntervalMs: 420,
    qtcBazettMs: 470,
    riskScore: 72,
    stDeviationMm: 1.2,
    stElevationMm: 2.4,
  });

  const samples = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    const started = performance.now();
    const results = evaluateRulesEngine(rules, context);
    samples.push({
      durationMs: performance.now() - started,
      label: "evaluateRulesEngine",
    });
    assert.equal(results.length, rules.length);
  }

  const summary = summarizeTimings(samples);
  assert.ok(summary.p95Ms <= RULE_EVAL_P95_BUDGET_MS, `Rule evaluation P95 ${summary.p95Ms.toFixed(2)}ms exceeds ${RULE_EVAL_P95_BUDGET_MS}ms`);

  console.log(
    `Sprint 70 performance benchmark: PASS (rules=${rules.length}, iterations=${ITERATIONS}, p95=${summary.p95Ms.toFixed(2)}ms, mean=${summary.meanMs.toFixed(2)}ms)`,
  );
}

main();
