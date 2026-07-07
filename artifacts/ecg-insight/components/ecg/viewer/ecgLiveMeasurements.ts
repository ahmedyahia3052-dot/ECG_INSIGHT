import { computeQtc, heartRateFromRr, resolveGridSpacing } from "./ecgCalibrationMath";
import { deltaPixelsForCaliper } from "./ecgCaliperGeometry";
import { summarizeCaliper } from "./ecgMeasurementEngine";
import type { EcgCaliper, EcgMeasurementKind } from "./measurementTypes";
import type { EcgViewerGridSettings } from "./types";

export type LiveMeasurementSnapshot = {
  amplitude: string;
  heartRate: string;
  pAxis: string;
  pr: string;
  qrs: string;
  qrsAxis: string;
  qt: string;
  qtc: string;
  rr: string;
  stDepression: string;
  stElevation: string;
  tAxis: string;
  updatedAt: string;
  voltage: string;
};

function latestByKind(calipers: EcgCaliper[], kind: EcgMeasurementKind) {
  return [...calipers].reverse().find((item) => !item.hidden && item.measurementKind === kind);
}

export function computeLiveMeasurements(calipers: EcgCaliper[], grid: EcgViewerGridSettings): LiveMeasurementSnapshot {
  const controls = { grid };
  const spacing = resolveGridSpacing(controls.grid);
  const rrCaliper = latestByKind(calipers, "rr_interval");
  const rrSummary = rrCaliper ? summarizeCaliper(rrCaliper, controls) : null;
  const rrMs = rrSummary ? Number(rrSummary.readouts.milliseconds ?? 0) : 0;

  const read = (kind: EcgMeasurementKind, fallback = "—") => {
    const caliper = latestByKind(calipers, kind);
    if (!caliper) return fallback;
    return `${summarizeCaliper(caliper, controls, rrMs || undefined).primary}`;
  };

  const qtMs = Number(read("qt_interval", "0"));
  const qtc =
    qtMs > 0 && rrMs > 0
      ? `${Math.round(computeQtc(qtMs, rrMs))} ms`
      : read("qtc", "—");

  const axisCaliper = latestByKind(calipers, "electrical_axis");
  const axisValue = axisCaliper ? `${summarizeCaliper(axisCaliper, controls).primary}°` : "—";

  const voltageCaliper = latestByKind(calipers, "r_amplitude") ?? latestByKind(calipers, "qrs_duration");
  const voltage =
    voltageCaliper && voltageCaliper.kind === "vertical"
      ? `${summarizeCaliper(voltageCaliper, controls).readouts.mv?.toFixed(2) ?? "—"} mV`
      : "—";

  const ampCaliper =
    latestByKind(calipers, "r_amplitude") ??
    latestByKind(calipers, "p_amplitude") ??
    latestByKind(calipers, "t_amplitude");
  const amplitude =
    ampCaliper?.kind === "vertical"
      ? `${summarizeCaliper(ampCaliper, controls).readouts.mm?.toFixed(1) ?? "—"} mm`
      : "—";

  return {
    amplitude,
    heartRate: rrMs > 0 ? `${heartRateFromRr(rrMs)} bpm` : read("heart_rate", "—"),
    pAxis: axisValue,
    pr: `${read("pr_interval")} ms`,
    qrs: `${read("qrs_duration")} ms`,
    qrsAxis: axisValue,
    qt: `${read("qt_interval")} ms`,
    qtc,
    rr: rrMs > 0 ? `${Math.round(rrMs)} ms` : `${read("rr_interval")} ms`,
    stDepression: `${read("st_depression")} mm`,
    stElevation: `${read("st_elevation")} mm`,
    tAxis: axisValue,
    updatedAt: new Date().toISOString(),
    voltage,
  };
}

/** Clinical precision targets for Sprint 34 validation. */
export const MEASUREMENT_PRECISION = {
  pixelTolerance: 0.5,
  qtMsTolerance: 2,
  voltageMvTolerance: 0.01,
} as const;

export function withinPixelTolerance(actual: number, expected: number) {
  return Math.abs(actual - expected) <= MEASUREMENT_PRECISION.pixelTolerance;
}

export function caliperDeltaPx(caliper: EcgCaliper) {
  return deltaPixelsForCaliper(caliper);
}
