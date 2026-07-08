import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { DetectedClinicalAlert, RiskAssessmentDraft } from "./types";
import {
  CLINICAL_ALERTS_RISK_ENGINE_VERSION,
  CLINICAL_ALERTS_RISK_SOURCE_ENGINE,
  severityToAiSeverity,
} from "./types";

export async function supersedeActiveAlerts(caseId: string) {
  return prisma.eCGClinicalAlert.updateMany({
    data: { status: "SUPERSEDED", supersededAt: new Date() },
    where: {
      caseId,
      sourceEngine: CLINICAL_ALERTS_RISK_SOURCE_ENGINE,
      status: "ACTIVE",
    },
  });
}

export async function persistDetectedAlerts(input: {
  alerts: DetectedClinicalAlert[];
  caseId: string;
  generatedById?: string;
  organizationId?: string;
  patientId: string;
}) {
  if (!input.alerts.length) return [];

  return Promise.all(
    input.alerts.map((alert) =>
      prisma.eCGClinicalAlert.create({
        data: {
          alertCode: alert.alertCode,
          alertSeverity: alert.alertSeverity,
          alertType: alert.alertType,
          caseId: input.caseId,
          confidenceScore: alert.confidence,
          engineVersion: CLINICAL_ALERTS_RISK_ENGINE_VERSION,
          evidence: alert.evidence as unknown as Prisma.InputJsonValue,
          generatedById: input.generatedById,
          message: alert.message,
          organizationId: input.organizationId,
          patientId: input.patientId,
          severity: severityToAiSeverity(alert.alertSeverity),
          sourceEngine: CLINICAL_ALERTS_RISK_SOURCE_ENGINE,
          status: "ACTIVE",
          supportingFindings: alert.supportingFindings,
        },
      }),
    ),
  );
}

export async function getActiveAlertsForCase(caseId: string) {
  return prisma.eCGClinicalAlert.findMany({
    orderBy: [{ alertSeverity: "desc" }, { createdAt: "desc" }],
    where: {
      caseId,
      sourceEngine: CLINICAL_ALERTS_RISK_SOURCE_ENGINE,
      status: "ACTIVE",
    },
  });
}

export async function getLatestRiskAssessment(caseId: string) {
  return prisma.eCGRiskAssessment.findFirst({
    include: { factors: { orderBy: { contribution: "desc" } } },
    orderBy: { versionNumber: "desc" },
    where: { caseId },
  });
}

export async function persistRiskAssessment(input: {
  assessmentGroupId?: string;
  calculatedById?: string;
  caseId: string;
  draft: RiskAssessmentDraft;
  patientId: string;
  versionNumber: number;
}) {
  const groupId = input.assessmentGroupId ?? randomUUID();
  return prisma.eCGRiskAssessment.create({
    data: {
      assessmentGroupId: groupId,
      calculatedById: input.calculatedById,
      caseId: input.caseId,
      clinicalPriority: input.draft.clinicalPriority,
      confidence: input.draft.confidence,
      engineVersion: CLINICAL_ALERTS_RISK_ENGINE_VERSION,
      factors: {
        create: input.draft.factors.map((factor) => ({
          category: factor.category,
          code: factor.code,
          contribution: factor.contribution,
          evidence: factor.evidence,
          label: factor.label,
          weight: factor.weight,
        })),
      },
      patientId: input.patientId,
      riskCategory: input.draft.riskCategory,
      riskScore: input.draft.riskScore,
      supportingFindings: input.draft.supportingFindings,
      urgency: input.draft.urgency,
      versionNumber: input.versionNumber,
    },
    include: { factors: true },
  });
}

export async function recordAlertHistory(input: {
  actorId?: string;
  alertId?: string;
  assessmentId?: string;
  caseId: string;
  eventType: "ALERT_GENERATED" | "ALERT_ACKNOWLEDGED" | "RISK_CALCULATED" | "RISK_RECALCULATED";
  patientId: string;
  payload: Prisma.InputJsonValue;
}) {
  return prisma.eCGAlertHistory.create({
    data: {
      actorId: input.actorId,
      alertId: input.alertId,
      assessmentId: input.assessmentId,
      caseId: input.caseId,
      eventType: input.eventType,
      patientId: input.patientId,
      payload: input.payload,
    },
  });
}

export async function listAlertHistory(caseId: string, limit = 50) {
  return prisma.eCGAlertHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    where: { caseId },
  });
}
