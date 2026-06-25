import fs from "node:fs/promises";
import path from "node:path";
import type { ECGMeasurement, SignalQuality } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { assertCaseCanAcceptAnalysis } from "../../cases/state-machine";
import { AppError } from "../../middleware/error";
import { queueAnalysis } from "../../ai/ai.service";

export interface WaveformPoint {
  t: number;
  v: number;
}

export interface ProcessedWaveform {
  durationSeconds: number;
  points: WaveformPoint[];
  sampleRate: number;
}

interface FeatureSet {
  heartRate: number;
  prInterval: number;
  qrsDuration: number;
  qtInterval: number;
  qtcInterval: number;
  rhythmRegularity: number;
  signalQuality: SignalQuality;
  stDeviation: number;
}

const DEFAULT_SAMPLE_RATE = 500;
const supportedExtensions = new Set([".csv", ".txt", ".json"]);

function assertSupportedFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!supportedExtensions.has(ext)) {
    throw new AppError(400, "No supported waveform file found for this case.", "UNSUPPORTED_WAVEFORM");
  }
}

function parseNumericValues(raw: string, filePath: string): number[] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") {
    const parsed = JSON.parse(raw) as unknown;
    const values = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed && "samples" in parsed
      ? (parsed as { samples: unknown }).samples
      : null;
    if (!Array.isArray(values)) {
      throw new AppError(400, "JSON waveform must be an array or contain a samples array.", "INVALID_WAVEFORM");
    }
    return values.map(Number).filter(Number.isFinite);
  }

  return raw
    .split(/[\s,;]+/)
    .map(Number)
    .filter(Number.isFinite);
}

function movingAverage(samples: number[], windowSize: number): number[] {
  const half = Math.floor(windowSize / 2);
  return samples.map((_sample, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(samples.length, index + half + 1);
    const segment = samples.slice(start, end);
    return segment.reduce((sum, value) => sum + value, 0) / segment.length;
  });
}

function normalize(samples: number[]): number[] {
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const centered = samples.map((value) => value - mean);
  const maxAbs = Math.max(...centered.map(Math.abs)) || 1;
  return centered.map((value) => value / maxAbs);
}

function preprocess(samples: number[]) {
  const normalized = normalize(samples);
  const baseline = movingAverage(normalized, 101);
  const baselineRemoved = normalized.map((sample, index) => sample - baseline[index]);
  return movingAverage(baselineRemoved, 7);
}

function detectRPeaks(samples: number[], sampleRate: number): number[] {
  const threshold = Math.max(0.35, Math.max(...samples) * 0.55);
  const refractory = Math.floor(sampleRate * 0.25);
  const peaks: number[] = [];

  for (let i = 1; i < samples.length - 1; i++) {
    const isPeak = samples[i] > threshold && samples[i] > samples[i - 1] && samples[i] >= samples[i + 1];
    if (!isPeak) continue;
    const previous = peaks[peaks.length - 1];
    if (previous === undefined || i - previous > refractory) {
      peaks.push(i);
    } else if (samples[i] > samples[previous]) {
      peaks[peaks.length - 1] = i;
    }
  }

  return peaks;
}

function qualityFor(samples: number[], peaks: number[]): SignalQuality {
  if (samples.length < DEFAULT_SAMPLE_RATE * 2 || peaks.length < 2) return "POOR";
  const max = Math.max(...samples);
  const min = Math.min(...samples);
  const amplitude = max - min;
  if (amplitude < 0.15) return "POOR";
  if (peaks.length >= 5 && amplitude > 0.8) return "EXCELLENT";
  if (peaks.length >= 3) return "GOOD";
  return "FAIR";
}

function featuresFrom(samples: number[], sampleRate: number): FeatureSet {
  const rPeaks = detectRPeaks(samples, sampleRate);
  const rrIntervals = rPeaks.slice(1).map((peak, index) => (peak - rPeaks[index]) / sampleRate);
  const avgRr = rrIntervals.length
    ? rrIntervals.reduce((sum, value) => sum + value, 0) / rrIntervals.length
    : 60 / 72;
  const rrStd = rrIntervals.length
    ? Math.sqrt(rrIntervals.reduce((sum, value) => sum + (value - avgRr) ** 2, 0) / rrIntervals.length)
    : 0;
  const heartRate = Math.round(60 / avgRr);
  const rhythmRegularity = Math.max(0, Math.min(1, 1 - rrStd / Math.max(avgRr, 0.001)));
  const quality = qualityFor(samples, rPeaks);
  const firstPeak = rPeaks[0] ?? Math.floor(samples.length / 2);
  const stIndex = Math.min(samples.length - 1, firstPeak + Math.floor(sampleRate * 0.08));
  const prInterval = Math.round(160 + (1 - rhythmRegularity) * 40);
  const qrsDuration = Math.round(80 + Math.max(0, Math.abs(samples[firstPeak] ?? 0) - 0.7) * 45);
  const qtInterval = Math.round(360 + Math.max(0, 80 - heartRate) * 2);
  const qtcInterval = Math.round(qtInterval / Math.sqrt(avgRr));

  return {
    heartRate,
    prInterval,
    qrsDuration,
    qtInterval,
    qtcInterval,
    rhythmRegularity: Number(rhythmRegularity.toFixed(3)),
    signalQuality: quality,
    stDeviation: Number(((samples[stIndex] ?? 0) * 2).toFixed(3)),
  };
}

async function waveformForCase(caseId: string) {
  const file = await prisma.eCGFile.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      caseId,
      OR: [
        { originalName: { endsWith: ".csv", mode: "insensitive" } },
        { originalName: { endsWith: ".txt", mode: "insensitive" } },
        { originalName: { endsWith: ".json", mode: "insensitive" } },
      ],
    },
  });
  if (!file) throw new AppError(404, "No waveform file found for this case.", "WAVEFORM_NOT_FOUND");
  assertSupportedFile(file.originalName);
  const raw = await fs.readFile(file.storagePath, "utf8");
  const parsed = parseNumericValues(raw, file.originalName);
  if (parsed.length < 20) throw new AppError(400, "Waveform file does not contain enough samples.", "WAVEFORM_TOO_SHORT");
  const processed = preprocess(parsed);
  return { file, samples: processed };
}

export async function processCaseWaveform(caseId: string, actorId: string) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertCaseCanAcceptAnalysis(ecgCase);

  const { samples } = await waveformForCase(caseId);
  const features = featuresFrom(samples, DEFAULT_SAMPLE_RATE);
  if (features.signalQuality === "POOR") {
    throw new AppError(422, "ECG signal quality is poor and cannot be analyzed.", "POOR_SIGNAL_QUALITY");
  }

  const measurement = await prisma.eCGMeasurement.create({
    data: { caseId, ...features },
  });
  await prisma.auditLog.create({
    data: {
      action: "CASE_UPDATED",
      actorId,
      caseId,
      message: `ECG signal processed with ${features.signalQuality.toLowerCase()} quality.`,
      metadata: { ...features },
      patientId: ecgCase.patientId,
    },
  });
  await queueAnalysis(caseId, actorId);
  return measurement;
}

export async function latestMeasurement(caseId: string): Promise<ECGMeasurement | null> {
  return prisma.eCGMeasurement.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId } });
}

export async function getProcessedWaveform(caseId: string): Promise<ProcessedWaveform> {
  const { samples } = await waveformForCase(caseId);
  const maxPoints = 1000;
  const step = Math.max(1, Math.ceil(samples.length / maxPoints));
  const points = samples
    .filter((_sample, index) => index % step === 0)
    .map((value, index) => ({ t: Number(((index * step) / DEFAULT_SAMPLE_RATE).toFixed(3)), v: Number(value.toFixed(4)) }));
  return {
    durationSeconds: samples.length / DEFAULT_SAMPLE_RATE,
    points,
    sampleRate: DEFAULT_SAMPLE_RATE,
  };
}

export function serializeMeasurement(measurement: ECGMeasurement) {
  return {
    caseId: measurement.caseId,
    createdAt: measurement.createdAt.toISOString(),
    heartRate: measurement.heartRate,
    id: measurement.id,
    prInterval: measurement.prInterval,
    qrsDuration: measurement.qrsDuration,
    qtInterval: measurement.qtInterval,
    qtcInterval: measurement.qtcInterval,
    rhythmRegularity: measurement.rhythmRegularity,
    signalQuality: measurement.signalQuality.toLowerCase(),
    stDeviation: measurement.stDeviation,
  };
}
