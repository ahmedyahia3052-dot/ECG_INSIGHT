import type { EcgAiOverlayState } from "./aiOverlayTypes";
import type { EcgGridGain, EcgImageAdjustments, EcgPaperSpeed, EcgViewerGridSettings, EcgViewerTransform } from "./types";

export type EcgViewerToolMode = "select" | "pan" | "caliper" | "measurement" | "annotation";

export type EcgCaliperKind = "horizontal" | "vertical" | "dual" | "multi" | "angle" | "distance";

export type EcgMeasurementKind =
  | "pr_interval"
  | "qrs_duration"
  | "qt_interval"
  | "qtc"
  | "qt_dispersion"
  | "rr_interval"
  | "pp_interval"
  | "st_elevation"
  | "st_depression"
  | "heart_rate"
  | "p_wave_duration"
  | "t_wave_duration"
  | "p_amplitude"
  | "r_amplitude"
  | "s_amplitude"
  | "t_amplitude"
  | "electrical_axis"
  | "custom";

export type EcgCalibrationSnapshot = {
  gain: number;
  pixelsPerSmallBox: number;
  speed: number;
};

export type EcgAnnotationKind =
  | "arrow"
  | "circle"
  | "rectangle"
  | "ellipse"
  | "freehand"
  | "highlighter"
  | "text"
  | "number"
  | "medical";

export type ImagePoint = { x: number; y: number };

export type EcgCaliper = {
  id: string;
  kind: EcgCaliperKind;
  start: ImagePoint;
  end: ImagePoint;
  vertex?: ImagePoint;
  waypoints?: ImagePoint[];
  groupId?: string;
  locked: boolean;
  hidden: boolean;
  snapToGrid: boolean;
  color: string;
  label?: string;
  comments?: string;
  measurementKind?: EcgMeasurementKind;
  lead?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type EcgMeasurementReadouts = {
  angleDegrees?: number;
  bpm?: number;
  largeBoxes?: number;
  milliseconds?: number;
  mm?: number;
  mv?: number;
  pathPixels?: number;
  seconds?: number;
  smallBoxes?: number;
};

export type EcgClinicalMeasurement = {
  id: string;
  caliperId: string;
  kind: EcgMeasurementKind;
  name: string;
  type: string;
  value: number;
  unit: string;
  lead?: string;
  start: ImagePoint;
  end: ImagePoint;
  durationMs?: number;
  amplitudeMv?: number;
  comments?: string;
  doctorNotes?: string;
  aiInterpretation?: string | null;
  referenceRange?: string;
  clinicalSignificance?: string;
  calibrationSnapshot?: EcgCalibrationSnapshot;
  confidence: number | null;
  timestamp: string;
  updatedAt: string;
  createdBy?: string;
  operator: string;
  hidden: boolean;
  groupId?: string;
  readouts: EcgMeasurementReadouts;
};

export type EcgViewerAnnotation = {
  id: string;
  kind: EcgAnnotationKind;
  points: ImagePoint[];
  color: string;
  opacity: number;
  thickness: number;
  text?: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EcgMeasurementHistoryEntry = {
  action: "create" | "delete" | "rename" | "restore" | "update";
  caliperId?: string;
  doctor: string;
  id: string;
  lead?: string;
  measurementId?: string;
  measurementType: string;
  name?: string;
  timestamp: string;
  value: string;
};

export type EcgMeasurementSnapSettings = {
  multiLeadSync: boolean;
  snapToBaseline: boolean;
  snapToGrid: boolean;
  snapToWave: boolean;
};

export type EcgViewerWorkspaceState = {
  activeLead?: string;
  activeMeasurementKind?: EcgMeasurementKind;
  aiOverlay?: EcgAiOverlayState;
  annotations: EcgViewerAnnotation[];
  calipers: EcgCaliper[];
  grid: EcgViewerGridSettings;
  measurementHistory: EcgMeasurementHistoryEntry[];
  measurements: EcgClinicalMeasurement[];
  selectedAnnotationId: string | null;
  selectedCaliperId: string | null;
  selectedMeasurementId: string | null;
  snapSettings: EcgMeasurementSnapSettings;
  syncTimestampMs: number | null;
  toolMode: EcgViewerToolMode;
  transform: EcgViewerTransform;
  adjustments: EcgImageAdjustments;
  version: 5;
};

export const MEASUREMENT_KIND_LABELS: Record<EcgMeasurementKind, string> = {
  custom: "Custom",
  electrical_axis: "Electrical Axis",
  heart_rate: "Heart Rate",
  p_amplitude: "P Amplitude",
  p_wave_duration: "P Wave Duration",
  pp_interval: "PP Interval",
  pr_interval: "PR Interval",
  qrs_duration: "QRS Duration",
  qt_dispersion: "QT Dispersion",
  qt_interval: "QT Interval",
  qtc: "QTc",
  r_amplitude: "R Amplitude",
  rr_interval: "RR Interval",
  s_amplitude: "S Amplitude",
  st_depression: "ST Depression",
  st_elevation: "ST Elevation",
  t_amplitude: "T Amplitude",
  t_wave_duration: "T Wave Duration",
};

export const ANNOTATION_COLORS = ["#DC2626", "#2563EB", "#059669", "#D97706", "#7C3AED", "#0F766E"] as const;

export function migrateWorkspaceState(raw: Partial<EcgViewerWorkspaceState> & { version?: number }): EcgViewerWorkspaceState {
  const calipers = (raw.calipers ?? []).map((caliper) => ({
    ...caliper,
    color: caliper.color ?? "#2563EB",
    createdBy: caliper.createdBy,
  }));
  const measurements = (raw.measurements ?? []).map((item) => ({
    ...item,
    amplitudeMv: item.amplitudeMv ?? item.readouts?.mv,
    confidence: item.confidence ?? null,
    createdBy: item.createdBy ?? item.operator,
    durationMs: item.durationMs ?? item.readouts?.milliseconds,
    end: item.end ?? { x: 0, y: 0 },
    start: item.start ?? { x: 0, y: 0 },
    updatedAt: item.updatedAt ?? item.timestamp,
  }));
  return createWorkspaceState({ ...raw, aiOverlay: raw.aiOverlay, calipers, measurements, version: 5 });
}

export function createWorkspaceState(partial?: Partial<EcgViewerWorkspaceState>): EcgViewerWorkspaceState {
  return {
    activeLead: partial?.activeLead ?? "II",
    activeMeasurementKind: partial?.activeMeasurementKind ?? "rr_interval",
    aiOverlay: partial?.aiOverlay,
    adjustments: partial?.adjustments ?? {
      brightness: 100,
      contrast: 100,
      flipHorizontal: false,
      flipVertical: false,
      grayscale: false,
      invert: false,
      sharpen: false,
    },
    annotations: partial?.annotations ?? [],
    calipers: partial?.calipers ?? [],
    grid: partial?.grid ?? { gain: 10, opacity: 0.75, speed: 25, visible: true },
    measurementHistory: partial?.measurementHistory ?? [],
    measurements: partial?.measurements ?? [],
    selectedAnnotationId: partial?.selectedAnnotationId ?? null,
    selectedCaliperId: partial?.selectedCaliperId ?? null,
    selectedMeasurementId: partial?.selectedMeasurementId ?? null,
    snapSettings: partial?.snapSettings ?? {
      multiLeadSync: true,
      snapToBaseline: true,
      snapToGrid: true,
      snapToWave: true,
    },
    syncTimestampMs: partial?.syncTimestampMs ?? null,
    toolMode: partial?.toolMode ?? "select",
    transform: partial?.transform ?? { panX: 0, panY: 0, rotation: 0, zoom: 1 },
    version: 5,
  };
}

export type CalibrationContext = {
  gain: EcgGridGain;
  gridSpacingPx: number;
  speed: EcgPaperSpeed;
};
