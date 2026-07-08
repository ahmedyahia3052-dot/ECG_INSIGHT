/**
 * Sprint 67 — Enterprise Rules Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/enterprise-rules-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "catalog.ts"),
    markers: ["ENTERPRISE_SYSTEM_RULE_TEMPLATES", "qt-prolongation-threshold", "af-detected", "risk-score-threshold"],
  },
  {
    file: resolve(MOD, "evaluator.ts"),
    markers: ["evaluateCondition", "evaluateConditionGroups", "parseRuleEvaluationContext"],
  },
  {
    file: resolve(MOD, "engine.ts"),
    markers: ["evaluateSingleRule", "evaluateRulesEngine", "matchedRuleResults"],
  },
  {
    file: resolve(MOD, "repository.ts"),
    markers: ["createClinicalRule", "persistRuleExecution", "RuleVersion", "clinicalRule"],
  },
  {
    file: resolve(MOD, "enterprise-rules.routes.ts"),
    markers: [
      "enterpriseRulesEngineRouter",
      '"/rules"',
      '"/rules/:id"',
      '"/rules/test"',
      '"/rules/history"',
    ],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: [
      "ClinicalRule",
      "RuleCondition",
      "RuleAction",
      "RuleExecution",
      "RuleVersion",
      "EnterpriseRuleActionType",
    ],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260708080000_sprint67_enterprise_rules_engine/migration.sql"),
    markers: ["ClinicalRule", "RuleCondition", "RuleAction", "RuleExecution", "RuleVersion"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/enterprise-rules-engine", "enterpriseRulesEngineRouter"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 67 Enterprise Rules Engine integration markers: PASS");
