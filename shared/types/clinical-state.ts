export type WorkspaceState = {
  caseId: string;
  compareEnabled?: boolean;
  layoutMode?: string;
  panelState?: Record<string, boolean>;
  selectedLead?: string;
};

export type ViewerState = {
  caseId: string;
  compareOpacity?: number;
  gridEnabled: boolean;
  imageUrl?: string;
  pan: { x: number; y: number };
  zoom: number;
};

export type MonitorState = {
  activeLeads: string[];
  caseId: string;
  filter: string;
  fullscreen: boolean;
  heartRate?: number;
  layoutMode: string;
  playback: "live" | "paused" | "review";
  rhythm?: string;
  signalQuality?: string;
};

export type Lead = {
  label: string;
  name: string;
  samplingRate: number;
};

export type Waveform = {
  durationSeconds: number;
  lead: string;
  samples: number[];
  samplingRate: number;
};

export type SignalQuality = {
  continuityPercent?: number;
  noiseLevel?: number;
  score?: number;
};

export type Vitals = {
  heartRate?: number;
  prIntervalMs?: number;
  qrsDurationMs?: number;
  qtIntervalMs?: number;
  qtcIntervalMs?: number;
  rrIntervalMs?: number;
};
