import type { EcgGridGain, EcgLeadId, EcgPaperSpeed } from "../types";

export type EcgProViewerTheme = "dark" | "light";

export type EcgProViewerDisplayMode = "grid" | "image" | "image-grid" | "waveform";

export type EcgProViewerCanvasMode = "image" | "waveform" | "hybrid";

export type EcgProViewerLayoutPreset = "12-lead" | "rhythm" | "single" | "3x4" | "6x2";

export type EcgProViewerGridColors = {
  major: string;
  minor: string;
};

export const ECG_PRO_VIEWER_THEMES: Record<EcgProViewerTheme, {
  background: string;
  border: string;
  grid: EcgProViewerGridColors;
  muted: string;
  panel: string;
  text: string;
  toolbar: string;
}> = {
  dark: {
    background: "#0B1220",
    border: "#1E293B",
    grid: { major: "#E36A6A", minor: "#F3A6A6" },
    muted: "#94A3B8",
    panel: "#111827",
    text: "#E2E8F0",
    toolbar: "#0F172A",
  },
  light: {
    background: "#F8FAFC",
    border: "#CBD5E1",
    grid: { major: "#C53030", minor: "#FCA5A5" },
    muted: "#64748B",
    panel: "#FFFFFF",
    text: "#0F172A",
    toolbar: "#FFFFFF",
  },
};

export type EcgProViewerSession = {
  acquisitionDate?: string;
  caseId: string;
  caseNumber?: string;
  checksum?: string | null;
  ecgFileId?: string;
  imageHeight?: number;
  imageUrl?: string;
  imageWidth?: number;
  mimeType?: string;
  originalName?: string;
  patientAge?: number;
  patientGender?: string;
  patientId?: string;
  patientName?: string;
  sizeBytes?: number;
  studyDate?: string;
};

export type EcgProViewerPointer = {
  imageX: number;
  imageY: number;
  x: number;
  y: number;
} | null;

export type EcgProViewerPaperSettings = {
  gain: EcgGridGain;
  speed: EcgPaperSpeed;
};

export type EcgProViewerLeadSelection = EcgLeadId | "ALL";
