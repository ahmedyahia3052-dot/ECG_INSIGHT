import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import { interpretFromMeasurement } from "./engine";
import type { EcgClinicalInterpretation } from "./types";

export type {
  ClinicalFinding,
  EcgClinicalInterpretation,
  InterpretationCategory,
  InterpretationEvidence,
  InterpretationSeverity,
} from "./types";
export { buildMarkdownReport, interpretFromMeasurement } from "./engine";
export {
  evaluateAllRules,
  evaluateAxisRules,
  evaluateConductionRules,
  evaluateElectrolyteRules,
  evaluateHypertrophyRules,
  evaluateIschemiaRules,
  evaluateRhythmRules,
} from "./rules";

export function interpretationFromMetadata(metadata: unknown): EcgClinicalInterpretation | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const record = metadata as Record<string, unknown>;
  const engine = record["interpretationEngine"];
  if (!engine || typeof engine !== "object") return undefined;
  return engine as EcgClinicalInterpretation;
}

export function interpretationEngineJson(interpretation: EcgClinicalInterpretation): Prisma.InputJsonObject {
  return interpretation as unknown as Prisma.InputJsonObject;
}

export async function persistCaseInterpretation(
  caseId: string,
  actorId: string,
  interpretation: EcgClinicalInterpretation,
  measurement: EcgClinicalMeasurementResult,
) {
  const severityMap = {
    abnormal: "MODERATE",
    critical: "CRITICAL",
    minor: "MILD",
    normal: "NORMAL",
    urgent: "SEVERE",
  } as const;

  await prisma.aIAnalysis.create({
    data: {
      aiVersion: "ecg-interpretation-v6.2",
      caseId,
      confidenceScore: interpretation.confidence,
      diagnosis: interpretation.primaryDiagnosis,
      heartRate: measurement.heartRate,
      interpretation: interpretation.report.summary,
      processingTime: 0,
      recommendations: interpretation.recommendations,
      rhythm: interpretation.findings.find((item) => item.category === "rhythm")?.label ?? measurement.rhythm.replace(/_/g, " "),
      severity: severityMap[interpretation.severity],
      status: "COMPLETED",
      urgentActions: interpretation.severity === "critical" || interpretation.severity === "urgent"
        ? interpretation.recommendations.slice(0, 2)
        : [],
    },
  });

  await prisma.eCGCase.update({
    data: {
      aiDiagnosis: interpretation.primaryDiagnosis,
      aiStatus: "COMPLETED",
      confidenceScore: interpretation.confidence,
      rhythm: interpretation.findings.find((item) => item.category === "rhythm")?.label ?? undefined,
      severity: severityMap[interpretation.severity] === "CRITICAL" || severityMap[interpretation.severity] === "SEVERE"
        ? "CRITICAL"
        : severityMap[interpretation.severity] === "MODERATE"
          ? "ABNORMAL"
          : "NORMAL",
    },
    where: { id: caseId },
  });

  await prisma.auditLog.create({
    data: {
      action: "AI_ANALYSIS_COMPLETED",
      actorId,
      caseId,
      message: `Clinical ECG interpretation generated: ${interpretation.primaryDiagnosis}.`,
      metadata: {
        confidence: interpretation.confidence,
        findingCount: interpretation.findings.length,
        severity: interpretation.severity,
        urgency: interpretation.urgency,
      } as Prisma.InputJsonObject,
    },
  });
}

export function interpretMeasurementBundle(measurement: EcgClinicalMeasurementResult): EcgClinicalInterpretation {
  return interpretFromMeasurement(measurement);
}
