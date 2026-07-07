import type { ECGAnnotationType, ECGFile, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { detectGridCalibrationFromFile } from "../ecg-digitization/grid-detector";
import {
  exportDigitizedSignalsBinary,
  exportDigitizedSignalsCsv,
  exportDigitizedSignalsJson,
} from "../ecg-digitization/export/formats";
import { buildDigitalSignalObjects } from "../ecg-digitization/signal-engine";
import { runDigitizationPipeline } from "../ecg-digitization/digitizer";
import {
  cancelDigitizationJob,
  createDigitizationJob,
  getDigitizationJob,
  runDigitizationJob,
} from "../ecg-digitization/jobs/digitization-job-queue";
import { DIGITIZATION_PIPELINE_VERSION } from "../ecg-digitization/types";
import type { EcgMetadataOcr, SignalValidationMetrics } from "../ecg-digitization/types";
import { isPdfEcgFile, isRasterEcgFile } from "../ecg-digitization/image-processing";
import {
  aiDiagnosisFromMetadata,
  aiDiagnosisJson,
  diagnoseFromClinicalBundle,
  persistAiDiagnosis,
  type EcgAiDiagnosisResult,
} from "../ecg-ai-diagnosis";
import {
  interpretMeasurementBundle,
  interpretationEngineJson,
  interpretationFromMetadata,
  persistCaseInterpretation,
  type EcgClinicalInterpretation,
} from "../ecg-interpretation";
import {
  measureFromLeads,
  measurementEngineJson,
  measurementFromMetadata,
  persistCaseMeasurement,
  type EcgClinicalMeasurementResult,
} from "../ecg-measurement";

export type {
  DigitizationPreprocessing,
  DigitizationQuality,
  DigitizedLead,
  GridCalibration,
  LeadSegment,
} from "../ecg-digitization/types";

import {
  DigitizationPreprocessing,
  DigitizationQuality,
  DigitizedLead,
  GridCalibration,
  LeadSegment,
  STANDARD_LEADS,
} from "../ecg-digitization/types";

const DEFAULT_SAMPLING_RATE = 500;

export type { EcgAiDiagnosisResult } from "../ecg-ai-diagnosis";
export type { EcgClinicalInterpretation } from "../ecg-interpretation";
export type { EcgClinicalMeasurementResult } from "../ecg-measurement";

export interface DigitalEcgPayload {
  aiDiagnosis: EcgAiDiagnosisResult;
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
  gridOverlaySvg?: string;
  extractionTimestamp?: string;
  leadSegments: LeadSegment[];
  leads: DigitizedLead[];
  interpretationEngine: EcgClinicalInterpretation;
  measurementEngine: EcgClinicalMeasurementResult;
  measurements: {
    heartRate: number;
    prIntervalMs: number;
    qrsDurationMs: number;
    qtIntervalMs: number;
    qtcBazettMs: number;
    rrIntervalMs: number;
  };
  originalImageUrl?: string;
  preprocessing?: DigitizationPreprocessing;
  quality: DigitizationQuality;
  ocrMetadata?: EcgMetadataOcr;
  status: "available" | "fallback";
  validation?: SignalValidationMetrics;
}

function isImage(file: ECGFile) {
  return isRasterEcgFile(file.originalName, file.mimeType);
}

function isPdf(file: ECGFile) {
  return isPdfEcgFile(file.originalName, file.mimeType);
}

function isDigitizableSource(file: ECGFile) {
  return isImage(file) || isPdf(file) || file.fileType === "WAVEFORM";
}

function seedFor(file: ECGFile) {
  return [...`${file.id}-${file.originalName}-${file.sizeBytes}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
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

export function detectGridCalibration(file: Pick<ECGFile, "metadataJson" | "originalName" | "sizeBytes">): GridCalibration {
  return detectGridCalibrationFromFile(file, {
    blurScore: 12,
    brightness: 0.5,
    contrast: 0.4,
    darkRatio: 0.1,
    edgeDensity: 0.05,
    entropy: 0.4,
    height: 1,
    noise: 0.05,
    width: 1,
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

function flatMeasurements(clinical: EcgClinicalMeasurementResult) {
  return {
    heartRate: clinical.heartRate,
    prIntervalMs: clinical.intervals.prIntervalMs,
    qrsDurationMs: clinical.intervals.qrsDurationMs,
    qtIntervalMs: clinical.intervals.qtIntervalMs,
    qtcBazettMs: clinical.intervals.qtcBazettMs,
    rrIntervalMs: clinical.intervals.rrIntervalMs,
  };
}

function buildDigitalPayload(input: {
  aiDiagnosis: EcgAiDiagnosisResult;
  annotations: DigitalEcgPayload["annotations"];
  calibration: GridCalibration;
  durationSeconds: number;
  ecgFileId: string;
  enhancedImageUrl?: string;
  extractionTimestamp?: string;
  gridOverlaySvg?: string;
  interpretationEngine: EcgClinicalInterpretation;
  leadSegments: LeadSegment[];
  leads: DigitizedLead[];
  measurementEngine: EcgClinicalMeasurementResult;
  ocrMetadata?: EcgMetadataOcr;
  originalImageUrl?: string;
  preprocessing?: DigitizationPreprocessing;
  quality: DigitizationQuality;
  validation?: SignalValidationMetrics;
}): DigitalEcgPayload {
  return {
    ...input,
    measurements: flatMeasurements(input.measurementEngine),
    status: "available",
  };
}

function fileDownloadUrl(fileId: string) {
  return `/api/ecg/files/${fileId}/download`;
}

function processedImageUrl(file: ECGFile) {
  const metadata = file.metadataJson && typeof file.metadataJson === "object" ? file.metadataJson as Record<string, unknown> : {};
  const digitization = metadata["digitization"] && typeof metadata["digitization"] === "object"
    ? metadata["digitization"] as Record<string, unknown>
    : {};
  const hasProcessed = Boolean(
    metadata["enhancedImagePath"]
    || digitization["enhancedImagePath"]
    || digitization["processedImagePath"],
  );
  return hasProcessed ? `/api/ecg/files/${file.id}/processed-image` : fileDownloadUrl(file.id);
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
    return await waveformFallback(file, "Digital waveform reconstruction unavailable for this ECG file format.");
  }

  let pipeline;
  try {
    pipeline = await runDigitizationPipeline(file, override);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digital waveform reconstruction unavailable.";
    return await waveformFallback(file, message);
  }

  const {
    artifacts,
    calibration,
    durationSeconds,
    enhancedImagePath,
    leadSegments,
    leads,
    ocrMetadata,
    preprocessing,
    quality,
    validation,
  } = pipeline;

  if (leads.length === 0) {
    return await waveformFallback(file, "No ECG leads could be digitized from the uploaded image.");
  }

  try {
    const extractionTimestamp = new Date().toISOString();
    const measurementEngine = measureFromLeads({ calibration, leads });
    const interpretationEngine = interpretMeasurementBundle(measurementEngine);
    const aiDiagnosis = await diagnoseFromClinicalBundle({
      imageAvailable: isImage(file) || isPdf(file),
      interpretation: interpretationEngine,
      leads,
      measurement: measurementEngine,
      qualityScore: quality.score,
    });
    const digitizationMetadata = {
      aiDiagnosis: aiDiagnosisJson(aiDiagnosis),
      artifacts,
      calibration,
      enhancedImagePath,
      extractionTimestamp,
      interpretationEngine: interpretationEngineJson(interpretationEngine),
      leadSegments,
      measurementEngine: measurementEngineJson(measurementEngine, calibration),
      ocrMetadata,
      pipelineVersion: DIGITIZATION_PIPELINE_VERSION,
      preprocessing,
      quality,
      source: {
        mimeType: file.mimeType,
        originalName: file.originalName,
        sizeBytes: file.sizeBytes,
      },
      validation,
    } as unknown as Prisma.InputJsonObject;
    await prisma.eCGFile.update({
      data: {
        duration: durationSeconds,
        fileType: isImage(file) ? "IMAGE" : isPdf(file) ? "PDF_REPORT" : "WAVEFORM",
        metadataJson: {
          ...(file.metadataJson && typeof file.metadataJson === "object" ? (file.metadataJson as Record<string, unknown>) : {}),
          digitization: digitizationMetadata,
          digitizationStatus: "available",
          enhancedImagePath,
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
            signalData: lead.samples.map((sample) => (Number.isFinite(sample) ? sample : 0)),
          },
          update: {
            duration: lead.durationSeconds,
            gain: calibration.gainMmPerMv,
            metadataJson: { digitizedFromImage: isImage(file), extractionTimestamp, leadSegment: leadSegments.find((segment) => segment.lead === lead.lead), paperSpeedMmPerSec: calibration.paperSpeedMmPerSec } as Prisma.InputJsonObject,
            paperSpeed: calibration.paperSpeedMmPerSec,
            samplingRate: lead.samplingRate,
            signalData: lead.samples.map((sample) => (Number.isFinite(sample) ? sample : 0)),
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
        message: `ECG waveform reconstructed into ${leads.length} digital leads with automated clinical measurements (HR ${measurementEngine.heartRate} bpm).`,
        metadata: {
          calibrationConfidence: calibration.confidence,
          ecgFileId: file.id,
          gainMmPerMv: calibration.gainMmPerMv,
          gridDetected: calibration.gridDetected,
          heartRate: measurementEngine.heartRate,
          measurementConfidence: measurementEngine.confidence,
          paperSpeedMmPerSec: calibration.paperSpeedMmPerSec,
          qualityScore: quality.score,
          rhythm: measurementEngine.rhythm,
          warnings: quality.warnings,
        } as Prisma.InputJsonObject,
        patientId: ecgCase.patientId,
      },
    });
    await persistCaseMeasurement(caseId, leads, calibration);
    await persistCaseInterpretation(caseId, actorId, interpretationEngine, measurementEngine);
    await persistAiDiagnosis(caseId, actorId, aiDiagnosis, measurementEngine.heartRate);
    return getDigitalEcgForFile(file.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clinical persistence failed after digitization.";
    return await waveformFallback(file, message);
  }
}

async function waveformFallback(file: ECGFile, reason: string): Promise<DigitalEcgPayload> {
  const emptyEngine = measureFromLeads({ calibration: detectGridCalibration(file), leads: [] });
  const emptyInterpretationResult = interpretMeasurementBundle(emptyEngine);
  const emptyAiDiagnosis = await diagnoseFromClinicalBundle({
    imageAvailable: false,
    interpretation: emptyInterpretationResult,
    leads: [],
    measurement: emptyEngine,
    qualityScore: 0,
  });
  return {
    aiDiagnosis: { ...emptyAiDiagnosis, confidence: 0, primaryDiagnosis: "Normal ECG" as const },
    annotations: [],
    calibration: detectGridCalibration(file),
    durationSeconds: 0,
    ecgFileId: file.id,
    fallbackReason: reason,
    interpretationEngine: { ...emptyInterpretationResult, confidence: 0, primaryDiagnosis: reason },
    leadSegments: [],
    leads: [],
    measurementEngine: { ...emptyEngine, confidence: 0, heartRate: 0 },
    measurements: flatMeasurements({ ...emptyEngine, confidence: 0, heartRate: 0 }),
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
  const mappedLeads = leads.map((lead) => ({
    durationSeconds: lead.duration,
    lead: lead.leadName,
    samples: lead.signalData.slice(0, Math.min(lead.signalData.length, lead.samplingRate * 10)),
    samplingRate: lead.samplingRate,
  }));
  const measurementEngine = digitization.measurementEngine
    ?? measureFromLeads({ calibration, leads: mappedLeads });
  const interpretationEngine = digitization.interpretationEngine
    ?? interpretMeasurementBundle(measurementEngine);
  const aiDiagnosis = digitization.aiDiagnosis
    ?? await diagnoseFromClinicalBundle({
      imageAvailable: true,
      interpretation: interpretationEngine,
      leads: mappedLeads,
      measurement: measurementEngine,
      qualityScore: digitization.quality.score,
    });
  return buildDigitalPayload({
    aiDiagnosis,
    annotations: annotations.map(serializeAnnotation),
    calibration: {
      ...calibration,
      gainMmPerMv: (leads[0]?.gain ?? calibration.gainMmPerMv) as 5 | 10 | 20,
      paperSpeedMmPerSec: (leads[0]?.paperSpeed ?? calibration.paperSpeedMmPerSec) as 25 | 50,
    },
    durationSeconds,
    ecgFileId: file.id,
    enhancedImageUrl: processedImageUrl(file),
    extractionTimestamp: digitization.extractionTimestamp,
    interpretationEngine,
    leadSegments: digitization.leadSegments,
    leads: mappedLeads,
    measurementEngine,
    ocrMetadata: digitization.ocrMetadata,
    originalImageUrl: fileDownloadUrl(file.id),
    gridOverlaySvg: digitization.gridOverlaySvg,
    preprocessing: digitization.preprocessing,
    quality: digitization.quality,
    validation: digitization.validation,
  });
}

function digitizationMetadata(file: ECGFile): {
  aiDiagnosis?: EcgAiDiagnosisResult;
  calibration?: GridCalibration;
  extractionTimestamp?: string;
  interpretationEngine?: EcgClinicalInterpretation;
  leadSegments: LeadSegment[];
  measurementEngine?: EcgClinicalMeasurementResult;
  ocrMetadata?: EcgMetadataOcr;
  gridOverlaySvg?: string;
  preprocessing?: DigitizationPreprocessing;
  quality: DigitizationQuality;
  validation?: SignalValidationMetrics;
} {
  const metadata = file.metadataJson && typeof file.metadataJson === "object" ? (file.metadataJson as Record<string, unknown>) : {};
  const digitization = metadata["digitization"] && typeof metadata["digitization"] === "object" ? metadata["digitization"] as Record<string, unknown> : {};
  const quality = digitization["quality"] && typeof digitization["quality"] === "object"
    ? digitization["quality"] as { score?: unknown; warnings?: unknown }
    : undefined;
  const artifacts = digitization["artifacts"] && typeof digitization["artifacts"] === "object"
    ? digitization["artifacts"] as Record<string, unknown>
    : {};
  return {
    aiDiagnosis: aiDiagnosisFromMetadata(digitization["aiDiagnosis"]),
    calibration: digitization["calibration"] as GridCalibration | undefined,
    extractionTimestamp: typeof digitization["extractionTimestamp"] === "string" ? digitization["extractionTimestamp"] : undefined,
    gridOverlaySvg: typeof artifacts["gridOverlaySvg"] === "string" ? artifacts["gridOverlaySvg"] : undefined,
    interpretationEngine: interpretationFromMetadata(digitization["interpretationEngine"]),
    leadSegments: Array.isArray(digitization["leadSegments"]) ? digitization["leadSegments"] as LeadSegment[] : [],
    measurementEngine: measurementFromMetadata(digitization["measurementEngine"]),
    ocrMetadata: digitization["ocrMetadata"] as EcgMetadataOcr | undefined,
    preprocessing: digitization["preprocessing"] as DigitizationPreprocessing | undefined,
    quality: {
      score: typeof quality?.score === "number" ? quality.score : typeof metadata["qualityScore"] === "number" ? metadata["qualityScore"] : 0,
      warnings: Array.isArray(quality?.warnings) ? quality.warnings.filter((item): item is string => typeof item === "string") : [],
      tier: typeof (quality as { tier?: unknown })?.tier === "string" ? (quality as { tier: "Excellent" | "Fair" | "Good" | "Poor" }).tier : undefined,
      reasons: Array.isArray((quality as { reasons?: unknown })?.reasons)
        ? ((quality as { reasons: unknown[] }).reasons.filter((item): item is string => typeof item === "string"))
        : undefined,
    },
    validation: digitization["validation"] as SignalValidationMetrics | undefined,
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

export async function getGridOverlayForCase(caseId: string) {
  const digital = await getDigitalEcg(caseId);
  return {
    gridOverlaySvg: digital.gridOverlaySvg ?? "",
    leadSegments: digital.leadSegments,
    status: digital.status,
  };
}

export function enqueueDigitizationJob(caseId: string, actorId: string, override?: Partial<GridCalibration>) {
  const job = createDigitizationJob(caseId, actorId);
  void runDigitizationJob(job.id, async ({ isCancelled, setStage }) => {
    if (isCancelled()) throw new Error("Digitization cancelled.");
    setStage("preprocess");
    const digitalEcg = await reconstructCaseEcg(caseId, actorId, override);
    if (isCancelled()) throw new Error("Digitization cancelled.");
    setStage("validate");
    return digitalEcg;
  });
  return job;
}

export function readDigitizationJob(jobId: string) {
  const job = getDigitizationJob(jobId);
  if (!job) throw new AppError(404, "Digitization job not found.", "DIGITIZATION_JOB_NOT_FOUND");
  return job;
}

export function cancelDigitizationJobById(jobId: string) {
  const job = cancelDigitizationJob(jobId);
  if (!job) throw new AppError(404, "Digitization job not found.", "DIGITIZATION_JOB_NOT_FOUND");
  return job;
}

export function exportDigitalEcg(payload: DigitalEcgPayload, format: "binary" | "csv" | "json" | "pdf" | "png" | "svg") {
  if (format === "json") {
    return { contentType: "application/json", data: exportDigitizedSignalsJson(payload), fileName: "digital-ecg.json" };
  }
  if (format === "csv") {
    return { contentType: "text/csv", data: exportDigitizedSignalsCsv(payload), fileName: "digital-ecg.csv" };
  }
  if (format === "binary") {
    const signalObjects = buildDigitalSignalObjects({
      calibration: payload.calibration,
      durationSeconds: payload.durationSeconds,
      ecgFileId: payload.ecgFileId,
      leadSegments: payload.leadSegments,
      leads: payload.leads.map((lead) => ({ lead: lead.lead, samples: lead.samples })),
    });
    return {
      contentType: "application/octet-stream",
      data: exportDigitizedSignalsBinary(signalObjects),
      fileName: "digital-ecg.bin",
    };
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
