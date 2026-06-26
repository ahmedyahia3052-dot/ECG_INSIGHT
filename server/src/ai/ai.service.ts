import type { AIAnalysis, AIAnalysisStatus, AISeverity, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import {
  assertCaseCanAcceptAnalysis,
  assertCaseStatusTransition,
  canTransitionCaseStatus,
  isReadOnlyCaseStatus,
} from "../cases/state-machine";
import { AppError } from "../middleware/error";
import { ensureClinicalReportForCase } from "../modules/reports/reports.service";
import { createNotification } from "../utils/notifications";
import { isCriticalDiagnosis } from "./engine";
import { generateExplainabilityArtifact } from "./explainability";
import { toJsonObject } from "./preprocessing.pipeline";
import { getAIProvider } from "./providers";

const AI_VERSION = "ecg-insight-ai-v1.0.0";
const activeJobs = new Set<string>();

export function serializeAnalysis(analysis: AIAnalysis) {
  return {
    aiVersion: analysis.aiVersion,
    caseId: analysis.caseId,
    confidenceScore: analysis.confidenceScore,
    createdAt: analysis.createdAt.toISOString(),
    diagnosis: analysis.diagnosis,
    heartRate: analysis.heartRate,
    id: analysis.id,
    interpretation: analysis.interpretation,
    processingTime: analysis.processingTime,
    recommendations: analysis.recommendations,
    rhythm: analysis.rhythm,
    severity: analysis.severity.toLowerCase(),
    status: analysis.status.toLowerCase(),
    urgentActions: analysis.urgentActions,
  };
}

function isCritical(analysis: Pick<AIAnalysis, "diagnosis" | "severity">) {
  return isCriticalDiagnosis(analysis.diagnosis, analysis.severity);
}

async function completeAnalysis(analysisId: string, actorId: string) {
  const started = Date.now();
  const queued = await prisma.aIAnalysis.findUnique({
    include: { case: true },
    where: { id: analysisId },
  });
  if (!queued || activeJobs.has(analysisId)) return;

  activeJobs.add(analysisId);
  try {
    await prisma.aIAnalysis.update({
      data: { status: "PROCESSING" },
      where: { id: analysisId },
    });
    const processingCase = await prisma.eCGCase.findUnique({ where: { id: queued.caseId } });
    if (processingCase && processingCase.status !== "PROCESSING" && canTransitionCaseStatus(processingCase.status, "PROCESSING")) {
      await prisma.eCGCase.update({
        data: { aiStatus: "PROCESSING", status: "PROCESSING" },
        where: { id: queued.caseId },
      });
      await prisma.auditLog.create({
        data: {
          action: "CASE_STATUS_CHANGED",
          actorId,
          caseId: queued.caseId,
          message: `ECG case status changed from ${processingCase.status} to PROCESSING.`,
          metadata: { from: processingCase.status, to: "PROCESSING" },
          patientId: processingCase.patientId,
        },
      });
    }

    const measurement = await prisma.eCGMeasurement.findFirst({
      orderBy: { createdAt: "desc" },
      where: { caseId: queued.caseId },
    });
    const provider = getAIProvider();
    const engineResult = await provider.analyze({ actorId, case: queued.case, measurement });
    const explainability = generateExplainabilityArtifact({
      confidenceScore: engineResult.confidenceScore,
      detectedAbnormalities: engineResult.detectedAbnormalities,
      diagnosis: engineResult.primaryDiagnosis,
      interpretation: engineResult.interpretation,
      measurement,
      rationale: engineResult.interpretationRationale,
      severity: engineResult.severity,
    });
    const analysis = await prisma.aIAnalysis.update({
      data: {
        aiVersion: `${AI_VERSION}:${engineResult.provider.name}:${engineResult.provider.modelVersion}`,
        confidenceScore: engineResult.confidenceScore,
        diagnosis: engineResult.primaryDiagnosis,
        heartRate: engineResult.heartRate,
        interpretation: engineResult.interpretation,
        processingTime: Date.now() - started,
        recommendations: engineResult.recommendations,
        rhythm: engineResult.rhythm,
        severity: engineResult.severity,
        status: "COMPLETED",
        urgentActions: engineResult.urgentActions,
      },
      where: { id: analysisId },
    });

    const latestCase = await prisma.eCGCase.findUnique({ where: { id: queued.caseId } });
    if (latestCase && canTransitionCaseStatus(latestCase.status, "AI_COMPLETED")) {
      await prisma.eCGCase.update({
        data: {
          aiStatus: "COMPLETED",
          aiDiagnosis: analysis.diagnosis,
          aiModelVersion: analysis.aiVersion,
          confidenceScore: analysis.confidenceScore,
          explainabilityData: toJsonObject(explainability),
          finalDiagnosis: analysis.diagnosis,
          heartRate: analysis.heartRate,
          priority: isCritical(analysis) ? "CRITICAL" : latestCase.priority,
          recommendations: analysis.recommendations.join("\n"),
          rhythm: analysis.rhythm,
          severity: isCritical(analysis) ? "CRITICAL" : analysis.severity === "NORMAL" ? "NORMAL" : "ABNORMAL",
          status: "AI_COMPLETED",
        },
        where: { id: queued.caseId },
      });
      await prisma.auditLog.create({
        data: {
          action: "CASE_STATUS_CHANGED",
          actorId,
          caseId: queued.caseId,
          message: `ECG case status changed from ${latestCase.status} to AI_COMPLETED.`,
          metadata: { from: latestCase.status, to: "AI_COMPLETED" },
          patientId: latestCase.patientId,
        },
      });
    } else if (latestCase && !isReadOnlyCaseStatus(latestCase.status)) {
      await prisma.eCGCase.update({
        data: {
          aiStatus: "COMPLETED",
          aiDiagnosis: analysis.diagnosis,
          aiModelVersion: analysis.aiVersion,
          confidenceScore: analysis.confidenceScore,
          explainabilityData: toJsonObject(explainability),
        },
        where: { id: queued.caseId },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "AI_ANALYSIS_COMPLETED",
        actorId,
        caseId: queued.caseId,
        message: `AI analysis completed: ${analysis.diagnosis}.`,
        metadata: {
          confidenceScore: analysis.confidenceScore,
          explainability: toJsonObject(explainability),
          featureExtraction: toJsonObject(engineResult.featureExtraction),
          provider: toJsonObject(engineResult.provider),
          primaryDiagnosis: engineResult.primaryDiagnosis,
          rationale: engineResult.interpretationRationale,
          secondaryDiagnoses: toJsonObject(engineResult.secondaryDiagnoses),
          severityBand: engineResult.clinicalSeverity,
          severity: analysis.severity,
        },
        patientId: queued.case.patientId,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        caseId: queued.caseId,
        metadata: {
          analysisId: analysis.id,
          confidenceScore: analysis.confidenceScore,
          diagnosis: analysis.diagnosis,
          explainability: toJsonObject(explainability),
          featureExtraction: toJsonObject(engineResult.featureExtraction),
          provider: toJsonObject(engineResult.provider),
          rationale: engineResult.interpretationRationale,
          secondaryDiagnoses: toJsonObject(engineResult.secondaryDiagnoses),
          severityBand: engineResult.clinicalSeverity,
          severity: analysis.severity,
        },
        patientId: queued.case.patientId,
        title: "AI analysis completed",
        type: "AI_ANALYSIS_COMPLETED",
      },
    });
    await ensureClinicalReportForCase(queued.caseId, actorId);

    await createNotification({
      caseId: queued.caseId,
      message: `AI analysis completed for case ${queued.case.caseId}: ${analysis.diagnosis}.`,
      targetRole: "DOCTOR",
      title: "AI Analysis Complete",
      type: isCritical(analysis) ? "CRITICAL" : "SUCCESS",
    });

    if (isCritical(analysis)) {
      await createNotification({
        caseId: queued.caseId,
        message: `${analysis.diagnosis} detected. Immediate clinical review required.`,
        targetRole: "ADMIN",
        title: "Critical ECG Detected",
        type: "CRITICAL",
      });
    }
    return analysis;
  } catch (error) {
    const failed = await prisma.aIAnalysis.update({
      data: { status: "FAILED", processingTime: Date.now() - started },
      where: { id: analysisId },
    });
    await prisma.eCGCase.update({
      data: { aiStatus: "FAILED" },
      where: { id: queued.caseId },
    });
    await prisma.auditLog.create({
      data: {
        action: "AI_ANALYSIS_FAILED",
        actorId,
        caseId: queued.caseId,
        message: "AI analysis failed.",
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
        patientId: queued.case.patientId,
      },
    });
    return failed;
  } finally {
    activeJobs.delete(analysisId);
  }
}

async function createQueuedAnalysis(caseId: string, actorId: string) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertCaseCanAcceptAnalysis(ecgCase);
  assertCaseStatusTransition(ecgCase.status, "PROCESSING");

  const analysis = await prisma.aIAnalysis.create({
    data: {
      aiVersion: AI_VERSION,
      caseId,
      confidenceScore: 0,
      diagnosis: "Pending",
      heartRate: 0,
      interpretation: "Queued for AI ECG analysis.",
      processingTime: 0,
      recommendations: [],
      rhythm: "Pending",
      severity: "NORMAL",
      status: "QUEUED",
      urgentActions: [],
    },
  });

  await prisma.eCGCase.update({
    data: { aiStatus: "QUEUED", status: "PROCESSING" },
    where: { id: caseId },
  });
  await prisma.auditLog.create({
    data: {
      action: "CASE_STATUS_CHANGED",
      actorId,
      caseId,
      message: `ECG case status changed from ${ecgCase.status} to PROCESSING.`,
      metadata: { from: ecgCase.status, to: "PROCESSING" },
      patientId: ecgCase.patientId,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "AI_ANALYSIS_QUEUED",
      actorId,
      caseId,
      message: `AI analysis queued for case ${ecgCase.caseId}.`,
      patientId: ecgCase.patientId,
    },
  });

  return analysis;
}

export async function queueAnalysis(caseId: string, actorId: string) {
  const analysis = await createQueuedAnalysis(caseId, actorId);
  setTimeout(() => void completeAnalysis(analysis.id, actorId), 25);
  return analysis;
}

export async function runAnalysisNow(caseId: string, actorId: string) {
  const analysis = await createQueuedAnalysis(caseId, actorId);
  return completeAnalysis(analysis.id, actorId);
}

export async function getLatestAnalysis(caseId: string) {
  return prisma.aIAnalysis.findFirst({
    orderBy: { createdAt: "desc" },
    where: { caseId },
  });
}

export async function getStatistics() {
  const analyses = await prisma.aIAnalysis.findMany({
    where: { status: "COMPLETED" },
  });
  const total = analyses.length;
  const critical = analyses.filter((analysis) => analysis.severity === "CRITICAL").length;
  const abnormal = analyses.filter((analysis) => analysis.severity !== "NORMAL").length;
  const averageConfidence =
    total === 0 ? 0 : analyses.reduce((sum, analysis) => sum + analysis.confidenceScore, 0) / total;
  const diagnosisDistribution = analyses.reduce<Record<string, number>>((acc, analysis) => {
    acc[analysis.diagnosis] = (acc[analysis.diagnosis] ?? 0) + 1;
    return acc;
  }, {});

  return {
    abnormalPercentage: total === 0 ? 0 : Math.round((abnormal / total) * 100),
    averageConfidence: Math.round(averageConfidence * 100),
    criticalPercentage: total === 0 ? 0 : Math.round((critical / total) * 100),
    diagnosisDistribution,
    totalAnalyses: total,
  };
}

export function fromApiAnalysisStatus(status: "queued" | "processing" | "completed" | "failed"): AIAnalysisStatus {
  return status.toUpperCase() as AIAnalysisStatus;
}

export function fromApiSeverity(severity: "normal" | "mild" | "moderate" | "severe" | "critical"): AISeverity {
  return severity.toUpperCase() as AISeverity;
}
