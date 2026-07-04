import type { DigitizationPreprocessing, ImageAnalysisMetrics, ProcessedImageData } from "../types";

function gammaCorrect(data: Uint8Array | Buffer, gamma = 1.12) {
  return Uint8Array.from(data, (value) => Math.round(255 * ((value / 255) ** (1 / gamma))));
}

function histogramEqualize(data: Uint8Array | Buffer) {
  const histogram = new Array<number>(256).fill(0);
  for (let index = 0; index < data.length; index += 1) histogram[data[index] ?? 0] += 1;
  const cdf = histogram.reduce<number[]>((accumulator, count, value) => {
    accumulator[value] = (accumulator[value - 1] ?? 0) + count;
    return accumulator;
  }, []);
  const total = data.length;
  return Uint8Array.from(data, (value) => Math.round(((cdf[value] ?? 0) / total) * 255));
}

function sharpenEdges(data: Uint8Array | Buffer, width: number, height: number) {
  const output = Uint8Array.from(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = data[y * width + x] ?? 128;
      const neighbors =
        (data[(y - 1) * width + x] ?? 128)
        + (data[(y + 1) * width + x] ?? 128)
        + (data[y * width + x - 1] ?? 128)
        + (data[y * width + x + 1] ?? 128);
      const sharpened = Math.max(0, Math.min(255, center * 1.35 - neighbors * 0.0875));
      output[y * width + x] = Math.round(sharpened);
    }
  }
  return output;
}

function adaptiveBrightness(data: Uint8Array | Buffer, target = 0.58) {
  const mean = data.reduce((sum, value) => sum + value, 0) / Math.max(data.length, 1);
  const current = mean / 255;
  const factor = current > 0 ? target / current : 1;
  return Uint8Array.from(data, (value) => Math.max(0, Math.min(255, Math.round(value * factor))));
}

function cleanBackground(data: Uint8Array | Buffer, width: number, height: number) {
  const output = Uint8Array.from(data);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if ((output[index] ?? 255) > 245) output[index] = 255;
    }
  }
  return output;
}

function scoreImageQualityLocal(metrics: ImageAnalysisMetrics, preprocessingFlags: number) {
  const blur = Math.min(100, Math.round((metrics.blurScore / 18) * 100));
  const brightness = Math.min(100, Math.round(metrics.brightness * 100));
  const contrast = Math.min(100, Math.round(metrics.contrast * 100));
  return Math.max(0, Math.min(100, Math.round((blur + brightness + contrast) / 3 + preprocessingFlags)));
}

function detectBorder(data: Uint8Array, width: number, height: number) {
  const marginX = Math.floor(width * 0.04);
  const marginY = Math.floor(height * 0.04);
  let edgeHits = 0;
  let edgeSamples = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (x > marginX && x < width - marginX && y > marginY && y < height - marginY) continue;
      edgeSamples += 1;
      const value = data[y * width + x] ?? 255;
      if (value < 220) edgeHits += 1;
    }
  }
  return edgeSamples > 0 && edgeHits / edgeSamples > 0.08;
}

function estimateDeskew(data: Uint8Array, width: number, height: number) {
  const midY = Math.floor(height / 2);
  const row = Array.from({ length: width }, (_v, x) => data[midY * width + x] ?? 255);
  const threshold = row.reduce((sum, value) => sum + value, 0) / row.length;
  const darkXs: number[] = [];
  for (let x = 0; x < width; x += 1) {
    if (row[x] < threshold - 20) darkXs.push(x);
  }
  if (darkXs.length < 10) return 0;
  const first = darkXs[0];
  const last = darkXs[darkXs.length - 1];
  const delta = (row[last] ?? 255) - (row[first] ?? 255);
  return Number(Math.max(-3, Math.min(3, delta / 80)).toFixed(1));
}

function adaptiveThreshold(data: Uint8Array | Buffer, width: number, height: number, blockSize = 31, constant = 8) {
  const output = new Uint8Array(data.length);
  const half = Math.floor(blockSize / 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -half; dy <= half; dy += 4) {
        for (let dx = -half; dx <= half; dx += 4) {
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          sum += data[ny * width + nx] ?? 128;
          count += 1;
        }
      }
      const localMean = sum / count;
      const index = y * width + x;
      output[index] = (data[index] ?? 128) < localMean - constant ? 0 : 255;
    }
  }
  return output;
}

function denoise3x3(data: Uint8Array | Buffer, width: number, height: number) {
  const output = new Uint8Array(data.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          sum += data[(y + dy) * width + (x + dx)] ?? 128;
        }
      }
      output[y * width + x] = Math.round(sum / 9);
    }
  }
  return output;
}

function enhanceContrast(data: Uint8Array | Buffer) {
  let min = 255;
  let max = 0;
  for (let index = 0; index < data.length; index += 1) {
    const value = data[index] ?? 0;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const range = Math.max(1, max - min);
  return Uint8Array.from(data, (value) => Math.round(((value - min) / range) * 255));
}

function autoCrop(data: Uint8Array | Buffer, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if ((data[y * width + x] ?? 255) < 235) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return { data, height, width, xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 };
  }
  const padX = Math.floor((maxX - minX) * 0.02);
  const padY = Math.floor((maxY - minY) * 0.02);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(width - 1, maxX + padX);
  maxY = Math.min(height - 1, maxY + padY);
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const cropped = new Uint8Array(cropWidth * cropHeight);
  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      cropped[y * cropWidth + x] = data[(minY + y) * width + (minX + x)] ?? 255;
    }
  }
  return {
    data: cropped,
    height: cropHeight,
    width: cropWidth,
    heightPercent: Number(((cropHeight / height) * 100).toFixed(1)),
    widthPercent: Number(((cropWidth / width) * 100).toFixed(1)),
    xPercent: Number(((minX / width) * 100).toFixed(1)),
    yPercent: Number(((minY / height) * 100).toFixed(1)),
  };
}

export function preprocessEcgImage(source: ProcessedImageData): {
  image: ProcessedImageData;
  preprocessing: DigitizationPreprocessing;
} {
  const { metrics } = source;
  let data = source.buffer;
  let width = source.width;
  let height = source.height;

  const borderDetected = detectBorder(data, width, height);
  const deskewDegrees = estimateDeskew(data, width, height);
  const autoRotationDegrees = Math.abs(deskewDegrees) >= 0.8 ? Number((-deskewDegrees).toFixed(1)) : 0;
  const shadowRemoved = metrics.darkRatio > 0.18;
  if (shadowRemoved) data = Buffer.from(enhanceContrast(data));

  const contrastEnhanced = metrics.contrast < 0.62 || metrics.brightness > 0.72;
  if (contrastEnhanced) data = Buffer.from(enhanceContrast(data));

  const adaptiveBrightnessApplied = metrics.brightness < 0.42 || metrics.brightness > 0.78;
  if (adaptiveBrightnessApplied) data = Buffer.from(adaptiveBrightness(data));

  const gammaCorrected = metrics.contrast < 0.55;
  if (gammaCorrected) data = Buffer.from(gammaCorrect(data));

  const histogramEqualized = metrics.entropy < 0.42;
  if (histogramEqualized) data = Buffer.from(histogramEqualize(data));

  const noiseReduced = metrics.noise > 0.08;
  if (noiseReduced) data = Buffer.from(denoise3x3(data, width, height));

  const crop = autoCrop(data, width, height);
  data = Buffer.from(crop.data);
  width = crop.width;
  height = crop.height;

  const backgroundCleaned = borderDetected;
  if (backgroundCleaned) data = Buffer.from(cleanBackground(data, width, height));

  const edgeEnhanced = metrics.edgeDensity < 0.03;
  if (edgeEnhanced) data = Buffer.from(sharpenEdges(data, width, height));

  const adaptiveThresholdApplied = metrics.edgeDensity > 0.02;
  if (adaptiveThresholdApplied) data = Buffer.from(adaptiveThreshold(data, width, height));

  const colorNormalized = source.channels > 1;
  const multiResolutionApplied = width > 2400 || height > 1800;
  const preprocessingFlags =
    (contrastEnhanced ? 3 : 0)
    + (noiseReduced ? 3 : 0)
    + (edgeEnhanced ? 2 : 0)
    + (gammaCorrected ? 2 : 0);
  const imageQualityScore = scoreImageQualityLocal(metrics, preprocessingFlags);

  const updatedMetrics: ImageAnalysisMetrics = {
    ...metrics,
    height,
    width,
  };

  const preprocessing: DigitizationPreprocessing = {
    adaptiveBrightnessApplied,
    adaptiveThresholdApplied,
    autoRotationDegrees,
    backgroundCleaned,
    borderDetected,
    colorNormalized,
    contrastEnhanced,
    croppingOptimization: {
      heightPercent: crop.heightPercent,
      widthPercent: crop.widthPercent,
      xPercent: crop.xPercent,
      yPercent: crop.yPercent,
    },
    deskewDegrees,
    edgeEnhanced,
    gammaCorrected,
    gridEnhanced: metrics.edgeDensity > 0.035,
    histogramEqualized,
    imageQualityScore,
    multiResolutionApplied,
    noiseReduced,
    perspectiveCorrected: borderDetected && Math.abs(deskewDegrees) >= 0.8,
    shadowRemoved,
  };

  return {
    image: {
      ...source,
      buffer: Buffer.from(data),
      height,
      metrics: updatedMetrics,
      width,
    },
    preprocessing,
  };
}
