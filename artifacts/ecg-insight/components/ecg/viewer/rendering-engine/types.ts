import type { DigitalEcg, DigitalEcgLead } from "@/services/ecgProcessing";

import type { EcgGridGain, EcgLeadId, EcgPaperSpeed } from "../types";

/** Sprint 27 — hospital-grade ECG rendering pipeline types */

export type EcgRenderBackend = "svg" | "canvas2d" | "webgl";

export type EcgRenderLayerId =
  | "grid"
  | "waveform"
  | "measurement"
  | "ai"
  | "annotation"
  | "selection"
  | "cursor"
  | "tooltip";

export const RENDER_LAYER_Z: Record<EcgRenderLayerId, number> = {
  grid: 10,
  waveform: 20,
  measurement: 30,
  ai: 40,
  annotation: 50,
  selection: 60,
  cursor: 70,
  tooltip: 80,
};

export type EcgRenderViewport = {
  containerHeight: number;
  containerWidth: number;
  dpr: number;
  panX: number;
  panY: number;
  signalHeight: number;
  signalWidth: number;
  zoom: number;
};

export type EcgRenderGridSettings = {
  gain: EcgGridGain;
  opacity: number;
  speed: EcgPaperSpeed;
  visible: boolean;
};

export type EcgVectorPoint = { t: number; v: number; x: number; y: number };

export type EcgVectorSegment = {
  lead: EcgLeadId | string;
  points: EcgVectorPoint[];
  sampleEnd: number;
  sampleStart: number;
};

export type EcgVectorModel = {
  durationMs: number;
  leads: EcgVectorSegment[];
  samplingRate: number;
  source: "digitized" | "image" | "live";
};

export type EcgDirtyRect = {
  height: number;
  layer: EcgRenderLayerId;
  width: number;
  x: number;
  y: number;
};

export type EcgRenderMetrics = {
  backend: EcgRenderBackend;
  dirtyRects: number;
  drawCalls: number;
  fps: number;
  frameMs: number;
  gpuAccelerated: boolean;
  layersSkipped: number;
  sampleCount: number;
  visibleSamples: number;
};

export type EcgInteractionState = {
  beatCursorMs: number | null;
  crosshair: { x: number; y: number } | null;
  highlightedLead: EcgLeadId | string | null;
  hoverLead: EcgLeadId | string | null;
  rubberBand: { end: { x: number; y: number }; start: { x: number; y: number } } | null;
  selectedLeads: string[];
};

export type EcgRenderPipelineInput = {
  backend?: EcgRenderBackend;
  digitalEcg?: DigitalEcg | null;
  grid: EcgRenderGridSettings;
  interaction?: Partial<EcgInteractionState>;
  lead?: DigitalEcgLead;
  playheadMs?: number;
  viewport: EcgRenderViewport;
};

export type EcgBenchmarkResult = {
  avgFrameMs: number;
  backend: EcgRenderBackend;
  fps: number;
  passed: boolean;
  sampleCount: number;
  targetFps: number;
};

export type EcgTwelveLeadRegion = {
  height: number;
  lead: EcgLeadId | string;
  rhythmStrip?: boolean;
  width: number;
  x: number;
  y: number;
};

export const TARGET_FPS = 60;
export const MIN_FRAME_MS = 1000 / TARGET_FPS;
