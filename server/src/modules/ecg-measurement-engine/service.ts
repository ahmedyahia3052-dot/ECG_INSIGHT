import type { Prisma } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { prisma } from "../../config/prisma";
import { runDiagnosticPipelineSync } from "../ecg-diagnostic-engine";
import { mapPipelineToMeasurementDto } from "./mapper";
import type { EcgMeasurementEngineResult, MeasureEngineInput } from "./types";
import { MEASUREMENT_ENGINE_VERSION } from "./types";
import { validateMeasurementBundle } from "./validation/validate-measurements";

/** Production Sprint 59 measurement engine — delegates wave detection to diagnostic pipeline. */
export function runMeasurementEngine(input: MeasureEngineInput): EcgMeasurementEngineResult {
  const started = performance.now();
  const pipeline = runDiagnosticPipelineSync(input);
  const bundle = mapPipelineToMeasurementDto(pipeline);
  const validation = validateMeasurementBundle(bundle);
  return {
    bundle,
    confidence: pipeline.confidence.overall,
    engineVersion: MEASUREMENT_ENGINE_VERSION,
    performanceMs: Math.round(performance.now() - started),
    validation,
  };
}

export async function persistMeasurementEngineResult(caseId: string, result: EcgMeasurementEngineResult) {
  const { bundle } = result;
  await prisma.eCGMeasurement.create({
    data: {
      caseId,
      detailsJson: result as unknown as Prisma.InputJsonObject,
      electricalAxis: bundle.axis.electricalAxisDeg,
      heartRate: bundle.heartRate.heartRateBpm,
      pDuration: bundle.intervals.pDurationMs,
      prInterval: bundle.intervals.prIntervalMs,
      qrsDuration: bundle.intervals.qrsDurationMs,
      qtInterval: bundle.intervals.qtIntervalMs,
      qtcInterval: bundle.intervals.qtcBazettMs,
      rrInterval: bundle.heartRate.rrIntervalMs,
      rhythmRegularity: validationRegularity(bundle.heartRate.heartRateBpm),
      signalQuality: result.confidence >= 0.75 ? "GOOD" : result.confidence >= 0.55 ? "FAIR" : "POOR",
      stDeviation: bundle.stSegment.stDeviationMm,
    },
  });
  await prisma.eCGCase.update({
    data: {
      heartRate: bundle.heartRate.heartRateBpm,
      prInterval: bundle.intervals.prIntervalMs,
      qrsDuration: bundle.intervals.qrsDurationMs,
      qtInterval: bundle.intervals.qtIntervalMs,
      qtcInterval: bundle.intervals.qtcBazettMs,
    },
    where: { id: caseId },
  });
}

function validationRegularity(heartRateBpm: number) {
  if (heartRateBpm < 50 || heartRateBpm > 110) return 0.45;
  return 0.92;
}
