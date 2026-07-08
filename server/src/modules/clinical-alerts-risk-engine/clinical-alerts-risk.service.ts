import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { resolveCaseMeasurement } from "../ai-report-generator/measurement-adapter";
import { runMedicalIntelligenceEngine } from "../medical-intelligence/orchestrator";
import { detectClinicalAlerts } from "./alert-engine";
import { recordEngineAudit } from "./audit";
import { calculateRiskAssessment } from "./risk-engine";
import {
  getActiveAlertsForCase,
  getLatestRiskAssessment,
  listAlertHistory,
  persistDetectedAlerts,
  persistRiskAssessment,
  recordAlertHistory,
  supersedeActiveAlerts,
} from "./repository";
import type { SerializedEcgClinicalAlert, SerializedEcgRiskAssessment } from "./types";
import { CLINICAL_ALERTS_RISK_ENGINE_VERSION } from "./types";

async function loadCase(caseId: string) {
  const ecgCase = await prisma.eCGCase.findUnique({
    include: {
      patient: { select: { gender: true, id: true, organizationId: true } },
    },
    where: { id: caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return ecgCase;
}

export function serializeAlert(alert: Awaited<ReturnType<typeof getActiveAlertsForCase>>[number]): SerializedEcgClinicalAlert {
  return {
    alertCode: alert.alertCode ?? undefined,
    alertSeverity: alert.alertSeverity ?? undefined,
    alertType: alert.alertType,
    caseId: alert.caseId ?? undefined,
    confidenceScore: alert.confidenceScore,
    createdAt: alert.createdAt.toISOString(),
    engineVersion: alert.engineVersion ?? undefined,
    evidence: (alert.evidence as SerializedEcgClinicalAlert["evidence"]) ?? undefined,
    id: alert.id,
    message: alert.message,
    patientId: alert.patientId,
    severity: alert.severity,
    sourceEngine: alert.sourceEngine ?? undefined,
    status: alert.status,
    supportingFindings: (alert.supportingFindings as string[] | null) ?? undefined,
  };
}

export function serializeRiskAssessment(
  assessment: NonNullable<Awaited<ReturnType<typeof getLatestRiskAssessment>>>,
): SerializedEcgRiskAssessment {
  return {
    assessmentGroupId: assessment.assessmentGroupId,
    calculatedById: assessment.calculatedById ?? undefined,
    caseId: assessment.caseId,
    clinicalPriority: assessment.clinicalPriority,
    confidence: assessment.confidence,
    createdAt: assessment.createdAt.toISOString(),
    engineVersion: assessment.engineVersion,
    factors: assessment.factors.map((factor) => ({
      category: factor.category,
      code: factor.code,
      contribution: factor.contribution,
      evidence: factor.evidence,
      label: factor.label,
      weight: factor.weight,
    })),
    id: assessment.id,
    patientId: assessment.patientId,
    riskCategory: assessment.riskCategory,
    riskScore: assessment.riskScore,
    supportingFindings: assessment.supportingFindings as string[],
    urgency: assessment.urgency,
    versionNumber: assessment.versionNumber,
  };
}

async function buildDetectionContext(caseId: string) {
  const ecgCase = await loadCase(caseId);
  const [measurement, analysis] = await Promise.all([
    resolveCaseMeasurement(caseId),
    prisma.aIAnalysis.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId } }),
  ]);
  const intelligence = runMedicalIntelligenceEngine({
    caseId,
    measurement,
    patientId: ecgCase.patientId,
  });
  return { analysis, ecgCase, intelligence, measurement };
}

export async function evaluateCaseAlertsAndRisk(caseId: string, actorId?: string, recalculate = false) {
  const { analysis, ecgCase, intelligence, measurement } = await buildDetectionContext(caseId);
  const detected = detectClinicalAlerts({
    analysisRhythm: analysis?.rhythm,
    caseRhythm: ecgCase.rhythm,
    intelligence,
    measurement,
    patientGender: ecgCase.patient.gender,
  });
  const riskDraft = calculateRiskAssessment(detected, measurement.confidence);

  await supersedeActiveAlerts(caseId);
  const persistedAlerts = await persistDetectedAlerts({
    alerts: detected,
    caseId,
    generatedById: actorId,
    organizationId: ecgCase.patient.organizationId ?? undefined,
    patientId: ecgCase.patientId,
  });

  const previous = await getLatestRiskAssessment(caseId);
  let assessment: NonNullable<Awaited<ReturnType<typeof getLatestRiskAssessment>>>;
  if (recalculate || !previous) {
    const nextVersion = previous ? previous.versionNumber + 1 : 1;
    assessment = await persistRiskAssessment({
      assessmentGroupId: previous?.assessmentGroupId,
      calculatedById: actorId,
      caseId,
      draft: riskDraft,
      patientId: ecgCase.patientId,
      versionNumber: nextVersion,
    });
  } else {
    assessment = previous;
  }

  const alertHistory = await recordAlertHistory({
    actorId,
    caseId,
    eventType: recalculate ? "ALERT_GENERATED" : "ALERT_GENERATED",
    patientId: ecgCase.patientId,
    payload: {
      alertCount: persistedAlerts.length,
      alertCodes: detected.map((alert) => alert.alertCode),
      engineVersion: CLINICAL_ALERTS_RISK_ENGINE_VERSION,
    },
  });

  await recordAlertHistory({
    actorId,
    assessmentId: assessment.id,
    caseId,
    eventType: recalculate ? "RISK_RECALCULATED" : "RISK_CALCULATED",
    patientId: ecgCase.patientId,
    payload: {
      engineVersion: CLINICAL_ALERTS_RISK_ENGINE_VERSION,
      riskCategory: assessment.riskCategory,
      riskScore: assessment.riskScore,
      versionNumber: assessment.versionNumber,
    },
  });

  await recordEngineAudit({
    action: "ECG_ALERT_ENGINE_GENERATED",
    actorId: actorId ?? ecgCase.uploadedById,
    caseId,
    message: `Generated ${persistedAlerts.length} ECG clinical alert(s) for case.`,
    metadata: {
      alertCodes: detected.map((alert) => alert.alertCode),
      historyId: alertHistory.id,
    },
    patientId: ecgCase.patientId,
  });

  await recordEngineAudit({
    action: recalculate ? "ECG_RISK_ENGINE_RECALCULATED" : "RISK_ASSESSMENT_COMPLETED",
    actorId: actorId ?? ecgCase.uploadedById,
    caseId,
    message: `ECG risk assessment ${recalculate ? "recalculated" : "calculated"} (score ${assessment.riskScore}, category ${assessment.riskCategory}).`,
    metadata: {
      assessmentId: assessment.id,
      riskCategory: assessment.riskCategory,
      riskScore: assessment.riskScore,
      versionNumber: assessment.versionNumber,
    },
    patientId: ecgCase.patientId,
  });

  return {
    alerts: persistedAlerts.map(serializeAlert),
    assessment: serializeRiskAssessment(assessment),
    detectedCount: detected.length,
  };
}

export async function getCaseAlerts(caseId: string, actorId?: string) {
  let alerts = await getActiveAlertsForCase(caseId);
  if (!alerts.length) {
    await evaluateCaseAlertsAndRisk(caseId, actorId, false);
    alerts = await getActiveAlertsForCase(caseId);
  }
  return alerts.map(serializeAlert);
}

export async function getCaseRiskAssessment(caseId: string, actorId?: string) {
  let assessment = await getLatestRiskAssessment(caseId);
  if (!assessment) {
    await evaluateCaseAlertsAndRisk(caseId, actorId, false);
    assessment = await getLatestRiskAssessment(caseId);
  }
  if (!assessment) throw new AppError(404, "Risk assessment not available for case.", "RISK_ASSESSMENT_NOT_FOUND");
  return serializeRiskAssessment(assessment);
}

export async function recalculateCaseRisk(caseId: string, actorId?: string) {
  return evaluateCaseAlertsAndRisk(caseId, actorId, true);
}

export async function getCaseAlertAuditTrail(caseId: string) {
  const history = await listAlertHistory(caseId);
  return history.map((entry) => ({
    actorId: entry.actorId ?? undefined,
    assessmentId: entry.assessmentId ?? undefined,
    alertId: entry.alertId ?? undefined,
    caseId: entry.caseId,
    createdAt: entry.createdAt.toISOString(),
    eventType: entry.eventType,
    id: entry.id,
    payload: entry.payload,
  }));
}
