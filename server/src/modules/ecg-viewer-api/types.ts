export const ECG_VIEWER_API_VERSION = "sprint89-ecg-viewer-v1" as const;
export const ECG_VIEWER_API_ID = "ecg-insight-ecg-viewer-api" as const;

export const DEFAULT_ZOOM_PRESETS = [0.5, 1, 2, 4, 8, 16] as const;

export interface EcgViewerImageDto {
  caseId: string;
  ecgFileId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  processedImageUrl?: string;
  checksum: string | null;
}

export interface EcgViewerMetadataDto {
  caseId: string;
  ecgFileId: string;
  acquisitionDate: string | null;
  fileType: string;
  manufacturer: string | null;
  deviceModel: string | null;
  samplingRate: number | null;
  numberOfLeads: number | null;
  durationSeconds: number | null;
  ocrMetadata: Record<string, unknown> | null;
  digitization: Record<string, unknown> | null;
  quality: { score: number; warnings: string[] } | null;
}

export interface EcgViewerLeadDto {
  leadName: string;
  samplingRate: number;
  durationSeconds: number;
  paperSpeed: number;
  gain: number;
  sampleCount: number;
  metadata: Record<string, unknown> | null;
}

export interface EcgViewerWaveformDto {
  caseId: string;
  ecgFileId: string;
  lead: string;
  samplingRate: number;
  durationSeconds: number;
  samples: number[];
}

export interface EcgViewerAnnotationDto {
  id: string;
  source: "ai" | "physician";
  lead: string;
  type: string;
  label?: string;
  startMs?: number;
  peakMs?: number;
  endMs?: number;
  geometry?: Record<string, unknown>;
  visible?: boolean;
  authorId?: string;
  createdAt?: string;
}

export interface EcgViewerOverlayConfig {
  showAiFindings: boolean;
  showPhysicianAnnotations: boolean;
  showGrid: boolean;
  showLeadLabels: boolean;
  showMeasurementOverlay: boolean;
  opacity: number;
  layers: string[];
}

export interface EcgViewerComparisonDto {
  caseId: string;
  baselineCaseId?: string;
  deltas: Record<string, number>;
  trendDirection: Record<string, "up" | "down" | "stable">;
  current: Record<string, number>;
  baseline: Record<string, number>;
}

export interface EcgViewerBundleDto {
  version: string;
  caseId: string;
  image: EcgViewerImageDto | null;
  metadata: EcgViewerMetadataDto | null;
  measurements: Record<string, unknown> | null;
  leads: EcgViewerLeadDto[];
  annotations: EcgViewerAnnotationDto[];
  overlay: EcgViewerOverlayConfig | null;
  aiOverlay?: Record<string, unknown> | null;
  aiJobStatus: { pending: number; completed: number } | null;
}

export const DEFAULT_OVERLAY_CONFIG: EcgViewerOverlayConfig = {
  layers: ["grid", "waveform", "ai-findings"],
  opacity: 1,
  showAiFindings: true,
  showGrid: true,
  showLeadLabels: true,
  showMeasurementOverlay: true,
  showPhysicianAnnotations: true,
};
