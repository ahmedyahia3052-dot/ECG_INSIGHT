import type { AIAnalysis, ECGCase, ECGMeasurement, Patient } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { emptyMeasurementResult, measureCaseFromStoredLeads } from "../ecg-measurement";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";

function rhythmFromText(value: string | null | undefined): EcgClinicalMeasurementResult["rhythm"] {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("brady")) return "sinus_bradycardia";
  if (normalized.includes("tachy")) return "sinus_tachycardia";
  if (normalized.includes("irregular") || normalized.includes("fibrillation")) return "irregular";
  if (normalized.includes("sinus")) return "sinus_rhythm";
  return "regular";
}

export function measurementFromDatabase(
  ecgCase: Pick<ECGCase, "heartRate" | "prInterval" | "qrsDuration" | "qtInterval" | "qtcInterval" | "rhythm">,
  dbMeasurement?: Pick<
    ECGMeasurement,
    "electricalAxis" | "heartRate" | "prInterval" | "qrsDuration" | "qtInterval" | "qtcInterval" | "rhythmRegularity" | "signalQuality" | "stDeviation"
  > | null,
  analysis?: Pick<AIAnalysis, "confidenceScore" | "heartRate" | "rhythm"> | null,
): EcgClinicalMeasurementResult {
  const base = emptyMeasurementResult();
  const heartRate = dbMeasurement?.heartRate ?? ecgCase.heartRate ?? analysis?.heartRate ?? 0;
  const pr = dbMeasurement?.prInterval ?? ecgCase.prInterval ?? 0;
  const qrs = dbMeasurement?.qrsDuration ?? ecgCase.qrsDuration ?? 0;
  const qt = dbMeasurement?.qtInterval ?? ecgCase.qtInterval ?? 0;
  const qtc = dbMeasurement?.qtcInterval ?? ecgCase.qtcInterval ?? 0;
  const axis = dbMeasurement?.electricalAxis ?? 0;
  const rhythm = rhythmFromText(analysis?.rhythm ?? ecgCase.rhythm);
  const signalScore = dbMeasurement?.signalQuality === "GOOD" ? 0.85 : dbMeasurement?.signalQuality === "FAIR" ? 0.65 : 0.45;
  const confidence = analysis?.confidenceScore ?? signalScore;

  return {
    ...base,
    amplitudes: {
      ...base.amplitudes,
      stDeviationMm: dbMeasurement?.stDeviation ?? 0,
    },
    axis: {
      electricalAxisDeg: axis,
      frontalPlaneAxisDeg: axis,
      meanQrsAxisDeg: axis,
    },
    confidence,
    heartRate,
    intervals: {
      ...base.intervals,
      prIntervalMs: pr,
      qrsDurationMs: qrs,
      qtIntervalMs: qt,
      qtcBazettMs: qtc,
      qtcFridericiaMs: qtc,
      rrIntervalMs: heartRate > 0 ? Math.round(60000 / heartRate) : 0,
    },
    rhythm,
    stDeviation: dbMeasurement?.stDeviation ?? 0,
  };
}

export async function resolveCaseMeasurement(caseId: string): Promise<EcgClinicalMeasurementResult> {
  const measured = await measureCaseFromStoredLeads(caseId);
  if (measured) return measured;

  const [ecgCase, dbMeasurement, analysis] = await Promise.all([
    prisma.eCGCase.findUnique({
      select: {
        heartRate: true,
        prInterval: true,
        qrsDuration: true,
        qtInterval: true,
        qtcInterval: true,
        rhythm: true,
      },
      where: { id: caseId },
    }),
    prisma.eCGMeasurement.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId } }),
    prisma.aIAnalysis.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId } }),
  ]);

  if (!ecgCase) return emptyMeasurementResult();
  return measurementFromDatabase(ecgCase, dbMeasurement, analysis);
}

export function patientAgeYears(patient: Pick<Patient, "dateOfBirth">) {
  return Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export function acquisitionQualityLabel(confidence: number, signalQuality?: string | null) {
  if (signalQuality === "POOR" || confidence < 0.45) return "Poor — manual review recommended";
  if (signalQuality === "FAIR" || confidence < 0.65) return "Fair — interpret with caution";
  if (confidence < 0.8) return "Good — suitable for automated interpretation";
  return "Excellent — high-fidelity acquisition";
}
