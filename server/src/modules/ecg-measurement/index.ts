import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { DigitizedLead, GridCalibration } from "../ecg-digitization/types";
import { measureFromLeads, serializeMeasurementSummary } from "./engine";
import type { EcgClinicalMeasurementResult } from "./types";

export type { EcgClinicalMeasurementResult, EcgMeasurementItem, MeasurementHighlight, MorphologyFlag, RhythmClassification } from "./types";
export { measureFromLeads, emptyMeasurementResult, serializeMeasurementSummary } from "./engine";

export async function persistCaseMeasurement(caseId: string, leads: DigitizedLead[], calibration: GridCalibration) {
  const clinical = measureFromLeads({ calibration, leads });
  await prisma.eCGMeasurement.create({
    data: {
      caseId,
      electricalAxis: clinical.axis.electricalAxisDeg,
      heartRate: clinical.heartRate,
      pDuration: clinical.intervals.pWaveDurationMs,
      prInterval: clinical.intervals.prIntervalMs,
      qrsDuration: clinical.intervals.qrsDurationMs,
      qtInterval: clinical.intervals.qtIntervalMs,
      qtcInterval: clinical.intervals.qtcBazettMs,
      rrInterval: clinical.intervals.rrIntervalMs,
      rhythmRegularity: clinical.rhythm === "irregular" ? 0.4 : 0.92,
      signalQuality: clinical.confidence >= 0.75 ? "GOOD" : clinical.confidence >= 0.55 ? "FAIR" : "POOR",
      stDeviation: clinical.stDeviation,
    },
  });
  await prisma.eCGCase.update({
    data: {
      heartRate: clinical.heartRate,
      prInterval: clinical.intervals.prIntervalMs,
      qrsDuration: clinical.intervals.qrsDurationMs,
      qtInterval: clinical.intervals.qtIntervalMs,
      qtcInterval: clinical.intervals.qtcBazettMs,
      rhythm: clinical.rhythm.replace(/_/g, " "),
    },
    where: { id: caseId },
  });
  return clinical;
}

export function measurementFromMetadata(metadata: unknown): EcgClinicalMeasurementResult | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const record = metadata as Record<string, unknown>;
  const engine = record["measurementEngine"];
  if (!engine || typeof engine !== "object") return undefined;
  return engine as EcgClinicalMeasurementResult;
}

export function measurementEngineJson(clinical: EcgClinicalMeasurementResult, calibration: GridCalibration): Prisma.InputJsonObject {
  return serializeMeasurementSummary(clinical, calibration) as unknown as Prisma.InputJsonObject;
}

export async function measureCaseFromStoredLeads(caseId: string): Promise<EcgClinicalMeasurementResult | null> {
  const file = await prisma.eCGFile.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId } });
  if (!file) return null;
  const leads = await prisma.eCGLeadSignal.findMany({ orderBy: { leadName: "asc" }, where: { ecgFileId: file.id } });
  if (!leads.length) return null;
  const calibration: GridCalibration = {
    confidence: 0.5,
    gainMmPerMv: (leads[0]?.gain ?? 10) as 5 | 10 | 20,
    gridDetected: true,
    paperSpeedMmPerSec: (leads[0]?.paperSpeed ?? 25) as 25 | 50,
  };
  return measureFromLeads({
    calibration,
    leads: leads.map((lead) => ({
      durationSeconds: lead.duration,
      lead: lead.leadName,
      samples: lead.signalData,
      samplingRate: lead.samplingRate,
    })),
  });
}
