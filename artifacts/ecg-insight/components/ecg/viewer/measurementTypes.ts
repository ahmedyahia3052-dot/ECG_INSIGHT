import type { EcgGridGain, EcgImageAdjustments, EcgPaperSpeed, EcgViewerGridSettings, EcgViewerTransform } from "./types";

export type EcgViewerToolMode = "select" | "pan" | "caliper" | "measurement" | "annotation";

export type EcgCaliperKind = "horizontal" | "vertical" | "dual";

export type EcgMeasurementKind =
  | "pr_interval"
  | "qrs_duration"
  | "qt_interval"
  | "qtc"
  | "rr_interval"
  | "pp_interval"
  | "st_elevation"
  | "st_depression"
  | "heart_rate"
  | "p_wave_duration"
  | "t_wave_duration"
  | "custom";

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
  bpm?: number;
  largeBoxes?: number;
  milliseconds?: number;
  mm?: number;
  mv?: number;
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
  confidence: number | null;
  timestamp: string;
  updatedAt: string;
  createdBy?: string;
  operator: string;
  hidden: boolean;
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

export type EcgViewerWorkspaceState = {
  activeLead?: string;
  activeMeasurementKind?: EcgMeasurementKind;
  annotations: EcgViewerAnnotation[];
  calipers: EcgCaliper[];
  grid: EcgViewerGridSettings;
  measurements: EcgClinicalMeasurement[];
  selectedAnnotationId: string | null;
  selectedCaliperId: string | null;
  selectedMeasurementId: string | null;
  toolMode: EcgViewerToolMode;
  transform: EcgViewerTransform;
  adjustments: EcgImageAdjustments;
  version: 3;
};

export const MEASUREMENT_KIND_LABELS: Record<EcgMeasurementKind, string> = {
  custom: "Custom",
  heart_rate: "Heart Rate",
  p_wave_duration: "P Wave Duration",
  pp_interval: "PP Interval",
  pr_interval: "PR Interval",
  qrs_duration: "QRS Duration",
  qt_interval: "QT Interval",
  qtc: "QTc",
  rr_interval: "RR Interval",
  st_depression: "ST Depression",
  st_elevation: "ST Elevation",
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
  return createWorkspaceState({ ...raw, calipers, measurements, version: 3 });
}

export function createWorkspaceState(partial?: Partial<EcgViewerWorkspaceState>): EcgViewerWorkspaceState {
  return {
    activeLead: partial?.activeLead ?? "II",
    activeMeasurementKind: partial?.activeMeasurementKind ?? "rr_interval",
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
    measurements: partial?.measurements ?? [],
    selectedAnnotationId: partial?.selectedAnnotationId ?? null,
    selectedCaliperId: partial?.selectedCaliperId ?? null,
    selectedMeasurementId: partial?.selectedMeasurementId ?? null,
    toolMode: partial?.toolMode ?? "select",
    transform: partial?.transform ?? { panX: 0, panY: 0, rotation: 0, zoom: 1 },
    version: 3,
  };
}

export type CalibrationContext = {
  gain: EcgGridGain;
  gridSpacingPx: number;
  speed: EcgPaperSpeed;
};
