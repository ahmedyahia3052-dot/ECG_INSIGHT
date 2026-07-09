import type {
  GridCalibration,
  ImageAnalysisMetrics,
  LeadSegment,
} from "../ecg-digitization/types";
import type { ECGFile } from "@prisma/client";

export type WaveformExtractionInput = {
  calibration: GridCalibration;
  durationSeconds: number;
  ecgFileId: string;
  imageBuffer: Uint8Array;
  imageHeight: number;
  imageWidth: number;
  leadSegments: LeadSegment[];
  sampleCount: number;
};

export type WaveformExtractionOutput = {
  leads: Array<{ lead: string; samples: number[]; samplingRate: number; durationSeconds: number }>;
  waveformMetrics: Record<string, unknown>;
};

export interface WaveformExtractionEngine {
  extract(input: WaveformExtractionInput): WaveformExtractionOutput;
}

export interface LeadSegmentationEngine {
  segment(input: {
    imageBuffer: Uint8Array;
    imageHeight: number;
    imageMetrics: ImageAnalysisMetrics;
    imageWidth: number;
  }): { leadSegments: LeadSegment[]; mappedLeadCount: number };
}

export type IngestedEcgFile = Pick<
  ECGFile,
  "id" | "metadataJson" | "mimeType" | "originalName" | "sizeBytes" | "storagePath" | "storageKey" | "storageProvider"
>;
