import type { DiagnosticPipelineResult, EnterpriseMeasurementBundle } from "../ecg-diagnostic-engine/types";
import type { BundleBranchPattern, EcgMeasurementBundleDto, RProgressionClass } from "./types";

function mapBundleBranch(indicators: string[]): BundleBranchPattern[] {
  if (!indicators.length) return ["none"];
  return indicators.map((item) => {
    if (item === "rbbb_pattern" || item === "lbbb_pattern" || item === "intraventricular_conduction_delay") {
      return item;
    }
    return "intraventricular_conduction_delay";
  });
}

/** Map diagnostic pipeline output to Sprint 59 measurement DTO. */
export function mapPipelineToMeasurementDto(pipeline: DiagnosticPipelineResult): EcgMeasurementBundleDto {
  const m: EnterpriseMeasurementBundle = pipeline.measurements;
  return {
    amplitudes: {
      pWaveAmplitudeMv: m.pWaveAmplitudeMv,
      qrsAmplitudeMv: m.qrsAmplitudeMv,
      rWaveAmplitudeMv: m.rWaveAmplitudeMv,
      sWaveAmplitudeMv: m.sWaveAmplitudeMv,
      tWaveAmplitudeMv: m.tWaveAmplitudeMv,
      voltageMv: m.voltageMv,
    },
    axis: {
      electricalAxisDeg: m.electricalAxisDeg,
      meanElectricalAxisDeg: m.meanElectricalAxisDeg,
      pAxisDeg: m.pAxisDeg,
      qrsAxisDeg: m.qrsAxisDeg,
      tAxisDeg: m.tAxisDeg,
    },
    bundleBranch: {
      patterns: mapBundleBranch(m.bundleBranchIndicators),
      qrsDurationMs: m.qrsDurationMs,
    },
    heartRate: {
      heartRateBpm: m.heartRateBpm,
      rrIntervalMs: m.rrIntervalMs,
    },
    intervals: {
      pDurationMs: m.pDurationMs,
      prIntervalMs: m.prIntervalMs,
      qrsDurationMs: m.qrsDurationMs,
      qtDispersionMs: m.qtDispersionMs,
      qtIntervalMs: m.qtIntervalMs,
      qtcBazettMs: m.qtcBazettMs,
      qtcFridericiaMs: m.qtcFridericiaMs,
    },
    progression: {
      rProgression: m.rProgression as RProgressionClass,
      transitionZone: m.transitionZone,
    },
    stSegment: {
      jPointMm: m.jPointMm,
      stDepressionMm: m.stDepressionMm,
      stDeviationMm: m.stDeviationMm,
      stElevationMm: m.stElevationMm,
    },
    voltageCriteria: {
      lowVoltageLimbLeads: m.voltageMv <= 0.35,
      lvhVoltageCriteria: m.lvhVoltageCriteria,
      rvhVoltageCriteria: m.rvhVoltageCriteria,
    },
  };
}
