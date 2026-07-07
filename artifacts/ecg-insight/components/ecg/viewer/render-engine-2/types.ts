import type { EcgGridGain, EcgPaperSpeed } from "../types";

export const RENDER_ENGINE_2_VERSION = "2.0.0";
export const TARGET_FPS = 60;
export const MIN_ACCEPTABLE_FPS = 55;

export type RenderEngine2Backend = "canvas2d" | "offscreen";

export type WaveformArtifactMode =
  | "baselineWander"
  | "muscleArtifact"
  | "powerlineInterference"
  | "respirationDrift"
  | "noise";

export type RenderEngine2DisplayProfile = {
  background: string;
  contrast: number;
  brightness: number;
  phosphorColor: string;
  phosphorGlow: number;
  crtPersistence: number;
  gridMajor: string;
  gridMinor: string;
};

export type RenderEngine2GridSettings = {
  paperSpeed: EcgPaperSpeed;
  gain: EcgGridGain;
  visible: boolean;
  zoom: number;
};

export type RenderEngine2WaveformSettings = {
  clinicalSmoothing: boolean;
  filterEnabled: boolean;
  artifacts: Partial<Record<WaveformArtifactMode, boolean>>;
};

export type RenderEngine2LeadSyncClock = {
  playheadMs: number;
  offsetIndex: number;
  sampleRate: number;
};

export type RenderEngine2Metrics = {
  fps: number;
  frameMs: number;
  droppedFrames: number;
  gpuAccelerated: boolean;
};

export type RenderEngine2BenchmarkResult = {
  avgFps: number;
  minFps: number;
  passed: boolean;
  frameCount: number;
};
