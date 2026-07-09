import type { ManualClinicalMeasurementPayload } from "@/services/clinicalMeasurementApi";

import type { EcgViewerWorkspaceState } from "../measurementTypes";

function latestValue(state: EcgViewerWorkspaceState, kind: string) {
  const match = [...state.measurements].reverse().find((item) => item.kind === kind && !item.hidden);
  return match?.value;
}

export function manualPayloadFromWorkspace(state: EcgViewerWorkspaceState): ManualClinicalMeasurementPayload {
  const stElevation = latestValue(state, "st_elevation");
  const stDepression = latestValue(state, "st_depression");

  return {
    calipersJson: { calipers: state.calipers, measurements: state.measurements },
    electricalAxisDeg: latestValue(state, "electrical_axis"),
    heartRate: latestValue(state, "heart_rate"),
    pDurationMs: latestValue(state, "p_wave_duration"),
    prIntervalMs: latestValue(state, "pr_interval"),
    qrsDurationMs: latestValue(state, "qrs_duration"),
    qtIntervalMs: latestValue(state, "qt_interval"),
    qtcIntervalMs: latestValue(state, "qtc") ?? latestValue(state, "qtc_bazett"),
    rrIntervalMs: latestValue(state, "rr_interval"),
    stLevelMm: stElevation ?? (stDepression !== undefined ? -Math.abs(stDepression) : undefined),
    tWaveDurationMs: latestValue(state, "t_wave_duration"),
    workspace: state as unknown as Record<string, unknown>,
  };
}
