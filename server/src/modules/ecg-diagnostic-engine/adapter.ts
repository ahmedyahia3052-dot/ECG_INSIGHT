import type { EcgClinicalMeasurementResult, EcgMeasurementItem, MorphologyFlag, RhythmClassification } from "../ecg-measurement/types";
import { samplesToMs } from "./signal/signal-processing";
import type { DiagnosticPipelineResult, EnterpriseMeasurementBundle, EnterpriseRhythmClass, MorphologyClass } from "./types";

function mapRhythm(classification: EnterpriseRhythmClass): RhythmClassification {
  switch (classification) {
    case "normal_sinus_rhythm":
      return "sinus_rhythm";
    case "sinus_tachycardia":
    case "supraventricular_tachycardia":
    case "atrial_flutter":
      return "sinus_tachycardia";
    case "sinus_bradycardia":
    case "junctional_rhythm":
    case "escape_rhythm":
      return "sinus_bradycardia";
    case "atrial_fibrillation":
    case "premature_atrial_contraction":
    case "premature_ventricular_contraction":
    case "bigeminy":
    case "trigeminy":
    case "ventricular_tachycardia":
    case "ventricular_fibrillation":
    case "unknown_rhythm":
      return "irregular";
    default:
      return "regular";
  }
}

function mapMorphology(classes: MorphologyClass[]): MorphologyFlag[] {
  const flags = new Set<MorphologyFlag>();
  for (const item of classes) {
    switch (item) {
      case "wide_qrs":
        flags.add("wide_qrs");
        break;
      case "narrow_qrs":
        flags.add("narrow_qrs");
        break;
      case "poor_r_progression":
        flags.add("poor_r_progression");
        break;
      case "pathological_q":
        flags.add("pathological_q_waves");
        break;
      case "voltage_abnormality":
        flags.add("low_voltage");
        break;
      case "lvh_voltage":
        flags.add("lvh_criteria");
        break;
      case "rvh_voltage":
        flags.add("rvh_criteria");
        break;
      default:
        break;
    }
  }
  if (!flags.has("wide_qrs") && !flags.has("narrow_qrs")) {
    flags.add("narrow_qrs");
  }
  return [...flags];
}

function isAbnormal(key: keyof EnterpriseMeasurementBundle, measurements: EnterpriseMeasurementBundle): boolean {
  switch (key) {
    case "prIntervalMs":
      return measurements.prIntervalMs > 200;
    case "qrsDurationMs":
      return measurements.qrsDurationMs > 120;
    case "qtcBazettMs":
      return measurements.qtcBazettMs > 470 || (measurements.qtcBazettMs > 0 && measurements.qtcBazettMs < 350);
    case "stElevationMm":
      return measurements.stElevationMm > 1;
    case "stDepressionMm":
      return measurements.stDepressionMm > 0.5;
    case "heartRateBpm":
      return measurements.heartRateBpm < 60 || measurements.heartRateBpm > 100;
    default:
      return false;
  }
}

function buildMeasurementItems(
  measurements: EnterpriseMeasurementBundle,
  pipeline: DiagnosticPipelineResult,
  samplingRate: number,
): EcgMeasurementItem[] {
  const beat = pipeline.waveDetection.beats[0];
  const waves = beat?.waves;
  const lead = pipeline.waveDetection.filteredLead;
  const toHighlight = (startIndex: number, endIndex: number, peakIndex?: number) => ({
    endMs: samplesToMs(endIndex, samplingRate),
    lead,
    peakMs: peakIndex === undefined ? undefined : samplesToMs(peakIndex, samplingRate),
    startMs: samplesToMs(startIndex, samplingRate),
  });

  const items: EcgMeasurementItem[] = [
    { label: "Heart Rate", unit: "bpm", value: measurements.heartRateBpm },
    { label: "RR Interval", unit: "ms", value: measurements.rrIntervalMs },
    { label: "PR Interval", unit: "ms", value: measurements.prIntervalMs },
    { label: "P Duration", unit: "ms", value: measurements.pDurationMs },
    { label: "QRS Duration", unit: "ms", value: measurements.qrsDurationMs },
    { label: "QT Interval", unit: "ms", value: measurements.qtIntervalMs },
    { label: "QTc Bazett", unit: "ms", value: measurements.qtcBazettMs },
    { label: "QTc Fridericia", unit: "ms", value: measurements.qtcFridericiaMs },
    { label: "QT Dispersion", unit: "ms", value: measurements.qtDispersionMs },
    { label: "P Axis", unit: "deg", value: measurements.pAxisDeg },
    { label: "QRS Axis", unit: "deg", value: measurements.qrsAxisDeg },
    { label: "T Axis", unit: "deg", value: measurements.tAxisDeg },
    { label: "Electrical Axis", unit: "deg", value: measurements.electricalAxisDeg },
    { label: "Mean Electrical Axis", unit: "deg", value: measurements.meanElectricalAxisDeg },
    { label: "Voltage", unit: "mV", value: measurements.voltageMv },
    { label: "R Wave Amplitude", unit: "mV", value: measurements.rWaveAmplitudeMv },
    { label: "S Wave Amplitude", unit: "mV", value: measurements.sWaveAmplitudeMv },
    { label: "ST Elevation", unit: "mm", value: measurements.stElevationMm },
    { label: "ST Depression", unit: "mm", value: measurements.stDepressionMm },
    { label: "J Point", unit: "mm", value: measurements.jPointMm },
    { label: "P Wave Amplitude", unit: "mV", value: measurements.pWaveAmplitudeMv },
    { label: "QRS Amplitude", unit: "mV", value: measurements.qrsAmplitudeMv },
    { label: "T Wave Amplitude", unit: "mV", value: measurements.tWaveAmplitudeMv },
    { label: "ST Deviation", unit: "mm", value: measurements.stDeviationMm },
  ];

  if (waves) {
    items[1] = { ...items[1], highlight: toHighlight(waves.r.peak, waves.r.peak + Math.round((measurements.rrIntervalMs / 1000) * samplingRate)) };
    items[2] = { ...items[2], highlight: toHighlight(waves.p.onset, waves.r.peak) };
    items[3] = { ...items[3], highlight: toHighlight(waves.p.onset, waves.p.offset) };
    items[4] = { ...items[4], highlight: toHighlight(waves.q.onset, waves.s.offset, waves.r.peak) };
    items[5] = { ...items[5], highlight: toHighlight(waves.r.onset, waves.t.offset) };
  }

  return items;
}

export function toLegacyMeasurementResult(
  pipeline: DiagnosticPipelineResult,
  samplingRate: number,
): EcgClinicalMeasurementResult {
  const { measurements } = pipeline;
  return {
    amplitudes: {
      pWaveAmplitudeMv: measurements.pWaveAmplitudeMv,
      qrsAmplitudeMv: measurements.qrsAmplitudeMv,
      rWaveProgression: measurements.rProgression,
      stDeviationMm: measurements.stDeviationMm,
      tWaveAmplitudeMv: measurements.tWaveAmplitudeMv,
    },
    axis: {
      electricalAxisDeg: measurements.electricalAxisDeg,
      frontalPlaneAxisDeg: measurements.electricalAxisDeg,
      meanQrsAxisDeg: measurements.qrsAxisDeg,
    },
    confidence: pipeline.confidence.overall,
    heartRate: measurements.heartRateBpm,
    intervals: {
      pWaveDurationMs: measurements.pDurationMs,
      prIntervalMs: measurements.prIntervalMs,
      qrsDurationMs: measurements.qrsDurationMs,
      qtIntervalMs: measurements.qtIntervalMs,
      qtcBazettMs: measurements.qtcBazettMs,
      qtcFridericiaMs: measurements.qtcFridericiaMs,
      rrIntervalMs: measurements.rrIntervalMs,
    },
    measurements: buildMeasurementItems(measurements, pipeline, samplingRate),
    morphology: mapMorphology(pipeline.morphology),
    rhythm: mapRhythm(pipeline.rhythm.classification),
    stDeviation: measurements.stDeviationMm,
  };
}

export function abnormalMeasurementKeys(measurements: EnterpriseMeasurementBundle): string[] {
  const keys: (keyof EnterpriseMeasurementBundle)[] = [
    "heartRateBpm",
    "prIntervalMs",
    "qrsDurationMs",
    "qtcBazettMs",
    "stElevationMm",
    "stDepressionMm",
  ];
  return keys.filter((key) => isAbnormal(key, measurements)).map(String);
}

export function attachDiagnosticMetadata(
  result: EcgClinicalMeasurementResult,
  pipeline: DiagnosticPipelineResult,
): EcgClinicalMeasurementResult & { diagnosticEngine: DiagnosticPipelineResult } {
  return {
    ...result,
    diagnosticEngine: pipeline,
  };
}
