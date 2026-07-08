import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ENTERPRISE_SYSTEM_RULE_TEMPLATES } from "./catalog";
import type { CreateClinicalRuleInput, UpdateClinicalRuleInput } from "./types";
import { ENTERPRISE_RULES_ENGINE_VERSION } from "./types";

const ruleInclude = {
  actions: { orderBy: { sortOrder: "asc" as const } },
  conditions: { orderBy: { sortOrder: "asc" as const } },
};

export async function listClinicalRules(filters?: { enabled?: boolean; category?: string }) {
  return prisma.clinicalRule.findMany({
    include: ruleInclude,
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    where: {
      ...(filters?.enabled !== undefined ? { enabled: filters.enabled } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      status: { not: "ARCHIVED" },
    },
  });
}

export async function getClinicalRuleById(id: string) {
  return prisma.clinicalRule.findUnique({
    include: ruleInclude,
    where: { id },
  });
}

export async function getClinicalRuleByKey(ruleKey: string) {
  return prisma.clinicalRule.findUnique({
    include: ruleInclude,
    where: { ruleKey },
  });
}

function snapshotFromRule(rule: Awaited<ReturnType<typeof getClinicalRuleById>>) {
  if (!rule) return {};
  return {
    actions: rule.actions,
    category: rule.category,
    conditionRootLogic: rule.conditionRootLogic,
    conditions: rule.conditions,
    description: rule.description,
    enabled: rule.enabled,
    name: rule.name,
    priority: rule.priority,
    ruleKey: rule.ruleKey,
    status: rule.status,
    version: rule.currentVersion,
  };
}

export async function createClinicalRule(input: CreateClinicalRuleInput, createdById?: string) {
  const created = await prisma.clinicalRule.create({
    data: {
      actions: {
        create: input.actions.map((action, index) => ({
          actionType: action.actionType,
          payload: action.payload as Prisma.InputJsonValue | undefined,
          sortOrder: action.sortOrder ?? index,
        })),
      },
      category: input.category,
      conditionRootLogic: input.conditionRootLogic ?? "AND",
      conditions: {
        create: input.conditions.map((condition, index) => ({
          boolValue: condition.boolValue,
          field: condition.field,
          groupId: condition.groupId ?? "default",
          groupLogic: condition.groupLogic ?? "AND",
          operator: condition.operator,
          sortOrder: condition.sortOrder ?? index,
          stringValue: condition.stringValue,
          threshold: condition.threshold,
        })),
      },
      createdById,
      currentVersion: 1,
      description: input.description,
      enabled: input.enabled ?? true,
      name: input.name,
      organizationId: input.organizationId,
      priority: input.priority ?? 100,
      ruleKey: input.ruleKey,
      status: input.status ?? "ACTIVE",
      versions: {
        create: {
          category: input.category,
          changeNotes: "Initial version",
          conditionRootLogic: input.conditionRootLogic ?? "AND",
          createdById,
          description: input.description,
          enabled: input.enabled ?? true,
          name: input.name,
          priority: input.priority ?? 100,
          snapshotJson: {
            actions: input.actions,
            conditions: input.conditions,
            engineVersion: ENTERPRISE_RULES_ENGINE_VERSION,
          } as Prisma.InputJsonValue,
          status: input.status ?? "ACTIVE",
          versionNumber: 1,
        },
      },
    },
  });
  const rule = await getClinicalRuleById(created.id);
  if (!rule) throw new Error("Failed to load created clinical rule.");
  return rule;
}

export async function updateClinicalRule(id: string, input: UpdateClinicalRuleInput, updatedById?: string) {
  const existing = await getClinicalRuleById(id);
  if (!existing) return null;

  const nextVersion = existing.currentVersion + 1;
  const nextName = input.name ?? existing.name;
  const nextDescription = input.description ?? existing.description;
  const nextCategory = input.category ?? existing.category;
  const nextPriority = input.priority ?? existing.priority;
  const nextEnabled = input.enabled ?? existing.enabled;
  const nextStatus = input.status ?? existing.status;
  const nextRootLogic = input.conditionRootLogic ?? existing.conditionRootLogic;

  return prisma.$transaction(async (tx) => {
    if (input.conditions) {
      await tx.ruleCondition.deleteMany({ where: { ruleId: id } });
    }
    if (input.actions) {
      await tx.ruleAction.deleteMany({ where: { ruleId: id } });
    }

    const updated = await tx.clinicalRule.update({
      data: {
        category: nextCategory,
        conditionRootLogic: nextRootLogic,
        conditions: input.conditions
          ? {
              create: input.conditions.map((condition, index) => ({
                boolValue: condition.boolValue,
                field: condition.field,
                groupId: condition.groupId ?? "default",
                groupLogic: condition.groupLogic ?? "AND",
                operator: condition.operator,
                sortOrder: condition.sortOrder ?? index,
                stringValue: condition.stringValue,
                threshold: condition.threshold,
              })),
            }
          : undefined,
        actions: input.actions
          ? {
              create: input.actions.map((action, index) => ({
                actionType: action.actionType,
                payload: action.payload as Prisma.InputJsonValue | undefined,
                sortOrder: action.sortOrder ?? index,
              })),
            }
          : undefined,
        currentVersion: nextVersion,
        description: nextDescription,
        enabled: nextEnabled,
        name: nextName,
        priority: nextPriority,
        status: nextStatus,
        versions: {
          create: {
            category: nextCategory,
            changeNotes: input.changeNotes ?? `Updated to version ${nextVersion}`,
            conditionRootLogic: nextRootLogic,
            createdById: updatedById,
            description: nextDescription,
            enabled: nextEnabled,
            name: nextName,
            priority: nextPriority,
            snapshotJson: {
              actions: input.actions ?? existing.actions,
              conditions: input.conditions ?? existing.conditions,
              engineVersion: ENTERPRISE_RULES_ENGINE_VERSION,
              previousVersion: existing.currentVersion,
            } as Prisma.InputJsonValue,
            status: nextStatus,
            versionNumber: nextVersion,
          },
        },
      },
      where: { id },
    });

    const rule = await tx.clinicalRule.findUnique({ include: ruleInclude, where: { id: updated.id } });
    if (!rule) throw new Error("Failed to load updated clinical rule.");
    return rule;
  });
}

export async function archiveClinicalRule(id: string) {
  return prisma.clinicalRule.update({
    data: { enabled: false, status: "ARCHIVED" },
    include: ruleInclude,
    where: { id },
  });
}

export async function listRuleVersions(ruleId: string) {
  return prisma.ruleVersion.findMany({
    orderBy: { versionNumber: "desc" },
    where: { ruleId },
  });
}

export async function listRuleExecutions(filters?: { caseId?: string; limit?: number; ruleId?: string }) {
  return prisma.ruleExecution.findMany({
    include: { rule: { select: { name: true, ruleKey: true } } },
    orderBy: { executedAt: "desc" },
    take: filters?.limit ?? 100,
    where: {
      ...(filters?.caseId ? { caseId: filters.caseId } : {}),
      ...(filters?.ruleId ? { ruleId: filters.ruleId } : {}),
    },
  });
}

export async function persistRuleExecution(input: {
  caseId?: string;
  context: Prisma.InputJsonValue;
  executedById?: string;
  matched: boolean;
  output?: Prisma.InputJsonValue;
  patientId?: string;
  ruleId: string;
  ruleVersion: number;
}) {
  return prisma.ruleExecution.create({
    data: {
      caseId: input.caseId,
      executedById: input.executedById,
      inputSnapshot: input.context,
      matched: input.matched,
      outputSnapshot: input.output,
      patientId: input.patientId,
      ruleId: input.ruleId,
      ruleVersion: input.ruleVersion,
      status: input.matched ? "MATCHED" : "NOT_MATCHED",
    },
    include: { rule: { select: { name: true, ruleKey: true } } },
  });
}

export async function seedMissingSystemRules(createdById?: string) {
  let seeded = 0;
  for (const template of ENTERPRISE_SYSTEM_RULE_TEMPLATES) {
    const existing = await getClinicalRuleByKey(template.ruleKey);
    if (existing) continue;
    await createClinicalRule(template, createdById);
    seeded += 1;
  }
  return { seeded, totalTemplates: ENTERPRISE_SYSTEM_RULE_TEMPLATES.length };
}

export function toExecutableRule(rule: NonNullable<Awaited<ReturnType<typeof getClinicalRuleById>>>) {
  return {
    actions: rule.actions.map((action) => ({
      actionType: action.actionType,
      payload: (action.payload as Record<string, unknown> | null) ?? undefined,
      sortOrder: action.sortOrder,
    })),
    conditionRootLogic: rule.conditionRootLogic,
    conditions: rule.conditions.map((condition) => ({
      boolValue: condition.boolValue ?? undefined,
      field: condition.field,
      groupId: condition.groupId,
      groupLogic: condition.groupLogic,
      operator: condition.operator,
      sortOrder: condition.sortOrder,
      stringValue: condition.stringValue ?? undefined,
      threshold: condition.threshold ?? undefined,
    })),
    id: rule.id,
    name: rule.name,
    priority: rule.priority,
    ruleKey: rule.ruleKey,
    version: rule.currentVersion,
  };
}

export { snapshotFromRule };
