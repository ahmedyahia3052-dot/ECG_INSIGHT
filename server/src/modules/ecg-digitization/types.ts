export const STANDARD_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;
export const DEFAULT_SAMPLING_RATE = 500;

export type LeadName = (typeof STANDARD_LEADS)[number];

export interface DigitizedLead {
  durationSeconds: number;
  lead: string;
  samples: number[];
  samplingRate: number;
}

export interface GridCalibration {
  confidence: number;
  gainMmPerMv: 5 | 10 | 20;
  gridDetected: boolean;
  paperSpeedMmPerSec: 25 | 50;
  pixelsPerSmallSquare?: number;
}

export interface DigitizationPreprocessing {
  adaptiveThresholdApplied: boolean;
  autoRotationDegrees: number;
  borderDetected: boolean;
  contrastEnhanced: boolean;
  croppingOptimization: { heightPercent: number; widthPercent: number; xPercent: number; yPercent: number };
  deskewDegrees: number;
  gridEnhanced: boolean;
  noiseReduced: boolean;
  perspectiveCorrected: boolean;
  processedImagePath?: string;
  shadowRemoved: boolean;
}

export interface DigitizationQuality {
  score: number;
  warnings: string[];
  metrics?: {
    blur: number;
    brightness: number;
    contrast: number;
    cropping: number;
    gridVisibility: number;
    paperVisibility: number;
    resolution: number;
  };
}

export interface LeadSegment {
  confidence: number;
  heightPercent: number;
  lead: string;
  widthPercent: number;
  xPercent: number;
  yPercent: number;
}

export interface ImageAnalysisMetrics {
  blurScore: number;
  brightness: number;
  contrast: number;
  darkRatio: number;
  edgeDensity: number;
  entropy: number;
  height: number;
  noise: number;
  width: number;
}

export interface ProcessedImageData {
  buffer: Buffer;
  channels: number;
  height: number;
  metrics: ImageAnalysisMetrics;
  originalHeight: number;
  originalWidth: number;
  processedPath?: string;
  width: number;
}

export interface DigitizationPipelineResult {
  calibration: GridCalibration;
  durationSeconds: number;
  enhancedImagePath?: string;
  leadSegments: LeadSegment[];
  leads: DigitizedLead[];
  preprocessing: DigitizationPreprocessing;
  quality: DigitizationQuality;
}
