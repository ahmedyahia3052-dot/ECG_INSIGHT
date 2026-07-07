export const STANDARD_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;
export const DEFAULT_SAMPLING_RATE = 500;
export const DIGITIZATION_PIPELINE_VERSION = "ecg-digitization-v47.0";
export const MIN_ACCEPTABLE_QUALITY_SCORE = 50;
export const MIN_ACCEPTABLE_VALIDATION_SCORE = 55;

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
  gridRotationDeg?: number;
  horizontalGridLines?: number;
  verticalGridLines?: number;
  gridDensity?: number;
  gridColor?: "red" | "pink" | "gray" | "unknown";
  gridThicknessPx?: number;
  paperSpeedMmPerSec: 25 | 50;
  pixelsPerSmallSquare?: number;
  pixelsPerMm?: number;
  pixelsPerMv?: number;
  pixelsPerMs?: number;
  speedConfidence?: number;
  gainConfidence?: number;
}

export interface DigitizationPreprocessing {
  adaptiveBrightnessApplied?: boolean;
  adaptiveThresholdApplied: boolean;
  autoRotationDegrees: number;
  backgroundCleaned?: boolean;
  borderDetected: boolean;
  colorNormalized?: boolean;
  contrastEnhanced: boolean;
  croppingOptimization: { heightPercent: number; widthPercent: number; xPercent: number; yPercent: number };
  deskewDegrees: number;
  edgeEnhanced?: boolean;
  gammaCorrected?: boolean;
  gridEnhanced: boolean;
  histogramEqualized?: boolean;
  imageQualityScore?: number;
  multiResolutionApplied?: boolean;
  noiseReduced: boolean;
  perspectiveCorrected: boolean;
  processedImagePath?: string;
  shadowRemoved: boolean;
  smartDetection?: SmartEcgDetectionSnapshot;
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
  reasons?: string[];
  tier?: "Excellent" | "Fair" | "Good" | "Poor";
}

export interface SmartEcgDetectionSnapshot {
  autoCropRecommended: boolean;
  backgroundNoiseLevel: "high" | "low" | "medium";
  foldedPaperLikely: boolean;
  paperBordersDetected: boolean;
  paperColor: "pink" | "red" | "white" | "unknown";
  perspectiveDistortion: boolean;
  rotationDegrees: number;
  shadowDetected: boolean;
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

export interface EcgMetadataOcr {
  age?: string;
  date?: string;
  doctor?: string;
  ecgMachine?: string;
  filterSettings?: string;
  gain?: string;
  gender?: string;
  hospital?: string;
  machineNotes?: string;
  patientName?: string;
  serialNumber?: string;
  speed?: string;
  technician?: string;
  time?: string;
}

export interface DigitalSignalPoint {
  sampleIndex: number;
  timeMs: number;
  voltageMv: number;
}

export interface DigitalSignalObject {
  calibration: Pick<GridCalibration, "gainMmPerMv" | "paperSpeedMmPerSec">;
  confidence: number;
  durationSeconds: number;
  lead: string;
  metadata?: {
    ecgFileId?: string;
    leadSegment?: LeadSegment;
    patientId?: string;
  };
  points: DigitalSignalPoint[];
  samplingRate: number;
}

export interface WaveformExtractionMetrics {
  artifactRejectedSamples: number;
  branchResolved: number;
  centerlineConfidence: number;
  crossingResolved: number;
  gapRecovered: number;
  subPixelError: number;
  waveConfidence: number;
}

export interface SignalValidationMetrics {
  baselineDrift: number;
  brokenSignals: number;
  calibrationAccuracy: number;
  digitizationAccuracy: number;
  gridAccuracy: number;
  gridMisalignment: boolean;
  impossibleHeartRate: boolean;
  impossibleVoltage: boolean;
  leadDetectionPercent: number;
  leadMixUp: boolean;
  missingSamples: number;
  noiseRatio: number;
  pixelError: number;
  score: number;
  signalContinuityPercent: number;
  signalSaturation: boolean;
  subPixelError: number;
  warnings: string[];
}

export interface DigitizationArtifacts {
  centerlinePaths?: Record<string, string>;
  gridOverlaySvg?: string;
  normalizedImageHash?: string;
  ocrMetadata?: EcgMetadataOcr;
  validation?: SignalValidationMetrics;
  waveformMetrics?: Record<string, WaveformExtractionMetrics>;
}

export interface DigitizationPipelineResult {
  artifacts?: DigitizationArtifacts;
  calibration: GridCalibration;
  durationSeconds: number;
  enhancedImagePath?: string;
  leadSegments: LeadSegment[];
  leads: DigitizedLead[];
  ocrMetadata?: EcgMetadataOcr;
  pipelineVersion?: string;
  preprocessing: DigitizationPreprocessing;
  quality: DigitizationQuality;
  signalObjects?: DigitalSignalObject[];
  validation?: SignalValidationMetrics;
}

export interface DigitizationStageError {
  code: string;
  message: string;
  recoverySuggestion: string;
  stage: "normalization" | "grid" | "ocr" | "lead_detection" | "waveform" | "signal" | "validation" | "export";
}
