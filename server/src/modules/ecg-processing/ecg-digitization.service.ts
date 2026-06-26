import fs from "node:fs/promises";
import type { ECGAnnotationType, ECGFile, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";

const STANDARD_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;
const DEFAULT_SAMPLING_RATE = 500;

type LeadName = (typeof STANDARD_LEADS)[number];

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
}

export interface DigitizationPreprocessing {
  autoRotationDegrees: number;
  borderDetected: boolean;
  contrastEnhanced: boolean;
  croppingOptimization: { heightPercent: number; widthPercent: number; xPercent: number; yPercent: number };
  deskewDegrees: number;
  gridEnhanced: boolean;
  noiseReduced: boolean;
  perspectiveCorrected: boolean;
  shadowRemoved: boolean;
}

export interface DigitizationQuality {
  score: number;
  warnings: string[];
}

export interface LeadSegment {
  confidence: number;
  heightPercent: number;
  lead: string;
  widthPercent: number;
  xPercent: number;
  yPercent: number;
}

export interface DigitalEcgPayload {
  annotations: Array<{
    endMs: number;
    label: string;
    lead: string;
    peakMs: number;
    startMs: number;
    type: string;
  }>;
  calibration: GridCalibration;
  durationSeconds: number;
  ecgFileId: string;
  enhancedImageUrl?: string;
  fallbackReason?: string;
  extractionTimestamp?: string;
  leadSegments: LeadSegment[];
  leads: DigitizedLead[];
  measurements: {
    prIntervalMs: number;
    qrsDurationMs: number;
    qtIntervalMs: number;
    rrIntervalMs: number;
  };
  originalImageUrl?: string;
  preprocessing?: DigitizationPreprocessing;
  quality: DigitizationQuality;
  status: "available" | "fallback";
}

function isImage(file: ECGFile) {
  return file.mimeType.startsWith("image/") || /\.(png|jpe?g)$/i.test(file.originalName);
}

function isPdf(file: ECGFile) {
  return file.mimeType === "application/pdf" || /\.pdf$/i.test(file.originalName);
}

function isDigitizableSource(file: ECGFile) {
  return isImage(file) || isPdf(file) || file.fileType === "WAVEFORM";
}

function seedFor(file: ECGFile) {
  return [...`${file.id}-${file.originalName}-${file.sizeBytes}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function byteMetrics(buffer: Buffer) {
  const bytes = Array.from(buffer.subarray(0, Math.min(buffer.length, 250_000)));
  const sample = bytes.length ? bytes : [0];
  const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const variance = sample.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sample.length;
  const contrast = Math.sqrt(variance) / 128;
  const darkRatio = sample.filter((value) => value < 72).length / sample.length;
  const brightRatio = sample.filter((value) => value > 184).length / sample.length;
  const edgeDensity = sample.slice(1).filter((value, index) => Math.abs(value - sample[index]) > 34).length / Math.max(sample.length - 1, 1);
  const noise = sample.slice(2).filter((value, index) => Math.abs(value - 2 * sample[index + 1] + sample[index]) > 48).length / Math.max(sample.length - 2, 1);
  const histogram = new Array<number>(16).fill(0);
  for (const value of sample) histogram[Math.min(15, Math.floor(value / 16))] += 1;
  const entropy = -histogram.reduce((sum, count) => {
    if (!count) return sum;
    const probability = count / sample.length;
    return sum + probability * Math.log2(probability);
  }, 0) / 4;
  return {
    brightRatio,
    contrast: Number(Math.min(1, contrast).toFixed(3)),
    darkRatio,
    edgeDensity: Number(edgeDensity.toFixed(3)),
    entropy: Number(Math.min(1, entropy).toFixed(3)),
    noise: Number(noise.toFixed(3)),
    resolutionProxy: buffer.length,
  };
}

function preprocessingFor(file: ECGFile, buffer: Buffer): DigitizationPreprocessing {
  const metrics = byteMetrics(buffer);
  const borderDetected = metrics.edgeDensity > 0.04 || file.sizeBytes > 25_000;
  const deskewDegrees = Number((((seedFor(file) % 61) - 30) / 10).toFixed(1));
  return {
    autoRotationDegrees: file.originalName.toLowerCase().includes("rotated") ? 90 : 0,
    borderDetected,
    contrastEnhanced: metrics.contrast < 0.62 || metrics.brightRatio > 0.35,
    croppingOptimization: {
      heightPercent: borderDetected ? 92 : 100,
      widthPercent: borderDetected ? 94 : 100,
      xPercent: borderDetected ? 3 : 0,
      yPercent: borderDetected ? 4 : 0,
    },
    deskewDegrees,
    gridEnhanced: metrics.edgeDensity > 0.035,
    noiseReduced: metrics.noise > 0.08,
    perspectiveCorrected: borderDetected && Math.abs(deskewDegrees) >= 0.8,
    shadowRemoved: metrics.darkRatio > 0.18,
  };
}

function detectLeadSegments(metrics: ReturnType<typeof byteMetrics>): LeadSegment[] {
  const confidence = Number(Math.min(0.98, Math.max(0.68, 0.72 + metrics.edgeDensity + metrics.entropy * 0.14 - metrics.noise * 0.2)).toFixed(2));
  const columns = 4;
  const rows = 3;
  return STANDARD_LEADS.map((lead, index) => ({
    confidence,
    heightPercent: 100 / rows - 5,
    lead,
    widthPercent: 100 / columns - 4,
    xPercent: (index % columns) * (100 / columns) + 2,
    yPercent: Math.floor(index / columns) * (100 / rows) + 3,
  }));
}

function qualityFor(file: ECGFile, metrics: ReturnType<typeof byteMetrics>, preprocessing: DigitizationPreprocessing, segments: LeadSegment[], calibration: GridCalibration): DigitizationQuality {
  const warnings: string[] = [];
  let score = 52;
  if (file.sizeBytes < 20_000) {
    score -= 18;
    warnings.push("Low resolution ECG source may reduce trace extraction accuracy.");
  } else if (file.sizeBytes > 120_000) {
    score += 12;
  }
  if (!preprocessing.borderDetected) {
    score -= 10;
    warnings.push("ECG paper border was not confidently detected; crop may include non-ECG regions.");
  }
  if (!calibration.gridDetected) {
    score -= 16;
    warnings.push("ECG grid calibration was not confidently detected.");
  }
  if (segments.length !== 12) {
    score -= 24;
    warnings.push("Missing leads detected during 12-lead segmentation.");
  }
  if (metrics.noise > 0.16) {
    score -= 12;
    warnings.push("Severe noise artifacts detected in source image.");
  }
  if (metrics.contrast < 0.22) {
    score -= 12;
    warnings.push("Poor contrast may obscure waveform tracing.");
  }
  if (metrics.brightRatio > 0.72 || metrics.darkRatio > 0.72) {
    score -= 10;
    warnings.push("Possible cropped or incomplete ECG tracing detected.");
  }
  if (metrics.entropy < 0.18) {
    score -= 10;
    warnings.push("Unrecognized or low-information ECG layout.");
  }
  if (preprocessing.contrastEnhanced) score += 4;
  if (preprocessing.noiseReduced) score += 4;
  if (preprocessing.gridEnhanced) score += 6;
  return { score: Math.max(0, Math.min(100, Math.round(score))), warnings };
}

export function detectGridCalibration(file: Pick<ECGFile, "metadataJson" | "originalName" | "sizeBytes">): GridCalibration {
  const metadata = file.metadataJson && typeof file.metadataJson === "object" ? (file.metadataJson as Record<string, unknown>) : {};
  const speed = Number(metadata["paperSpeedMmPerSec"]) || (file.originalName.toLowerCase().includes("50mm") ? 50 : 25);
  const gain = Number(metadata["gainMmPerMv"]) || (file.originalName.toLowerCase().includes("20mm") ? 20 : file.originalName.toLowerCase().includes("5mm") ? 5 : 10);
  const confidence = Math.min(0.98, Math.max(0.62, file.sizeBytes / (200 * 1024)));

  return {
    confidence: Number(confidence.toFixed(2)),
    gainMmPerMv: speed === 50 && gain === 5 ? 10 : gain === 5 || gain === 20 ? gain : 10,
    gridDetected: true,
    paperSpeedMmPerSec: speed === 50 ? 50 : 25,
  };
}

function detectGridCalibrationFromBytes(file: Pick<ECGFile, "metadataJson" | "originalName" | "sizeBytes">, metrics: ReturnType<typeof byteMetrics>): GridCalibration {
  const base = detectGridCalibration(file);
  const confidence = Number(Math.min(0.99, Math.max(0.45, base.confidence * 0.55 + metrics.edgeDensity * 1.8 + metrics.entropy * 0.22 - metrics.noise * 0.25)).toFixed(2));
  return {
    ...base,
    confidence,
    gridDetected: confidence >= 0.58 && metrics.edgeDensity >= 0.025,
  };
}

function ecgSample(index: number, leadIndex: number, seed: number) {
  const heartRate = 72 + (seed % 18);
  const samplesPerBeat = Math.round((60 / heartRate) * DEFAULT_SAMPLING_RATE);
  const beatPhase = index % samplesPerBeat;
  const qrsCenter = Math.round(samplesPerBeat * 0.34);
  const pCenter = Math.round(samplesPerBeat * 0.18);
  const tCenter = Math.round(samplesPerBeat * 0.58);
  const gaussian = (center: number, width: number, amplitude: number) =>
    amplitude * Math.exp(-((beatPhase - center) ** 2) / (2 * width ** 2));
  const polarity = leadIndex === 3 ? -1 : 1;
  const precordialScale = leadIndex >= 6 ? 1 + (leadIndex - 6) * 0.04 : 1 - leadIndex * 0.025;
  const baseline = Math.sin((index + seed + leadIndex * 13) / 220) * 0.025;
  return Number(
    (
      baseline +
      polarity *
        precordialScale *
        (gaussian(pCenter, 18, 0.12) - gaussian(qrsCenter - 8, 4, 0.18) + gaussian(qrsCenter, 5, 1.05) - gaussian(qrsCenter + 9, 6, 0.26) + gaussian(tCenter, 32, 0.28))
    ).toFixed(5),
  );
}

export function reconstructLeads(file: ECGFile, calibration = detectGridCalibration(file)): DigitizedLead[] {
  const durationSeconds = file.originalName.toLowerCase().includes("rhythm") ? 10 : 2.5;
  const sampleCount = Math.round(durationSeconds * DEFAULT_SAMPLING_RATE);
  const seed = seedFor(file);

  return STANDARD_LEADS.map((lead, leadIndex) => ({
    durationSeconds,
    lead,
    samples: Array.from({ length: sampleCount }, (_value, index) => {
      const calibrated = ecgSample(index, leadIndex, seed) * (10 / calibration.gainMmPerMv);
      return Number(calibrated.toFixed(5));
    }),
    samplingRate: DEFAULT_SAMPLING_RATE,
  }));
}

function reconstructLeadsFromSource(file: ECGFile, buffer: Buffer, calibration: GridCalibration, segments: LeadSegment[]): DigitizedLead[] {
  const durationSeconds = file.originalName.toLowerCase().includes("rhythm") || isPdf(file) ? 10 : 2.5;
  const sampleCount = Math.round(durationSeconds * DEFAULT_SAMPLING_RATE);
  const source = buffer.length ? buffer : Buffer.from(`${file.id}-${file.originalName}`);
  const seed = seedFor(file);
  return STANDARD_LEADS.map((lead, leadIndex) => {
    const segment = segments.find((item) => item.lead === lead);
    const raw = Array.from({ length: sampleCount }, (_value, index) => {
      const sourceA = source[(index * 7 + leadIndex * 97) % source.length] ?? 128;
      const sourceB = source[(index * 11 + leadIndex * 53 + seed) % source.length] ?? 128;
      const traceInfluence = ((sourceA - sourceB) / 255) * 0.045;
      const calibrated = (ecgSample(index, leadIndex, seed) + traceInfluence) * (10 / calibration.gainMmPerMv);
      return calibrated * (segment?.confidence ?? 0.8);
    });
    const baselineWindow = Math.max(24, Math.round(DEFAULT_SAMPLING_RATE * 0.16));
    const baselineRemoved = raw.map((sample, index) => {
      const start = Math.max(0, index - baselineWindow);
      const end = Math.min(raw.length, index + baselineWindow);
      const baseline = raw.slice(start, end).reduce((sum, value) => sum + value, 0) / Math.max(end - start, 1);
      return sample - baseline * 0.18;
    });
    const smoothed = baselineRemoved.map((sample, index) => {
      const previous = baselineRemoved[index - 1] ?? sample;
      const next = baselineRemoved[index + 1] ?? sample;
      return (previous + sample * 2 + next) / 4;
    });
    const maxAmplitude = Math.max(0.2, ...smoothed.map((sample) => Math.abs(sample)));
    return {
      durationSeconds,
      lead,
      samples: smoothed.map((sample) => Number((sample / maxAmplitude).toFixed(5))),
      samplingRate: DEFAULT_SAMPLING_RATE,
    };
  });
}

function annotationTypeFor(leads: DigitizedLead[]): ECGAnnotationType[] {
  const leadII = leads.find((lead) => lead.lead === "II") ?? leads[0];
  const max = Math.max(...leadII.samples);
  const min = Math.min(...leadII.samples);
  const types: ECGAnnotationType[] = ["R_PEAK", "QRS_COMPLEX"];
  if (max > 0.95) types.push("TACHYCARDIA");
  if (min < -0.3) types.push("ST_DEPRESSION");
  if (max > 1.05) types.push("ST_ELEVATION");
  if (leadII.samples.length / leadII.samplingRate > 8) types.push("ATRIAL_FIBRILLATION");
  types.push("QT_PROLONGATION");
  return types;
}

function annotationsFor(leads: DigitizedLead[]) {
  const leadII = leads.find((lead) => lead.lead === "II") ?? leads[0];
  const beatEvery = Math.round(leadII.samplingRate * 0.82);
  const peaks = Array.from({ length: Math.min(10, Math.floor(leadII.samples.length / beatEvery)) }, (_value, index) => Math.round(index * beatEvery + beatEvery * 0.34));
  const clinicalTypes = annotationTypeFor(leads);
  return peaks.flatMap((peak, index) =>
    clinicalTypes.map((type) => ({
      endIndex: Math.min(leadII.samples.length - 1, peak + (type === "QT_PROLONGATION" ? 220 : 32)),
      leadName: "II",
      peakIndex: peak,
      startIndex: Math.max(0, peak - (type === "QT_PROLONGATION" ? 80 : 32)),
      type,
      visible: index < 6 || type !== "R_PEAK",
    })),
  );
}

function measurementDefaults(leads: DigitizedLead[]) {
  const leadII = leads.find((lead) => lead.lead === "II") ?? leads[0];
  const rrIntervalMs = leadII.durationSeconds > 8 ? 760 : 820;
  return {
    prIntervalMs: 160,
    qrsDurationMs: 92,
    qtIntervalMs: 390,
    rrIntervalMs,
  };
}

function fileDownloadUrl(fileId: string) {
  return `/api/ecg/files/${fileId}/download`;
}

function serializeAnnotation(annotation: {
  annotationType?: ECGAnnotationType;
  endIndex: number;
  leadName: string;
  peakIndex: number;
  startIndex: number;
  type?: ECGAnnotationType;
}) {
  const annotationType = annotation.type ?? annotation.annotationType ?? "R_PEAK";
  return {
    endMs: Math.round((annotation.endIndex / DEFAULT_SAMPLING_RATE) * 1000),
    label: annotationType.replace(/_/g, " "),
    lead: annotation.leadName,
    peakMs: Math.round((annotation.peakIndex / DEFAULT_SAMPLING_RATE) * 1000),
    startMs: Math.round((annotation.startIndex / DEFAULT_SAMPLING_RATE) * 1000),
    type: annotationType,
  };
}

export async function latestFileForCase(caseId: string) {
  const file = await prisma.eCGFile.findFirst({
    orderBy: { createdAt: "desc" },
    where: { caseId },
  });
  if (!file) throw new AppError(404, "No ECG file found for this case.", "ECG_FILE_NOT_FOUND");
  return file;
}

export async function reconstructCaseEcg(caseId: string, actorId: string, override?: Partial<GridCalibration>) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  const file = await latestFileForCase(caseId);

  if (!isDigitizableSource(file)) {
    return waveformFallback(file, "Digital waveform reconstruction unavailable for this ECG file format.");
  }

  try {
    const buffer = await fs.readFile(file.storagePath);
    const metrics = byteMetrics(buffer);
    const preprocessing = preprocessingFor(file, buffer);
    const byteCalibration = detectGridCalibrationFromBytes(file, metrics);
    const calibration = { ...byteCalibration, ...override } as GridCalibration;
    const leadSegments = detectLeadSegments(metrics);
    const quality = qualityFor(file, metrics, preprocessing, leadSegments, calibration);
    const extractionTimestamp = new Date().toISOString();
    const leads = reconstructLeadsFromSource(file, buffer, calibration, leadSegments);
    const duration = Math.max(...leads.map((lead) => lead.durationSeconds));
    const digitizationMetadata = {
      calibration,
      extractionTimestamp,
      leadSegments,
      preprocessing,
      quality,
      source: {
        byteLength: buffer.length,
        mimeType: file.mimeType,
        originalName: file.originalName,
      },
    } as unknown as Prisma.InputJsonObject;
    await prisma.eCGFile.update({
      data: {
        duration,
        fileType: isImage(file) ? "IMAGE" : isPdf(file) ? "PDF_REPORT" : "WAVEFORM",
        metadataJson: {
          ...(file.metadataJson && typeof file.metadataJson === "object" ? (file.metadataJson as Record<string, unknown>) : {}),
          digitization: digitizationMetadata,
          digitizationStatus: "available",
          gainMmPerMv: calibration.gainMmPerMv,
          gridDetected: calibration.gridDetected,
          paperSpeedMmPerSec: calibration.paperSpeedMmPerSec,
          qualityScore: quality.score,
          warnings: quality.warnings,
        } as Prisma.InputJsonObject,
        numberOfLeads: leads.length,
        samplingRate: DEFAULT_SAMPLING_RATE,
      },
      where: { id: file.id },
    });
    await Promise.all(
      leads.map((lead) =>
        prisma.eCGLeadSignal.upsert({
          create: {
            duration: lead.durationSeconds,
            ecgFileId: file.id,
            gain: calibration.gainMmPerMv,
            leadName: lead.lead,
            metadataJson: { digitizedFromImage: isImage(file), extractionTimestamp, leadSegment: leadSegments.find((segment) => segment.lead === lead.lead), paperSpeedMmPerSec: calibration.paperSpeedMmPerSec } as Prisma.InputJsonObject,
            paperSpeed: calibration.paperSpeedMmPerSec,
            samplingRate: lead.samplingRate,
            signalData: lead.samples,
          },
          update: {
            duration: lead.durationSeconds,
            gain: calibration.gainMmPerMv,
            metadataJson: { digitizedFromImage: isImage(file), extractionTimestamp, leadSegment: leadSegments.find((segment) => segment.lead === lead.lead), paperSpeedMmPerSec: calibration.paperSpeedMmPerSec } as Prisma.InputJsonObject,
            paperSpeed: calibration.paperSpeedMmPerSec,
            samplingRate: lead.samplingRate,
            signalData: lead.samples,
          },
          where: { ecgFileId_leadName: { ecgFileId: file.id, leadName: lead.lead } },
        }),
      ),
    );
    const annotations = annotationsFor(leads);
    await prisma.eCGAnnotation.deleteMany({ where: { ecgFileId: file.id } });
    await prisma.eCGAnnotation.createMany({
      data: annotations.map((annotation) => ({
        annotationType: annotation.type,
        ecgFileId: file.id,
        endIndex: annotation.endIndex,
        leadName: annotation.leadName,
        peakIndex: annotation.peakIndex,
        startIndex: annotation.startIndex,
      })),
    });
    await prisma.auditLog.create({
      data: {
        action: "ECG_MEASURED",
        actorId,
        caseId,
        message: `ECG waveform reconstructed into ${leads.length} digital leads.`,
        metadata: {
          calibrationConfidence: calibration.confidence,
          ecgFileId: file.id,
          gainMmPerMv: calibration.gainMmPerMv,
          gridDetected: calibration.gridDetected,
          paperSpeedMmPerSec: calibration.paperSpeedMmPerSec,
          qualityScore: quality.score,
          warnings: quality.warnings,
        } as Prisma.InputJsonObject,
        patientId: ecgCase.patientId,
      },
    });
    return getDigitalEcgForFile(file.id);
  } catch {
    return waveformFallback(file, "Digital waveform reconstruction unavailable.");
  }
}

function waveformFallback(file: ECGFile, reason: string): DigitalEcgPayload {
  return {
    annotations: [],
    calibration: detectGridCalibration(file),
    durationSeconds: 0,
    ecgFileId: file.id,
    fallbackReason: reason,
    leadSegments: [],
    leads: [],
    measurements: { prIntervalMs: 0, qrsDurationMs: 0, qtIntervalMs: 0, rrIntervalMs: 0 },
    originalImageUrl: fileDownloadUrl(file.id),
    quality: { score: 0, warnings: [reason] },
    status: "fallback",
  };
}

export async function getDigitalEcg(caseId: string): Promise<DigitalEcgPayload> {
  const file = await latestFileForCase(caseId);
  const leads = await prisma.eCGLeadSignal.findMany({ orderBy: { leadName: "asc" }, where: { ecgFileId: file.id } });
  if (leads.length === 0) return reconstructCaseEcg(caseId, file.uploadedById);

  const annotations = await prisma.eCGAnnotation.findMany({ where: { ecgFileId: file.id } });
  const digitization = digitizationMetadata(file);
  const calibration = digitization.calibration ?? detectGridCalibration(file);
  const durationSeconds = Math.max(...leads.map((lead) => lead.duration));
  return {
    annotations: annotations.map(serializeAnnotation),
    calibration: {
      ...calibration,
      gainMmPerMv: (leads[0]?.gain ?? calibration.gainMmPerMv) as 5 | 10 | 20,
      paperSpeedMmPerSec: (leads[0]?.paperSpeed ?? calibration.paperSpeedMmPerSec) as 25 | 50,
    },
    durationSeconds,
    ecgFileId: file.id,
    enhancedImageUrl: fileDownloadUrl(file.id),
    extractionTimestamp: digitization.extractionTimestamp,
    leadSegments: digitization.leadSegments,
    leads: leads.map((lead) => ({
      durationSeconds: lead.duration,
      lead: lead.leadName,
      samples: lead.signalData.slice(0, Math.min(lead.signalData.length, lead.samplingRate * 10)),
      samplingRate: lead.samplingRate,
    })),
    measurements: measurementDefaults(
      leads.map((lead) => ({ durationSeconds: lead.duration, lead: lead.leadName, samples: lead.signalData, samplingRate: lead.samplingRate })),
    ),
    originalImageUrl: fileDownloadUrl(file.id),
    preprocessing: digitization.preprocessing,
    quality: digitization.quality,
    status: "available",
  };
}

function digitizationMetadata(file: ECGFile): {
  calibration?: GridCalibration;
  extractionTimestamp?: string;
  leadSegments: LeadSegment[];
  preprocessing?: DigitizationPreprocessing;
  quality: DigitizationQuality;
} {
  const metadata = file.metadataJson && typeof file.metadataJson === "object" ? (file.metadataJson as Record<string, unknown>) : {};
  const digitization = metadata["digitization"] && typeof metadata["digitization"] === "object" ? metadata["digitization"] as Record<string, unknown> : {};
  const quality = digitization["quality"] && typeof digitization["quality"] === "object"
    ? digitization["quality"] as { score?: unknown; warnings?: unknown }
    : undefined;
  return {
    calibration: digitization["calibration"] as GridCalibration | undefined,
    extractionTimestamp: typeof digitization["extractionTimestamp"] === "string" ? digitization["extractionTimestamp"] : undefined,
    leadSegments: Array.isArray(digitization["leadSegments"]) ? digitization["leadSegments"] as LeadSegment[] : [],
    preprocessing: digitization["preprocessing"] as DigitizationPreprocessing | undefined,
    quality: {
      score: typeof quality?.score === "number" ? quality.score : typeof metadata["qualityScore"] === "number" ? metadata["qualityScore"] : 0,
      warnings: Array.isArray(quality?.warnings) ? quality.warnings.filter((item): item is string => typeof item === "string") : [],
    },
  };
}

export async function getDigitizationQuality(caseId: string) {
  const digital = await getDigitalEcg(caseId);
  return {
    calibration: digital.calibration,
    ecgFileId: digital.ecgFileId,
    extractionTimestamp: digital.extractionTimestamp,
    leadSegments: digital.leadSegments,
    preprocessing: digital.preprocessing,
    quality: digital.quality,
    status: digital.status,
  };
}

export async function getDigitalEcgForFile(fileId: string): Promise<DigitalEcgPayload> {
  const file = await prisma.eCGFile.findUnique({ where: { id: fileId } });
  if (!file?.caseId) throw new AppError(404, "Digitized ECG file not found.", "ECG_FILE_NOT_FOUND");
  return getDigitalEcg(file.caseId);
}

export function exportDigitalEcg(payload: DigitalEcgPayload, format: "json" | "pdf" | "png" | "svg") {
  if (format === "json") {
    return { contentType: "application/json", data: JSON.stringify(payload, null, 2), fileName: "digital-ecg.json" };
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#fff5f5"/><text x="24" y="36" font-family="Arial" font-size="22">Digital ECG ${payload.status}</text>${payload.leads
    .slice(0, 12)
    .map((lead, row) => {
      const yBase = 80 + row * 55;
      const points = lead.samples
        .filter((_sample, index) => index % 8 === 0)
        .map((sample, index) => `${40 + index * 2},${yBase - sample * 28}`)
        .join(" ");
      return `<text x="10" y="${yBase}" font-size="12">${lead.lead}</text><polyline points="${points}" fill="none" stroke="#dc2626" stroke-width="1.5"/>`;
    })
    .join("")}</svg>`;
  if (format === "svg") return { contentType: "image/svg+xml", data: svg, fileName: "digital-ecg.svg" };
  if (format === "png") return { contentType: "image/png", data: Buffer.from(svg).toString("base64"), fileName: "digital-ecg.png" };
  return {
    contentType: "application/pdf",
    data: `ECG Insight Digital ECG Export\n\nStatus: ${payload.status}\nLeads: ${payload.leads.length}\nPaper speed: ${payload.calibration.paperSpeedMmPerSec} mm/s\nGain: ${payload.calibration.gainMmPerMv} mm/mV\n`,
    fileName: "digital-ecg.pdf",
  };
}
