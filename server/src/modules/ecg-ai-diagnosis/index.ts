import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { DigitizedLead } from "../ecg-digitization/types";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import type { EcgClinicalInterpretation } from "../ecg-interpretation/types";
import { runEnsembleDiagnosis } from "./ensemble-engine";
import type { EcgAiDiagnosisResult } from "./types";

export type { AiDiagnosisCandidate, EcgAiDiagnosisResult } from "./types";
export { runEnsembleDiagnosis } from "./ensemble-engine";

export function aiDiagnosisFromMetadata(metadata: unknown): EcgAiDiagnosisResult | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const record = metadata as Record<string, unknown>;
  const payload = record["aiDiagnosis"];
  if (!payload || typeof payload !== "object") return undefined;
  return payload as EcgAiDiagnosisResult;
}

export function aiDiagnosisJson(result: EcgAiDiagnosisResult): Prisma.InputJsonObject {
  return result as unknown as Prisma.InputJsonObject;
}

export async function diagnoseFromClinicalBundle(input: {
  imageAvailable: boolean;
  interpretation: EcgClinicalInterpretation;
  leads: DigitizedLead[];
  measurement: EcgClinicalMeasurementResult;
  qualityScore: number;
}) {
  return runEnsembleDiagnosis(input);
}

export async function persistAiDiagnosis(caseId: string, actorId: string, diagnosis: EcgAiDiagnosisResult, heartRate: number) {
  await prisma.aIAnalysis.create({
    data: {
      aiVersion: "ecg-ai-diagnosis-v6.3",
      caseId,
      confidenceScore: diagnosis.confidence,
      diagnosis: diagnosis.primaryDiagnosis,
      heartRate,
      interpretation: diagnosis.clinicalReasoning,
      processingTime: 0,
      recommendations: diagnosis.recommendations,
      rhythm: diagnosis.primaryDiagnosis,
      severity: diagnosis.urgency === "critical" || diagnosis.urgency === "urgent" ? "SEVERE" : diagnosis.urgency === "abnormal" ? "MODERATE" : "NORMAL",
      status: "COMPLETED",
      urgentActions: diagnosis.urgency === "critical" ? diagnosis.recommendations.slice(0, 2) : [],
    },
  });
  await prisma.eCGCase.update({
    data: {
      aiDiagnosis: diagnosis.primaryDiagnosis,
      aiStatus: "COMPLETED",
      confidenceScore: diagnosis.confidence,
    },
    where: { id: caseId },
  });
  await prisma.auditLog.create({
    data: {
      action: "AI_ANALYSIS_COMPLETED",
      actorId,
      caseId,
      message: `AI diagnosis ensemble generated: ${diagnosis.primaryDiagnosis}.`,
      metadata: {
        agreementWithRules: diagnosis.agreementWithRules,
        confidence: diagnosis.confidence,
        topDiagnoses: diagnosis.topDiagnoses.map((item) => item.label),
      } as Prisma.InputJsonObject,
    },
  });
}
