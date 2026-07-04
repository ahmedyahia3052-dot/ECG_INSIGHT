export type EcgPaperSpeed = 25 | 50;
export type EcgGridGain = 5 | 10 | 20;

export type EcgImageFormat = "png" | "jpg" | "jpeg" | "webp" | "tiff" | "bmp" | "pdf" | "unknown";

export type EcgViewerFitMode = "none" | "width" | "height" | "100";

export type EcgImageAdjustments = {
  brightness: number;
  contrast: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  grayscale: boolean;
  invert: boolean;
  sharpen: boolean;
};

export type EcgViewerTransform = {
  panX: number;
  panY: number;
  rotation: number;
  zoom: number;
};

export type EcgViewerGridSettings = {
  gain: EcgGridGain;
  opacity: number;
  speed: EcgPaperSpeed;
  visible: boolean;
};

export type EcgViewerPanMode = "none" | "active";

export type EcgViewerViewport = {
  containerHeight: number;
  containerWidth: number;
  imageHeight: number;
  imageWidth: number;
};

export type EcgClinicalFindingSource = "case" | "measurement" | "pending";

export type EcgClinicalFindingField = {
  label: string;
  source: EcgClinicalFindingSource;
  unit?: string;
  value: string;
};

export type EcgClinicalFindingsModel = {
  axis: EcgClinicalFindingField;
  confidence: EcgClinicalFindingField;
  heartRate: EcgClinicalFindingField;
  interpretation: EcgClinicalFindingField;
  prInterval: EcgClinicalFindingField;
  qrsDuration: EcgClinicalFindingField;
  qtInterval: EcgClinicalFindingField;
  qtcInterval: EcgClinicalFindingField;
  rhythm: EcgClinicalFindingField;
};

export const STANDARD_ECG_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;

export type EcgLeadId = (typeof STANDARD_ECG_LEADS)[number];

export const DEFAULT_ADJUSTMENTS: EcgImageAdjustments = {
  brightness: 100,
  contrast: 100,
  flipHorizontal: false,
  flipVertical: false,
  grayscale: false,
  invert: false,
  sharpen: false,
};

export const DEFAULT_TRANSFORM: EcgViewerTransform = {
  panX: 0,
  panY: 0,
  rotation: 0,
  zoom: 1,
};

export const DEFAULT_GRID: EcgViewerGridSettings = {
  gain: 10,
  opacity: 0.75,
  speed: 25,
  visible: true,
};

export type EcgViewerStudyContext = {
  acquisitionDevice?: string;
  caseId: string;
  caseNumber?: string;
  fileType?: string;
  heartRate?: number;
  hospital?: string;
  imageHeight?: number;
  imageUrl?: string;
  imageWidth?: number;
  pdfUrl?: string;
  physician?: string;
  studyDate?: string;
};

export type EcgViewerPatientContext = {
  age?: number;
  gender?: string;
  id: string;
  name: string;
};

export type EcgViewerPreviousStudy = {
  caseId: string;
  caseNumber?: string;
  studyDate?: string;
  thumbnailUrl?: string;
};
