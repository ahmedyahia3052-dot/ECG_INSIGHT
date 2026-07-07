import type { EcgLeadId } from "./types";
import type {
  EcgCaliper,
  EcgCaliperKind,
  EcgClinicalMeasurement,
  EcgMeasurementKind,
  EcgMeasurementReadouts,
  EcgViewerWorkspaceState,
  ImagePoint,
} from "./measurementTypes";
import {
  buildReadouts,
  deltaPixels,
  gridSpacingPx,
  horizontalDeltaMs,
  imageDisplayRect,
  measurementFromCaliper,
  primaryValueForKind,
  resolveGridSpacing,
} from "./ecgCalibrationMath";
import { deltaPixelsForCaliper } from "./ecgCaliperGeometry";
import { evaluateMeasurementReference, formatReferenceRange } from "./ecgMeasurementReference";
import { measurementsToCsv } from "./ecgMeasurementExport";
import { MEASUREMENT_KIND_LABELS } from "./measurementTypes";

export type ClinicalMeasurementPreset = {
  caliperKind: EcgCaliperKind;
  color: string;
  kind: EcgMeasurementKind;
  label: string;
};

export const CALIPER_COLORS = ["#2563EB", "#DC2626", "#059669", "#D97706", "#7C3AED", "#0F766E", "#DB2777", "#0891B2"] as const;

export const CLINICAL_MEASUREMENT_PRESETS: ClinicalMeasurementPreset[] = [
  { caliperKind: "horizontal", color: "#2563EB", kind: "pr_interval", label: "PR" },
  { caliperKind: "horizontal", color: "#7C3AED", kind: "qrs_duration", label: "QRS" },
  { caliperKind: "horizontal", color: "#059669", kind: "qt_interval", label: "QT" },
  { caliperKind: "horizontal", color: "#0F766E", kind: "qtc", label: "QTc" },
  { caliperKind: "horizontal", color: "#DC2626", kind: "rr_interval", label: "RR" },
  { caliperKind: "horizontal", color: "#DB2777", kind: "pp_interval", label: "PP" },
  { caliperKind: "horizontal", color: "#B91C1C", kind: "heart_rate", label: "HR" },
  { caliperKind: "horizontal", color: "#6366F1", kind: "p_wave_duration", label: "P Dur" },
  { caliperKind: "horizontal", color: "#14B8A6", kind: "t_wave_duration", label: "T Dur" },
  { caliperKind: "vertical", color: "#D97706", kind: "st_elevation", label: "ST↑" },
  { caliperKind: "vertical", color: "#0891B2", kind: "st_depression", label: "ST↓" },
  { caliperKind: "vertical", color: "#9333EA", kind: "p_amplitude", label: "P Amp" },
  { caliperKind: "vertical", color: "#EF4444", kind: "r_amplitude", label: "R Amp" },
  { caliperKind: "vertical", color: "#0284C7", kind: "s_amplitude", label: "S Amp" },
  { caliperKind: "vertical", color: "#16A34A", kind: "t_amplitude", label: "T Amp" },
  { caliperKind: "angle", color: "#CA8A04", kind: "electrical_axis", label: "Axis" },
  { caliperKind: "multi", color: "#475569", kind: "custom", label: "Multi Seg" },
  { caliperKind: "distance", color: "#64748B", kind: "custom", label: "Dist Seg" },
  { caliperKind: "dual", color: "#64748B", kind: "custom", label: "Custom" },
];

export type MeasurementExportFormat = "json" | "fhir" | "hl7" | "pdf" | "csv";

export type SerializedMeasurementBundle = {
  exportedAt: string;
  format: MeasurementExportFormat;
  measurements: EcgClinicalMeasurement[];
  schemaVersion: 4;
  workspaceVersion: EcgViewerWorkspaceState["version"];
};

export function enrichMeasurement(
  measurement: EcgClinicalMeasurement,
  calibration: { gain: number; speed: number; spacing: number },
): EcgClinicalMeasurement {
  const evaluation = evaluateMeasurementReference(measurement.kind, measurement.value, measurement.unit);
  return {
    ...measurement,
    aiInterpretation: measurement.aiInterpretation ?? null,
    calibrationSnapshot: measurement.calibrationSnapshot ?? {
      gain: calibration.gain,
      pixelsPerSmallBox: calibration.spacing,
      speed: calibration.speed,
    },
    clinicalSignificance: evaluation.clinicalSignificance,
    referenceRange: evaluation.referenceRange || formatReferenceRange(measurement.kind),
  };
}

export function computeQtDispersion(
  measurements: EcgClinicalMeasurement[],
): EcgClinicalMeasurement | null {
  const qtValues = measurements
    .filter((item) => item.kind === "qt_interval" && !item.hidden && item.durationMs != null && item.durationMs > 0)
    .map((item) => item.durationMs as number);
  if (qtValues.length < 2) return null;
  const max = Math.max(...qtValues);
  const min = Math.min(...qtValues);
  const dispersion = Number((max - min).toFixed(1));
  const timestamp = new Date().toISOString();
  return {
    aiInterpretation: null,
    amplitudeMv: undefined,
    caliperId: "__qt_dispersion__",
    clinicalSignificance: evaluateMeasurementReference("qt_dispersion", dispersion, "ms").clinicalSignificance,
    comments: `Derived from ${qtValues.length} QT interval measurements.`,
    confidence: null,
    createdBy: "Measurement Engine",
    doctorNotes: undefined,
    durationMs: dispersion,
    end: { x: 0, y: 0 },
    hidden: false,
    id: `qt-dispersion-${timestamp}`,
    kind: "qt_dispersion",
    lead: undefined,
    name: "QT Dispersion",
    operator: "Measurement Engine",
    readouts: { milliseconds: dispersion },
    referenceRange: formatReferenceRange("qt_dispersion"),
    start: { x: 0, y: 0 },
    timestamp,
    type: MEASUREMENT_KIND_LABELS.qt_dispersion,
    unit: "ms",
    updatedAt: timestamp,
    value: dispersion,
  };
}

export function presetForKind(kind: EcgMeasurementKind): ClinicalMeasurementPreset {
  return CLINICAL_MEASUREMENT_PRESETS.find((item) => item.kind === kind) ?? CLINICAL_MEASUREMENT_PRESETS[CLINICAL_MEASUREMENT_PRESETS.length - 1]!;
}

export function resolveLatestRrMs(calipers: EcgCaliper[], spacing: number, speed: 25 | 50): number | undefined {
  const rrCaliper = [...calipers].reverse().find((item) => !item.hidden && item.measurementKind === "rr_interval");
  if (!rrCaliper) return undefined;
  const deltaPx = deltaPixelsForCaliper(rrCaliper);
  const ms = horizontalDeltaMs(deltaPx, speed, spacing);
  return ms > 0 ? ms : undefined;
}

export function resolveLatestQtMs(calipers: EcgCaliper[], spacing: number, speed: 25 | 50): number | undefined {
  const qtCaliper = [...calipers].reverse().find((item) => !item.hidden && item.measurementKind === "qt_interval");
  if (!qtCaliper) return undefined;
  const deltaPx = deltaPixels(qtCaliper.start, qtCaliper.end, qtCaliper.kind);
  const ms = horizontalDeltaMs(deltaPx, speed, spacing);
  return ms > 0 ? ms : undefined;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMeasurementInput(input: {
  caliperKind: EcgCaliperKind;
  color?: string;
  comments?: string;
  createdBy: string;
  end: ImagePoint;
  kind: EcgMeasurementKind;
  label?: string;
  lead?: EcgLeadId | "Rhythm Strip";
  snapToGrid?: boolean;
  spacing: number;
  speed: 25 | 50;
  gain: 5 | 10 | 20;
  start: ImagePoint;
}): { caliper: EcgCaliper; measurement: EcgClinicalMeasurement } {
  const preset = presetForKind(input.kind);
  const caliper: EcgCaliper = {
    color: input.color ?? preset.color,
    comments: input.comments,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    end: input.end,
    hidden: false,
    id: uid("caliper"),
    kind: input.caliperKind,
    label: input.label,
    lead: input.lead,
    locked: false,
    measurementKind: input.kind,
    snapToGrid: input.snapToGrid ?? true,
    start: input.start,
    updatedAt: new Date().toISOString(),
  };
  const derived = measurementFromCaliper(caliper, input.spacing, input.speed, input.gain, input.createdBy);
  const measurement: EcgClinicalMeasurement = enrichMeasurement(
    {
      aiInterpretation: null,
      amplitudeMv: derived.readouts.mv,
      caliperId: caliper.id,
      comments: input.comments,
      confidence: null,
      createdBy: input.createdBy,
      durationMs: derived.readouts.milliseconds,
      end: caliper.end,
      hidden: false,
      id: uid("measurement"),
      kind: derived.kind,
      lead: input.lead,
      name: caliper.label?.trim() || derived.name,
      operator: input.createdBy,
      readouts: derived.readouts,
      start: caliper.start,
      timestamp: caliper.createdAt,
      type: MEASUREMENT_KIND_LABELS[derived.kind],
      unit: derived.unit,
      updatedAt: caliper.updatedAt,
      value: derived.value,
    },
    { gain: input.gain, spacing: input.spacing, speed: input.speed },
  );
  return { caliper, measurement };
}

export function updateMeasurementFromCaliper(
  caliper: EcgCaliper,
  existing: EcgClinicalMeasurement,
  context: {
    calipers: EcgCaliper[];
    gain: 5 | 10 | 20;
    operator: string;
    spacing: number;
    speed: 25 | 50;
  },
): EcgClinicalMeasurement {
  const derived = measurementFromCaliper(caliper, context.spacing, context.speed, context.gain, context.operator, {
    rrMs: resolveLatestRrMs(context.calipers, context.spacing, context.speed),
  });
  return enrichMeasurement(
    {
      ...existing,
      amplitudeMv: derived.readouts.mv,
      durationMs: derived.readouts.milliseconds,
      end: caliper.end,
      kind: derived.kind,
      lead: caliper.lead ?? existing.lead,
      name: caliper.label?.trim() || existing.name,
      readouts: derived.readouts,
      start: caliper.start,
      type: MEASUREMENT_KIND_LABELS[derived.kind],
      unit: derived.unit,
      updatedAt: new Date().toISOString(),
      value: derived.value,
    },
    { gain: context.gain, spacing: context.spacing, speed: context.speed },
  );
}

export function deleteMeasurementFromState(state: EcgViewerWorkspaceState, measurementId: string): EcgViewerWorkspaceState {
  const measurement = state.measurements.find((item) => item.id === measurementId);
  if (!measurement) return state;
  return {
    ...state,
    calipers: state.calipers.filter((item) => item.id !== measurement.caliperId),
    measurements: state.measurements.filter((item) => item.id !== measurementId),
    selectedCaliperId: state.selectedCaliperId === measurement.caliperId ? null : state.selectedCaliperId,
    selectedMeasurementId: state.selectedMeasurementId === measurementId ? null : state.selectedMeasurementId,
  };
}

export function serializeMeasurement(measurement: EcgClinicalMeasurement): Record<string, unknown> {
  return {
    amplitudeMv: measurement.amplitudeMv,
    comments: measurement.comments,
    confidence: measurement.confidence,
    createdBy: measurement.createdBy,
    durationMs: measurement.durationMs,
    end: measurement.end,
    id: measurement.id,
    kind: measurement.kind,
    lead: measurement.lead,
    name: measurement.name,
    readouts: measurement.readouts,
    start: measurement.start,
    timestamp: measurement.timestamp,
    type: measurement.type,
    unit: measurement.unit,
    updatedAt: measurement.updatedAt,
    value: measurement.value,
  };
}

export function restoreMeasurement(raw: Record<string, unknown>, caliperId: string, operator: string): EcgClinicalMeasurement {
  return {
    amplitudeMv: typeof raw.amplitudeMv === "number" ? raw.amplitudeMv : undefined,
    caliperId,
    comments: typeof raw.comments === "string" ? raw.comments : undefined,
    confidence: typeof raw.confidence === "number" ? raw.confidence : null,
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : operator,
    durationMs: typeof raw.durationMs === "number" ? raw.durationMs : undefined,
    end: (raw.end as ImagePoint) ?? { x: 0, y: 0 },
    hidden: Boolean(raw.hidden),
    id: typeof raw.id === "string" ? raw.id : uid("measurement"),
    kind: (raw.kind as EcgMeasurementKind) ?? "custom",
    lead: typeof raw.lead === "string" ? raw.lead : undefined,
    name: typeof raw.name === "string" ? raw.name : "Measurement",
    operator: typeof raw.operator === "string" ? raw.operator : operator,
    readouts: (raw.readouts as EcgMeasurementReadouts) ?? {},
    start: (raw.start as ImagePoint) ?? { x: 0, y: 0 },
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString(),
    type: typeof raw.type === "string" ? raw.type : "Custom",
    unit: typeof raw.unit === "string" ? raw.unit : "ms",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    value: typeof raw.value === "number" ? raw.value : 0,
  };
}

export function exportMeasurements(
  measurements: EcgClinicalMeasurement[],
  format: MeasurementExportFormat,
): SerializedMeasurementBundle | Record<string, unknown> {
  const bundle: SerializedMeasurementBundle = {
    exportedAt: new Date().toISOString(),
    format,
    measurements,
    schemaVersion: 4,
    workspaceVersion: 5,
  };
  if (format === "json") return bundle;
  if (format === "csv") {
    return {
      ...bundle,
      csv: measurementsToCsv(measurements),
    };
  }
  if (format === "fhir") {
    return {
      ...bundle,
      resourceType: "Bundle",
      type: "collection",
      entry: measurements.map((item) => ({
        resource: {
          code: { text: item.type },
          effectiveDateTime: item.timestamp,
          resourceType: "Observation",
          status: "final",
          valueQuantity: { unit: item.unit, value: item.value },
          component: [
            item.durationMs != null ? { code: { text: "Duration" }, valueQuantity: { unit: "ms", value: item.durationMs } } : null,
            item.amplitudeMv != null ? { code: { text: "Amplitude" }, valueQuantity: { unit: "mV", value: item.amplitudeMv } } : null,
          ].filter(Boolean),
          note: item.comments ? [{ text: item.comments }] : undefined,
          bodySite: item.lead ? { text: `Lead ${item.lead}` } : undefined,
        },
      })),
    };
  }
  if (format === "hl7") {
    return {
      ...bundle,
      segments: measurements.map((item) =>
        `OBX|1|NM|${item.type}^${item.kind}^ECG_INSIGHT||${item.value}|${item.unit}|||F|||${item.timestamp}${item.lead ? `|||Lead ${item.lead}` : ""}`,
      ),
    };
  }
  return bundle;
}

export function syncWorkspaceMeasurements(
  calipers: EcgCaliper[],
  existing: EcgClinicalMeasurement[],
  input: {
    gain: 5 | 10 | 20;
    grid?: Pick<import("./types").EcgViewerGridSettings, "customCalibration" | "gain" | "pixelsPerSmallBox" | "speed">;
    operator: string;
    speed: 25 | 50;
  },
): EcgClinicalMeasurement[] {
  const spacing = input.grid ? resolveGridSpacing(input.grid) : gridSpacingPx(input.speed, input.gain);
  const calibration = { gain: input.gain, spacing, speed: input.speed };
  const byCaliper = new Map(existing.map((item) => [item.caliperId, item]));
  const synced = calipers
    .filter((caliper) => !caliper.hidden)
    .map((caliper) => {
      const previous = byCaliper.get(caliper.id);
      const derived = measurementFromCaliper(caliper, spacing, input.speed, input.gain, input.operator, {
        rrMs: resolveLatestRrMs(calipers, spacing, input.speed),
      });
      const primary = primaryValueForKind(derived.kind, derived.readouts, caliper.kind);
      return enrichMeasurement(
        {
          aiInterpretation: previous?.aiInterpretation ?? null,
          amplitudeMv: derived.readouts.mv,
          caliperId: caliper.id,
          comments: previous?.comments ?? caliper.comments,
          confidence: previous?.confidence ?? null,
          createdBy: caliper.createdBy ?? previous?.createdBy ?? input.operator,
          doctorNotes: previous?.doctorNotes,
          durationMs: derived.readouts.milliseconds,
          end: caliper.end,
          groupId: previous?.groupId ?? caliper.groupId,
          hidden: previous?.hidden ?? false,
          id: previous?.id ?? uid("measurement"),
          kind: derived.kind,
          lead: caliper.lead ?? previous?.lead,
          name: previous?.name ?? caliper.label?.trim() ?? derived.name,
          operator: previous?.operator ?? input.operator,
          readouts: derived.readouts,
          start: caliper.start,
          timestamp: previous?.timestamp ?? caliper.createdAt,
          type: MEASUREMENT_KIND_LABELS[derived.kind],
          unit: primary.unit,
          updatedAt: caliper.updatedAt,
          value: primary.value,
        },
        calibration,
      );
    });
  const withoutDispersion = synced.filter((item) => item.caliperId !== "__qt_dispersion__");
  const dispersion = computeQtDispersion(withoutDispersion);
  return dispersion ? [...withoutDispersion, dispersion] : withoutDispersion;
}

export function summarizeCaliper(
  caliper: EcgCaliper,
  controls: { grid: { gain: EcgViewerWorkspaceState["grid"]["gain"]; speed: EcgViewerWorkspaceState["grid"]["speed"]; customCalibration?: boolean; pixelsPerSmallBox?: number } },
  rrMs?: number,
) {
  const spacing = resolveGridSpacing(controls.grid);
  const deltaPx = deltaPixelsForCaliper(caliper);
  const readouts = buildReadouts({
    caliper,
    deltaPx,
    gain: controls.grid.gain,
    kind: caliper.kind,
    measurementKind: caliper.measurementKind,
    rrMs,
    spacing,
    speed: controls.grid.speed,
  });
  const primary = primaryValueForKind(caliper.measurementKind ?? "custom", readouts, caliper.kind);
  return { primary, readouts };
}

export function focusTransformForCaliper(
  caliper: EcgCaliper,
  viewport: { containerHeight: number; containerWidth: number; imageHeight: number; imageWidth: number },
  current: { panX: number; panY: number; rotation: number; zoom: number },
) {
  const rect = imageDisplayRect(viewport.containerWidth, viewport.containerHeight, viewport.imageWidth, viewport.imageHeight);
  const focus = { x: (caliper.start.x + caliper.end.x) / 2, y: (caliper.start.y + caliper.end.y) / 2 };
  const zoom = Math.max(current.zoom, 1.75);
  const baseX = rect.offsetX + focus.x * rect.scale;
  const baseY = rect.offsetY + focus.y * rect.scale;
  return {
    panX: viewport.containerWidth / 2 - baseX * zoom,
    panY: viewport.containerHeight / 2 - baseY * zoom,
    rotation: current.rotation,
    zoom,
  };
}
