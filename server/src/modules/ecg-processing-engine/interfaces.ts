import type { DigitizedLead, GridCalibration } from "../ecg-digitization/types";

export type WaveformExtractionInput = {
  calibration: GridCalibration;
  durationSeconds: number;
  ecgFileId: string;
  height: number;
  imageBuffer: Uint8Array;
  leadSegments: Array<{
    confidence: number;
    heightPercent: number;
    lead: string;
    widthPercent: number;
    xPercent: number;
    yPercent: number;
  }>;
  sampleCount: number;
  width: number;
};

export type WaveformExtractionResult = {
  leads: DigitizedLead[];
  waveformMetrics: Record<string, unknown>;
};

export interface WaveformExtractionEngine {
  extract(input: WaveformExtractionInput): WaveformExtractionResult;
}

export type MeasurementEngineInput = {
  calibration: GridCalibration;
  caseId: string;
  leads: DigitizedLead[];
  patientAgeYears?: number;
  patientGender?: string;
};

export type MeasurementEngineOutput = {
  confidence: number;
  engineVersion: string;
  heartRateBpm: number;
  performanceMs: number;
  prIntervalMs: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  qtcBazettMs: number;
};

export interface MeasurementEngineAdapter {
  measure(input: MeasurementEngineInput): Promise<MeasurementEngineOutput>;
}

import type { ImageAnalysisMetrics } from "../ecg-digitization/types";

export type LeadMappingInput = {
  height: number;
  imageBuffer: Uint8Array;
  imageMetrics: ImageAnalysisMetrics;
  width: number;
};

export type LeadMappingResult = {
  leadSegments: Array<{
    confidence: number;
    heightPercent: number;
    lead: string;
    widthPercent: number;
    xPercent: number;
    yPercent: number;
  }>;
  mappedLeadCount: number;
};

export interface LeadMappingEngine {
  mapLeads(input: LeadMappingInput): LeadMappingResult;
}
