import type { AISeverity } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  assertCaseCanAcceptAnalysis,
  assertCaseStatusTransition,
  canTransitionCaseStatus,
} from "../../cases/state-machine";
import type { ECGAnalysisOutput } from "../../ai/domain";
import type { AiInferenceResult } from "../../ai-foundation/types";
import type { AiOrchestrationJobResult } from "./types";

const AI_VERSION = "ecg-insight-ai-v1.0.0";

function mapClinicalSeverity(severity: string): AISeverity {
  const normalized = severity.toUpperCase();
  if (normalized === "CRITICAL" || normalized === "HIGH" || normalized === "MODERATE" || normalized === "LOW") {
    return normalized as AISeverity;
  }
  return "NORMAL";
}

export async function ensureQueuedAnalysis(input: {
  actorId: string;
  analysisId?: string;
  caseId: string;
}) {
  if (input.analysisId) {
    const existing = await prisma.aIAnalysis.findUnique({ where: { id: input.analysisId } });
    if (!existing) throw new Error("Linked AI analysis not found.");
    if (existing.caseId !== input.caseId) throw new Error("AI analysis does not belong to orchestration case.");
    return existing;
  }

  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: input.caseId } });
  if (!ecgCase) throw new Error("ECG case not found for orchestration job.");
  assertCaseCanAcceptAnalysis(ecgCase);
  assertCaseStatusTransition(ecgCase.status, "PROCESSING");

  const analysis = await prisma.aIAnalysis.create({
    data: {
      aiVersion: AI_VERSION,
      caseId: input.caseId,
      confidenceScore: 0,
      createdById: input.actorId,
      diagnosis: "Pending",
      heartRate: 0,
      interpretation: "Queued for AI orchestration pipeline.",
      processingTime: 0,
      recommendations: [],
      rhythm: "Pending",
      severity: "NORMAL",
      status: "QUEUED",
      urgentActions: [],
    },
  });

  if (canTransitionCaseStatus(ecgCase.status, "PROCESSING")) {
    await prisma.eCGCase.update({
      data: { aiStatus: "QUEUED", status: "PROCESSING" },
      where: { id: input.caseId },
    });
  }

  return analysis;
}

export async function persistOrchestrationResult(input: {
  actorId: string;
  analysisId: string;
  caseId: string;
  durationMs: number;
  ecgAnalysis?: AiInferenceResult<ECGAnalysisOutput>;
  providerUsed: string;
}) {
  const output = input.ecgAnalysis?.output;
  const analysis = await prisma.aIAnalysis.update({
    data: {
      aiVersion: output
        ? `${AI_VERSION}:${output.provider?.name ?? input.providerUsed}:${output.provider?.modelVersion ?? "unknown"}`
        : AI_VERSION,
      confidenceScore: output?.confidenceScore ?? 0,
      diagnosis: output?.primaryDiagnosis ?? "Pending review",
      heartRate: output?.heartRate ?? 0,
      interpretation: output?.interpretation ?? "AI orchestration completed without ECG analysis output.",
      processingTime: input.durationMs,
      recommendations: output?.recommendations ?? [],
      rhythm: output?.rhythm ?? "Unknown",
      severity: mapClinicalSeverity(output?.severity ?? output?.clinicalSeverity ?? "NORMAL"),
      status: "COMPLETED",
      urgentActions: output?.urgentActions ?? [],
    },
    where: { id: input.analysisId },
  });

  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: input.caseId } });
  if (ecgCase && canTransitionCaseStatus(ecgCase.status, "AI_COMPLETED")) {
    await prisma.eCGCase.update({
      data: {
        aiDiagnosis: analysis.diagnosis,
        aiModelVersion: analysis.aiVersion,
        aiStatus: "COMPLETED",
        confidenceScore: analysis.confidenceScore,
        finalDiagnosis: analysis.diagnosis,
        heartRate: analysis.heartRate,
        recommendations: analysis.recommendations.join("\n"),
        status: "AI_COMPLETED",
      },
      where: { id: input.caseId },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "AI_ANALYSIS_COMPLETED",
      actorId: input.actorId,
      caseId: input.caseId,
      message: `AI orchestration completed: ${analysis.diagnosis}.`,
      metadata: { analysisId: analysis.id, provider: input.providerUsed },
      patientId: ecgCase?.patientId,
    },
  });

  return analysis;
}

export function buildOrchestrationResult(input: {
  analysisId: string;
  durationMs: number;
  ecgAnalysis?: AiOrchestrationJobResult["ecgAnalysis"];
  clinicalReasoning?: AiOrchestrationJobResult["clinicalReasoning"];
  ecgInterpretation?: AiOrchestrationJobResult["ecgInterpretation"];
  llmEnrichment?: AiOrchestrationJobResult["llmEnrichment"];
  providerUsed: string;
}): AiOrchestrationJobResult {
  return {
    analysisId: input.analysisId,
    clinicalReasoning: input.clinicalReasoning,
    durationMs: input.durationMs,
    ecgAnalysis: input.ecgAnalysis,
    ecgInterpretation: input.ecgInterpretation,
    engineVersion: "sprint86-ai-orchestration-v1",
    llmEnrichment: input.llmEnrichment,
    providerUsed: input.providerUsed,
  };
}
