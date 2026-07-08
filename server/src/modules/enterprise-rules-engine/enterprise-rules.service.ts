import { prisma } from "../../config/prisma";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../middleware/error";
import { resolveCaseMeasurement } from "../ai-report-generator/measurement-adapter";
import { runMedicalIntelligenceEngine } from "../medical-intelligence/orchestrator";
import { recordEngineAudit } from "./audit";
import { evaluateRulesEngine, matchedRuleResults } from "./engine";
import { parseRuleEvaluationContext } from "./evaluator";
import {
  archiveClinicalRule,
  createClinicalRule,
  getClinicalRuleById,
  listClinicalRules,
  listRuleExecutions,
  listRuleVersions,
  persistRuleExecution,
  seedMissingSystemRules,
  toExecutableRule,
  updateClinicalRule,
} from "./repository";
import type {
  CreateClinicalRuleInput,
  RuleEvaluationContext,
  SerializedClinicalRule,
  SerializedRuleExecution,
  SerializedRuleVersion,
  UpdateClinicalRuleInput,
} from "./types";

function serializeRule(rule: NonNullable<Awaited<ReturnType<typeof getClinicalRuleById>>>): SerializedClinicalRule {
  return {
    actions: rule.actions.map((action) => ({
      actionType: action.actionType,
      id: action.id,
      payload: (action.payload as Record<string, unknown> | null) ?? undefined,
      sortOrder: action.sortOrder,
    })),
    category: rule.category,
    conditionRootLogic: rule.conditionRootLogic,
    conditions: rule.conditions.map((condition) => ({
      boolValue: condition.boolValue ?? undefined,
      field: condition.field,
      groupId: condition.groupId,
      groupLogic: condition.groupLogic,
      id: condition.id,
      operator: condition.operator,
      sortOrder: condition.sortOrder,
      stringValue: condition.stringValue ?? undefined,
      threshold: condition.threshold ?? undefined,
    })),
    createdAt: rule.createdAt.toISOString(),
    createdById: rule.createdById ?? undefined,
    currentVersion: rule.currentVersion,
    description: rule.description,
    enabled: rule.enabled,
    id: rule.id,
    name: rule.name,
    organizationId: rule.organizationId ?? undefined,
    priority: rule.priority,
    ruleKey: rule.ruleKey,
    status: rule.status,
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function serializeExecution(
  execution: Awaited<ReturnType<typeof listRuleExecutions>>[number],
): SerializedRuleExecution {
  return {
    caseId: execution.caseId ?? undefined,
    executedAt: execution.executedAt.toISOString(),
    executedById: execution.executedById ?? undefined,
    id: execution.id,
    inputSnapshot: execution.inputSnapshot as RuleEvaluationContext,
    matched: execution.matched,
    outputSnapshot: (execution.outputSnapshot as SerializedRuleExecution["outputSnapshot"]) ?? undefined,
    patientId: execution.patientId ?? undefined,
    ruleId: execution.ruleId,
    ruleKey: execution.rule.ruleKey,
    ruleName: execution.rule.name,
    ruleVersion: execution.ruleVersion,
    status: execution.status,
  };
}

function serializeVersion(version: Awaited<ReturnType<typeof listRuleVersions>>[number]): SerializedRuleVersion {
  return {
    changeNotes: version.changeNotes ?? undefined,
    createdAt: version.createdAt.toISOString(),
    createdById: version.createdById ?? undefined,
    id: version.id,
    ruleId: version.ruleId,
    snapshot: version.snapshotJson as Record<string, unknown>,
    versionNumber: version.versionNumber,
  };
}

export async function buildContextFromCase(caseId: string): Promise<RuleEvaluationContext & { patientId: string }> {
  const ecgCase = await prisma.eCGCase.findUnique({
    select: { id: true, patientId: true, rhythm: true },
    where: { id: caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

  const measurement = await resolveCaseMeasurement(caseId);
  const intelligence = runMedicalIntelligenceEngine({
    caseId,
    measurement,
    patientId: ecgCase.patientId,
  });

  const riskAssessment = await prisma.eCGRiskAssessment.findFirst({
    orderBy: { versionNumber: "desc" },
    where: { caseId },
  });

  const afDetected =
    intelligence.findings.some((finding) => finding.code === "AF") ||
    measurement.rhythm === "irregular" ||
    String(ecgCase.rhythm ?? "").toLowerCase().includes("fibrillation");

  const bbbDetected =
    intelligence.findings.some((finding) => ["LBBB", "RBBB", "BBB"].includes(finding.code)) ||
    measurement.morphology.includes("wide_qrs") ||
    measurement.intervals.qrsDurationMs > 120;

  const pvcCount = intelligence.findings.filter((finding) => ["PVC", "VT", "BIGEM"].includes(finding.code)).length;

  return {
    ...parseRuleEvaluationContext({
      afDetected,
      bbbDetected,
      clinicalPriority: riskAssessment?.clinicalPriority ?? "ROUTINE",
      heartRate: measurement.heartRate,
      prIntervalMs: measurement.intervals.prIntervalMs,
      pvcCount,
      qrsDurationMs: measurement.intervals.qrsDurationMs,
      qtIntervalMs: measurement.intervals.qtIntervalMs,
      qtcBazettMs: measurement.intervals.qtcBazettMs,
      riskScore: riskAssessment?.riskScore ?? 0,
      stDeviationMm: measurement.amplitudes.stDeviationMm,
      stElevationMm: Math.max(measurement.amplitudes.stDeviationMm, measurement.stDeviation ?? 0),
    }),
    patientId: ecgCase.patientId,
  };
}

export async function listRules(filters?: { category?: string; enabled?: boolean }) {
  await seedMissingSystemRules();
  const rules = await listClinicalRules(filters);
  return rules.map(serializeRule);
}

export async function createRule(input: CreateClinicalRuleInput, createdById?: string) {
  const existing = await prisma.clinicalRule.findUnique({ where: { ruleKey: input.ruleKey } });
  if (existing) throw new AppError(409, "Rule key already exists.", "RULE_KEY_EXISTS");
  const rule = await createClinicalRule(input, createdById);
  return serializeRule(rule);
}

export async function updateRule(id: string, input: UpdateClinicalRuleInput, updatedById?: string) {
  const rule = await updateClinicalRule(id, input, updatedById);
  if (!rule) throw new AppError(404, "Clinical rule not found.", "RULE_NOT_FOUND");
  return serializeRule(rule);
}

export async function deleteRule(id: string) {
  const rule = await archiveClinicalRule(id);
  if (!rule) throw new AppError(404, "Clinical rule not found.", "RULE_NOT_FOUND");
  return serializeRule(rule);
}

export async function getRule(id: string) {
  const rule = await getClinicalRuleById(id);
  if (!rule) throw new AppError(404, "Clinical rule not found.", "RULE_NOT_FOUND");
  return serializeRule(rule);
}

export async function testRules(input: {
  caseId?: string;
  context?: Partial<RuleEvaluationContext>;
  executedById?: string;
  persist?: boolean;
  ruleIds?: string[];
}) {
  await seedMissingSystemRules();

  let context: RuleEvaluationContext;
  let caseId: string | undefined;
  let patientId: string | undefined;

  if (input.caseId) {
    const built = await buildContextFromCase(input.caseId);
    patientId = built.patientId;
    caseId = input.caseId;
    context = built;
  } else {
    context = parseRuleEvaluationContext(input.context ?? {});
  }

  const rules = await listClinicalRules({ enabled: true });
  const selected = input.ruleIds?.length
    ? rules.filter((rule) => input.ruleIds!.includes(rule.id))
    : rules;

  const results = evaluateRulesEngine(selected.map(toExecutableRule), context);
  const matched = matchedRuleResults(results);

  if (input.persist !== false) {
    for (const result of results) {
      const execution = await persistRuleExecution({
        caseId,
        context,
        executedById: input.executedById,
        matched: result.matched,
        output: {
          actions: result.actions,
          conditionResults: result.conditionResults,
        } as Prisma.InputJsonValue,
        patientId,
        ruleId: result.ruleId,
        ruleVersion: result.ruleVersion,
      });

      if (caseId && patientId && input.executedById && result.matched) {
        await recordEngineAudit({
          action: "ENTERPRISE_RULE_EXECUTED",
          actorId: input.executedById,
          caseId,
          message: `Enterprise rule "${result.ruleName}" matched and executed ${result.actions.length} action(s).`,
          metadata: {
            actions: result.actions.map((action) => action.actionType),
            executionId: execution.id,
            ruleId: result.ruleId,
          },
          patientId,
        });
      }
    }
  }

  return {
    context,
    matchedCount: matched.length,
    results,
    totalRules: results.length,
  };
}

export async function getRulesHistory(filters?: { caseId?: string; limit?: number; ruleId?: string }) {
  const executions = await listRuleExecutions(filters);
  return executions.map(serializeExecution);
}

export async function getRuleVersionHistory(ruleId: string) {
  const versions = await listRuleVersions(ruleId);
  return versions.map(serializeVersion);
}

export async function bootstrapSystemRules(createdById?: string) {
  return seedMissingSystemRules(createdById);
}
