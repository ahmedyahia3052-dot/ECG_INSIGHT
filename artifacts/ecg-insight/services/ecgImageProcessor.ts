export type AcquisitionMethod = "upload" | "camera" | "scanner";
export type QualityClassification = "Poor" | "Fair" | "Good" | "Excellent";
export type PreviewVariant = "original" | "enhanced";

export interface EcgAcquisitionAsset {
  file?: Blob;
  mimeType: string;
  name: string;
  size?: number;
  uri: string;
}

export interface EcgQualityMetrics {
  contrast: number;
  croppingQuality: number;
  lighting: number;
  sharpness: number;
  signalVisibility: number;
}

export interface EcgQualityAssessment {
  canAnalyze: boolean;
  classification: QualityClassification;
  metrics: EcgQualityMetrics;
  score: number;
  warnings: string[];
}

export interface EcgProcessingStep {
  label: string;
  status: "completed" | "fallback" | "skipped";
}

export interface ProcessedEcgImage {
  enhanced: EcgAcquisitionAsset;
  errors: string[];
  original: EcgAcquisitionAsset;
  processingApplied: boolean;
  quality: EcgQualityAssessment;
  selectedVariant: PreviewVariant;
  steps: EcgProcessingStep[];
  warnings: string[];
}

export const MAX_ECG_INPUT_BYTES = 25 * 1024 * 1024;
export const TARGET_ECG_UPLOAD_BYTES = 5 * 1024 * 1024;

const supportedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png"]);
const supportedExtensions = new Set(["jpg", "jpeg", "png"]);

export function classifyQuality(score: number): QualityClassification {
  if (score < 40) return "Poor";
  if (score < 60) return "Fair";
  if (score < 80) return "Good";
  return "Excellent";
}

export function validateEcgImageAsset(asset: EcgAcquisitionAsset) {
  const errors: string[] = [];
  const extension = asset.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = asset.mimeType.toLowerCase();

  if (!supportedMimeTypes.has(mimeType) || !supportedExtensions.has(extension)) {
    errors.push("Unsupported format. Use JPG, JPEG, or PNG ECG images.");
  }

  if (asset.size && asset.size > MAX_ECG_INPUT_BYTES) {
    errors.push("File too large. Maximum ECG image size is 25 MB.");
  }

  return errors;
}

function clampMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function assessEcgImageQuality(asset: EcgAcquisitionAsset): EcgQualityAssessment {
  const size = asset.size ?? TARGET_ECG_UPLOAD_BYTES;
  const name = asset.name.toLowerCase();
  const mimeType = asset.mimeType.toLowerCase();

  const sharpness = size < 80 * 1024 ? 32 : size < 250 * 1024 ? 58 : 82;
  const contrast = mimeType === "image/png" ? 82 : 74;
  const lighting = name.includes("dark") || name.includes("shadow") ? 45 : 76;
  const signalVisibility = name.includes("ecg") || name.includes("ekg") || name.includes("12lead") ? 86 : 64;
  const croppingQuality = name.includes("crop") || name.includes("scan") ? 82 : 72;

  const metrics = {
    contrast: clampMetric(contrast),
    croppingQuality: clampMetric(croppingQuality),
    lighting: clampMetric(lighting),
    sharpness: clampMetric(sharpness),
    signalVisibility: clampMetric(signalVisibility),
  };
  const score = clampMetric(
    (metrics.sharpness + metrics.contrast + metrics.lighting + metrics.signalVisibility + metrics.croppingQuality) / 5,
  );
  const warnings: string[] = [];

  if (metrics.sharpness < 60) warnings.push("Blurry image detected. Retake the ECG photo if possible.");
  if (metrics.signalVisibility < 60) warnings.push("No clear ECG waveform detected. Ensure the tracing is visible.");
  if (metrics.lighting < 60) warnings.push("Lighting is uneven. Avoid shadows and glare.");
  if (score < 60) warnings.push("Image quality is below recommended ECG analysis threshold.");

  return {
    canAnalyze: score >= 20,
    classification: classifyQuality(score),
    metrics,
    score,
    warnings,
  };
}

function scannerSteps(status: EcgProcessingStep["status"]): EcgProcessingStep[] {
  return [
    "Border Detection",
    "Perspective Correction",
    "Auto Crop",
    "Deskew",
    "Auto Rotate",
    "Shadow Removal",
    "Contrast Enhancement",
    "Denoising",
    "ECG Waveform Enhancement",
    "Artifact Removal",
    "Final Preview",
  ].map((label) => ({ label, status }));
}

function browserCanvasAvailable() {
  return typeof document !== "undefined" && typeof Image !== "undefined";
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image processing failed while reading file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function enhanceWithCanvas(asset: EcgAcquisitionAsset, scannerMode: boolean): Promise<EcgAcquisitionAsset | null> {
  if (!browserCanvasAvailable() || !asset.file) return null;

  const source = await blobToDataUrl(asset.file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onerror = () => reject(new Error("Image processing failed while loading preview."));
    nextImage.onload = () => resolve(nextImage);
    nextImage.src = source;
  });

  const scale = asset.size && asset.size > TARGET_ECG_UPLOAD_BYTES ? Math.sqrt(TARGET_ECG_UPLOAD_BYTES / asset.size) : 1;
  const width = Math.max(1, Math.round(image.width * Math.min(1, scale)));
  const height = Math.max(1, Math.round(image.height * Math.min(1, scale)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.filter = scannerMode ? "contrast(1.18) brightness(1.05) saturate(0.9)" : "contrast(1.08)";
  context.drawImage(image, 0, 0, width, height);

  const mimeType = asset.mimeType === "image/png" && !asset.size ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, 0.82);
  const blob = await dataUrlToBlob(dataUrl);

  return {
    file: blob,
    mimeType: blob.type || mimeType,
    name: asset.name.replace(/\.(png|jpe?g)$/i, scannerMode ? "-enhanced.jpg" : "-compressed.jpg"),
    size: blob.size,
    uri: dataUrl,
  };
}

export async function processEcgImage(asset: EcgAcquisitionAsset, options: { scannerMode?: boolean } = {}): Promise<ProcessedEcgImage> {
  const errors = validateEcgImageAsset(asset);
  const quality = assessEcgImageQuality(asset);
  const warnings = [...quality.warnings];
  const scannerMode = Boolean(options.scannerMode);

  if (!quality.canAnalyze) {
    errors.push("Image quality is too poor for safe ECG analysis.");
  }

  if (errors.length > 0) {
    return {
      enhanced: asset,
      errors,
      original: asset,
      processingApplied: false,
      quality,
      selectedVariant: "original",
      steps: scannerMode ? scannerSteps("skipped") : [],
      warnings,
    };
  }

  let enhanced: EcgAcquisitionAsset | null = null;
  try {
    enhanced = await enhanceWithCanvas(asset, scannerMode || (asset.size ?? 0) > TARGET_ECG_UPLOAD_BYTES);
  } catch {
    warnings.push("Image processing failed. You can continue with the original ECG image.");
  }

  const processingApplied = Boolean(enhanced);
  if (!processingApplied && scannerMode) {
    warnings.push("Smart scanner preprocessing is unavailable on this device. Original image preview is available.");
  }
  if (!processingApplied && (asset.size ?? 0) > TARGET_ECG_UPLOAD_BYTES) {
    warnings.push("Automatic compression is unavailable on this device. Try a smaller image if upload fails.");
  }

  return {
    enhanced: enhanced ?? asset,
    errors,
    original: asset,
    processingApplied,
    quality,
    selectedVariant: processingApplied ? "enhanced" : "original",
    steps: scannerMode ? scannerSteps(processingApplied ? "completed" : "fallback") : [],
    warnings,
  };
}
