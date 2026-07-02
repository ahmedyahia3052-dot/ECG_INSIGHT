import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { ImageAnalysisMetrics, ProcessedImageData } from "../types";

const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

export function isRasterEcgFile(originalName: string, mimeType: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (RASTER_EXTENSIONS.has(ext)) return true;
  return mimeType.startsWith("image/") && ext !== ".pdf";
}

export function isPdfEcgFile(originalName: string, mimeType: string) {
  const ext = path.extname(originalName).toLowerCase();
  return ext === ".pdf" || mimeType === "application/pdf";
}

function computeMetrics(data: Uint8Array, width: number, height: number): ImageAnalysisMetrics {
  const sample = data.length ? data : new Uint8Array([128]);
  const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const variance = sample.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sample.length;
  const contrast = Math.sqrt(variance) / 128;
  const darkRatio = sample.filter((value) => value < 72).length / sample.length;
  const edgeDensity = sample.slice(width + 1).filter((value, index) => {
    const left = sample[index];
    const up = sample[Math.max(0, index - width)];
    return Math.abs(value - left) > 34 || Math.abs(value - up) > 34;
  }).length / Math.max(sample.length - width - 1, 1);
  const noise = sample.slice(2).filter((value, index) => {
    const prev = sample[index];
    const next = sample[index + 2] ?? value;
    return Math.abs(value - (prev + next) / 2) > 48;
  }).length / Math.max(sample.length - 2, 1);
  const histogram = new Array<number>(16).fill(0);
  for (const value of sample) histogram[Math.min(15, Math.floor(value / 16))] += 1;
  const entropy = -histogram.reduce((sum, count) => {
    if (!count) return sum;
    const probability = count / sample.length;
    return sum + probability * Math.log2(probability);
  }, 0) / 4;

  let laplacianSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const index = y * width + x;
      const laplacian = Math.abs(
        4 * sample[index]
        - sample[index - 1]
        - sample[index + 1]
        - sample[index - width]
        - sample[index + width],
      );
      laplacianSum += laplacian;
      laplacianCount += 1;
    }
  }
  const blurScore = laplacianCount ? laplacianSum / laplacianCount : 0;

  return {
    blurScore: Number(blurScore.toFixed(2)),
    brightness: Number((mean / 255).toFixed(3)),
    contrast: Number(Math.min(1, contrast).toFixed(3)),
    darkRatio: Number(darkRatio.toFixed(3)),
    edgeDensity: Number(edgeDensity.toFixed(3)),
    entropy: Number(Math.min(1, entropy).toFixed(3)),
    height,
    noise: Number(noise.toFixed(3)),
    width,
  };
}

export async function decodeEcgImage(inputPath: string, originalName: string, mimeType: string): Promise<ProcessedImageData> {
  const ext = path.extname(originalName).toLowerCase();
  if (!isRasterEcgFile(originalName, mimeType) && !isPdfEcgFile(originalName, mimeType)) {
    throw new Error(`Unsupported ECG image format: ${ext || mimeType}`);
  }

  const pipeline = sharp(inputPath, isPdfEcgFile(originalName, mimeType) ? { density: 200 } : undefined)
    .rotate()
    .grayscale()
    .removeAlpha();

  const metadata = await pipeline.metadata();
  const originalWidth = metadata.width ?? 1;
  const originalHeight = metadata.height ?? 1;

  const maxDimension = 2400;
  const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
  const targetWidth = Math.max(1, Math.round(originalWidth * scale));
  const targetHeight = Math.max(1, Math.round(originalHeight * scale));

  const { data, info } = await pipeline
    .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const metrics = computeMetrics(data, info.width, info.height);

  return {
    buffer: data,
    channels: info.channels,
    height: info.height,
    metrics,
    originalHeight,
    originalWidth,
    width: info.width,
  };
}

export async function saveProcessedPreview(
  inputPath: string,
  outputDir: string,
  fileId: string,
  originalName: string,
  mimeType: string,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${fileId}-processed.png`);
  const ext = path.extname(originalName).toLowerCase();
  const isPdf = PDF_EXTENSIONS.has(ext) || mimeType === "application/pdf";

  await sharp(inputPath, isPdf ? { density: 200 } : undefined)
    .rotate()
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toFile(outputPath);

  return outputPath;
}
