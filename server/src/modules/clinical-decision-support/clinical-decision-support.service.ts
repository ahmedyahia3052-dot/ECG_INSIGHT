import type { CaseClinicalRecommendation, FollowUpPlan, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { measureCaseFromStoredLeads } from "../ecg-measurement";
import { runMedicalIntelligenceFromMeasurements } from "../medical-intelligence/orchestrator";
import { logClinicalDecisionSupportAudit } from "./audit.service";
import { DEFAULT_DECISION_SUPPORT_RULES } from "./decision-rules";
import { generateFollowUpPlan } from "./follow-up-engine";
import { generateClinicalRecommendations } from "./recommendation-engine";
import type {
  DecisionSupportEvaluationInput,
  SerializedCaseClinicalRecommendation,
  SerializedFollowUpPlan,
  SupportingFinding,
} from "./types";
import { CLINICAL_DECISION_SUPPORT_VERSION } from "./types";

function serializeRecommendation(record: CaseClinicalRecommendation): SerializedCaseClinicalRecommendation {
  return {
    acceptedAt: record.acceptedAt?.toISOString(),
    action: record.action,
    caseId: record.caseId,
    clinicalEvidence: record.clinicalEvidence as unknown as SerializedCaseClinicalRecommendation["clinicalEvidence"],
    confidence: record.confidence,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    priorityScore: record.priorityScore,
    reasoning: record.reasoning,
    recommendationType: record.recommendationType,
    rejectedAt: record.rejectedAt?.toISOString(),
    rejectionReason: record.rejectionReason ?? undefined,
    ruleCode: record.ruleCode ?? undefined,
    status: record.status,
    supportingFindings: record.supportingFindings as unknown as SupportingFinding[],
    title: record.title,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializeFollowUp(plan: FollowUpPlan & { reminders: Array<{ acknowledgedAt: Date | null; id: string; reminderDate: Date; sentAt: Date | null; status: string }> }): SerializedFollowUpPlan {
  return {
    caseId: plan.caseId,
    completedAt: plan.completedAt?.toISOString(),
    createdAt: plan.createdAt.toISOString(),
    id: plan.id,
    nextEcgDate: plan.nextEcgDate?.toISOString(),
    priority: plan.priority,
    reasoning: plan.reasoning ?? undefined,
    recommendedIntervalDays: plan.recommendedIntervalDays,
    reminders: plan.reminders.map((reminder) => ({
      acknowledgedAt: reminder.acknowledgedAt?.toISOString(),
      id: reminder.id,
      reminderDate: reminder.reminderDate.toISOString(),
      sentAt: reminder.sentAt?.toISOString(),
      status: reminder.status,
    })),
    reviewStatus: plan.reviewStatus,
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function seedDecisionSupportRules() {
  for (const rule of DEFAULT_DECISION_SUPPORT_RULES) {
    await prisma.decisionSupportRule.upsert({
      create: {
        criteriaJson: rule.criteriaJson as Prisma.InputJsonObject,
        description: rule.description,
        enabled: true,
        evidenceLevel: rule.evidenceLevel,
        name: rule.name,
        priorityWeight: rule.priorityWeight,
        recommendationTypes: rule.recommendationTypes,
        ruleCode: rule.ruleCode,
        version: CLINICAL_DECISION_SUPPORT_VERSION,
      },
      update: {
        criteriaJson: rule.criteriaJson as Prisma.InputJsonObject,
        description: rule.description,
        evidenceLevel: rule.evidenceLevel,
        name: rule.name,
        priorityWeight: rule.priorityWeight,
        recommendationTypes: rule.recommendationTypes,
        version: CLINICAL_DECISION_SUPPORT_VERSION,
      },
      where: { ruleCode: rule.ruleCode },
    });
  }
}

async function loadCaseContext(caseId: string) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return ecgCase;
}

async function buildEvaluationInput(caseId: string, patientId: string): Promise<DecisionSupportEvaluationInput> {
  const measurement = await measureCaseFromStoredLeads(caseId);
  const medicalReport = measurement ? runMedicalIntelligenceFromMeasurements(measurement) : null;
  const structuredFindings: SupportingFinding[] =
    medicalReport?.findings.map((finding) => ({
      code: finding.code,
      label: finding.label,
      severity: finding.severity,
    })) ?? [];

  return {
    caseId,
    heartRate: measurement?.heartRate,
    measurementConfidence: measurement?.confidence,
    morphology: measurement?.morphology,
    patientId,
    prIntervalMs: measurement?.intervals.prIntervalMs,
    qrsDurationMs: measurement?.intervals.qrsDurationMs,
    qtIntervalMs: measurement?.intervals.qtIntervalMs,
    qtcBazettMs: measurement?.intervals.qtcBazettMs,
    rhythm: measurement?.rhythm,
    stDeviationMm: measurement?.stDeviation,
    structuredFindings,
  };
}

export async function listRecommendationsForCase(caseId: string) {
  const records = await prisma.caseClinicalRecommendation.findMany({
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    where: { caseId, status: { not: "SUPERSEDED" } },
  });
  return records.map(serializeRecommendation);
}

export async function regenerateRecommendationsForCase(caseId: string, actorId: string) {
  await seedDecisionSupportRules();
  const ecgCase = await loadCaseContext(caseId);
  const evaluation = await buildEvaluationInput(caseId, ecgCase.patientId);
  const generated = generateClinicalRecommendations(evaluation);

  await prisma.caseClinicalRecommendation.updateMany({
    data: { status: "SUPERSEDED" },
    where: { caseId, status: "GENERATED" },
  });

  const persisted = [];
  for (const item of generated) {
    const record = await prisma.caseClinicalRecommendation.create({
      data: {
        action: item.action,
        caseId,
        clinicalEvidence: item.clinicalEvidence as unknown as Prisma.InputJsonArray,
        confidence: item.confidence,
        generatedById: actorId,
        patientId: ecgCase.patientId,
        priorityScore: item.priorityScore,
        reasoning: item.reasoning,
        recommendationType: item.recommendationType,
        ruleCode: item.ruleCode,
        status: "GENERATED",
        supportingFindings: item.supportingFindings as unknown as Prisma.InputJsonArray,
        title: item.title,
      },
    });
    persisted.push(record);
    await logClinicalDecisionSupportAudit({
      action: "CLINICAL_RECOMMENDATION_GENERATED",
      actorId,
      caseId,
      entityId: record.id,
      entityType: "CaseClinicalRecommendation",
      message: `Generated ${item.title} recommendation for case.`,
      metadata: {
        confidence: item.confidence,
        priorityScore: item.priorityScore,
        recommendationType: item.recommendationType,
        ruleCode: item.ruleCode,
      },
      patientId: ecgCase.patientId,
    });
  }

  return persisted.map(serializeRecommendation);
}

export async function acceptRecommendation(recommendationId: string, actorId: string) {
  const record = await prisma.caseClinicalRecommendation.findUnique({ where: { id: recommendationId } });
  if (!record) throw new AppError(404, "Recommendation not found.", "RECOMMENDATION_NOT_FOUND");
  const updated = await prisma.caseClinicalRecommendation.update({
    data: { acceptedAt: new Date(), acceptedById: actorId, status: "ACCEPTED" },
    where: { id: recommendationId },
  });
  await logClinicalDecisionSupportAudit({
    action: "CLINICAL_RECOMMENDATION_ACCEPTED",
    actorId,
    caseId: updated.caseId,
    entityId: updated.id,
    entityType: "CaseClinicalRecommendation",
    message: `Recommendation accepted: ${updated.title}.`,
    patientId: updated.patientId,
  });
  return serializeRecommendation(updated);
}

export async function rejectRecommendation(recommendationId: string, actorId: string, rejectionReason?: string) {
  const record = await prisma.caseClinicalRecommendation.findUnique({ where: { id: recommendationId } });
  if (!record) throw new AppError(404, "Recommendation not found.", "RECOMMENDATION_NOT_FOUND");
  const updated = await prisma.caseClinicalRecommendation.update({
    data: {
      rejectedAt: new Date(),
      rejectedById: actorId,
      rejectionReason,
      status: "REJECTED",
    },
    where: { id: recommendationId },
  });
  await logClinicalDecisionSupportAudit({
    action: "CLINICAL_RECOMMENDATION_REJECTED",
    actorId,
    caseId: updated.caseId,
    entityId: updated.id,
    entityType: "CaseClinicalRecommendation",
    message: `Recommendation rejected: ${updated.title}.`,
    metadata: { rejectionReason },
    patientId: updated.patientId,
  });
  return serializeRecommendation(updated);
}

export async function getFollowUpForCase(caseId: string) {
  const plan = await prisma.followUpPlan.findFirst({
    include: { reminders: { orderBy: { reminderDate: "asc" } } },
    orderBy: { createdAt: "desc" },
    where: { caseId, reviewStatus: { not: "CANCELLED" } },
  });
  return plan ? serializeFollowUp(plan) : null;
}

export async function generateFollowUpForCase(caseId: string, actorId: string) {
  const ecgCase = await loadCaseContext(caseId);
  let recommendations = await listRecommendationsForCase(caseId);
  if (!recommendations.length) {
    recommendations = await regenerateRecommendationsForCase(caseId, actorId);
  }

  const generated = generateFollowUpPlan(
    recommendations.map((item) => ({
      action: item.action,
      clinicalEvidence: item.clinicalEvidence,
      confidence: item.confidence,
      priorityScore: item.priorityScore,
      reasoning: item.reasoning,
      recommendationType: item.recommendationType,
      ruleCode: item.ruleCode,
      supportingFindings: item.supportingFindings,
      title: item.title,
    })),
  );

  const plan = await prisma.followUpPlan.create({
    data: {
      caseId,
      generatedById: actorId,
      nextEcgDate: new Date(generated.nextEcgDate),
      patientId: ecgCase.patientId,
      priority: generated.priority,
      reasoning: generated.reasoning,
      recommendedIntervalDays: generated.recommendedIntervalDays,
      reviewStatus: generated.reviewStatus,
      reminders: {
        create: generated.reminderDates.map((reminderDate) => ({
          caseId,
          patientId: ecgCase.patientId,
          reminderDate: new Date(reminderDate),
        })),
      },
    },
    include: { reminders: true },
  });

  await logClinicalDecisionSupportAudit({
    action: "FOLLOW_UP_PLAN_CREATED",
    actorId,
    caseId,
    entityId: plan.id,
    entityType: "FollowUpPlan",
    message: `Follow-up plan created with next ECG on ${generated.nextEcgDate}.`,
    metadata: {
      nextEcgDate: generated.nextEcgDate,
      priority: generated.priority,
      recommendedIntervalDays: generated.recommendedIntervalDays,
    },
    patientId: ecgCase.patientId,
  });

  return serializeFollowUp(plan);
}
