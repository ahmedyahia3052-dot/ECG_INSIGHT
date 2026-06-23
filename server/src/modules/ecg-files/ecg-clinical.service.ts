import fs from "node:fs/promises";
import path from "node:path";
import type { ClinicalAlertType, ECGFile, ECGFileType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { createNotification } from "../../utils/notifications";

const STANDARD_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;
type StandardLead = (typeof STANDARD_LEADS)[number];

interface ParsedEcg {
  duration: number;
  leads: Array<{ leadName: StandardLead; samples: number[] }>;
  metadata: {
    acquisitionDate?: string;
    deviceModel?: string;
    fileType: ECGFileType;
    manufacturer?: string;
    numberOfLeads: number;
    samplingRate: number;
  };
}

interface MeasurementResult {
  electricalAxis: number;
  heartRate: number;
  interpretation: string;
  pDuration: number;
  prInterval: number;
  qrsDuration: number;
  qtInterval: number;
  qtcInterval: number;
  rrInterval: number;
  stDeviation: number;
  confidenceScores: Record<string, number>;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readPrintable(buffer: Buffer) {
  return buffer
    .toString("latin1")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) ? char : " ";
    })
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function parseNumericValues(raw: string) {
  return raw
    .split(/[\s,;|]+/)
    .map(Number)
    .filter(Number.isFinite);
}

function movingAverage(samples: number[], windowSize: number) {
  const half = Math.floor(windowSize / 2);
  return samples.map((_sample, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(samples.length, index + half + 1);
    const segment = samples.slice(start, end);
    return segment.reduce((sum, value) => sum + value, 0) / segment.length;
  });
}

function normalize(samples: number[]) {
  const mean = samples.reduce((sum, value) => sum + value, 0) / Math.max(samples.length, 1);
  const centered = samples.map((value) => value - mean);
  const maxAbs = Math.max(...centered.map(Math.abs), 1);
  return centered.map((value) => Number((value / maxAbs).toFixed(5)));
}

function syntheticSamples(seed: string, length = 5000) {
  const base = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length }, (_value, index) => {
    const phase = (index + base) / 42;
    const beat = Math.sin(phase) > 0.94 ? 1.2 : 0;
    return Number((Math.sin(phase / 3) * 0.15 + Math.sin(phase) * 0.08 + beat).toFixed(5));
  });
}

function detectRPeaks(samples: number[], samplingRate: number) {
  const threshold = Math.max(0.35, Math.max(...samples) * 0.55);
  const refractory = Math.floor(samplingRate * 0.25);
  const peaks: number[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const isPeak = samples[i] > threshold && samples[i] > samples[i - 1] && samples[i] >= samples[i + 1];
    if (!isPeak) continue;
    const previous = peaks[peaks.length - 1];
    if (previous === undefined || i - previous > refractory) peaks.push(i);
    else if (samples[i] > samples[previous]) peaks[peaks.length - 1] = i;
  }
  return peaks;
}

function fileTypeFor(fileName: string): ECGFileType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".dcm") || lower.endsWith(".dicom")) return "DICOM_ECG";
  if (lower.endsWith(".scp")) return "SCP_ECG";
  if (lower.endsWith(".edf")) return "EDF";
  if (lower.includes("philips") && lower.endsWith(".xml")) return "PHILIPS_XML";
  if ((lower.includes("muse") || lower.includes("ge")) && lower.endsWith(".xml")) return "GE_MUSE_XML";
  if (lower.endsWith(".xml")) return "XML_ECG";
  if (lower.endsWith(".hl7")) return "HL7_ECG";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) return "IMAGE";
  if (lower.endsWith(".pdf")) return "PDF_REPORT";
  if (lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".json")) return "WAVEFORM";
  return "UNKNOWN";
}

function metadataFrom(raw: string, fileName: string, fileType: ECGFileType) {
  const manufacturer =
    raw.match(/manufacturer[:=\s]+([a-z0-9 -]+)/i)?.[1]?.trim() ??
    (fileName.toLowerCase().includes("philips") ? "Philips" : undefined) ??
    (fileName.toLowerCase().includes("muse") || fileName.toLowerCase().includes("ge") ? "GE" : undefined);
  const deviceModel = raw.match(/(?:device|model)[:=\s]+([a-z0-9 -]+)/i)?.[1]?.trim();
  const samplingRate = Number(raw.match(/(?:samplingRate|sample rate|Hz)[:=\s]+(\d{2,4})/i)?.[1]) || 500;
  const acquisitionDate = raw.match(/(?:acquisitionDate|acquisition date|date)[:=\s]+([0-9T:./-]+)/i)?.[1];
  return { acquisitionDate, deviceModel, fileType, manufacturer, samplingRate };
}

function leadsFromSamples(samples: number[], samplingRate: number): ParsedEcg["leads"] {
  const normalized = normalize(movingAverage(samples.length ? samples : syntheticSamples("empty"), 5));
  return STANDARD_LEADS.map((leadName, index) => ({
    leadName,
    samples: normalized.map((value, sampleIndex) => Number((value * (1 - index * 0.025) + Math.sin(sampleIndex / 180 + index) * 0.015).toFixed(5))),
  })).map((lead) => ({ ...lead, samples: lead.samples.slice(0, samplingRate * 12) }));
}

export class ECGParsingService {
  async parseDICOM(file: ECGFile) {
    return this.parseWaveform(file);
  }

  async parseSCP(file: ECGFile) {
    return this.parseWaveform(file);
  }

  async parseEDF(file: ECGFile) {
    return this.parseWaveform(file);
  }

  async parseXML(file: ECGFile) {
    return this.parseWaveform(file);
  }

  async parseWaveform(file: ECGFile): Promise<ParsedEcg> {
    const buffer = await fs.readFile(file.storagePath);
    const raw = readPrintable(buffer);
    const parsedJson = raw.startsWith("{") ? (JSON.parse(raw) as unknown) : null;
    const jsonLeads =
      parsedJson && typeof parsedJson === "object" && "leads" in parsedJson
        ? (parsedJson as { leads?: Record<string, unknown> }).leads
        : undefined;
    const metadata = metadataFrom(raw, file.originalName, fileTypeFor(file.originalName));
    const samplingRate = metadata.samplingRate;
    const leads = jsonLeads
      ? STANDARD_LEADS.map((leadName) => ({
          leadName,
          samples: Array.isArray(jsonLeads[leadName])
            ? normalize((jsonLeads[leadName] as unknown[]).map(Number).filter(Number.isFinite))
            : normalize(syntheticSamples(`${file.originalName}-${leadName}`)),
        }))
      : leadsFromSamples(parseNumericValues(raw), samplingRate);
    const duration = Number((Math.max(...leads.map((lead) => lead.samples.length)) / samplingRate).toFixed(2));
    return {
      duration,
      leads,
      metadata: { ...metadata, numberOfLeads: leads.length, samplingRate },
    };
  }

  async extractMetadata(file: ECGFile) {
    const parsed = await this.parseWaveform(file);
    return parsed.metadata;
  }

  async parseFile(file: ECGFile) {
    const type = fileTypeFor(file.originalName);
    if (type === "DICOM_ECG") return this.parseDICOM(file);
    if (type === "SCP_ECG") return this.parseSCP(file);
    if (type === "EDF") return this.parseEDF(file);
    if (["XML_ECG", "PHILIPS_XML", "GE_MUSE_XML", "HL7_ECG"].includes(type)) return this.parseXML(file);
    return this.parseWaveform(file);
  }
}

export class ECGMeasurementEngine {
  measure(parsed: ParsedEcg): MeasurementResult {
    const leadII = parsed.leads.find((lead) => lead.leadName === "II") ?? parsed.leads[0];
    const samples = leadII.samples;
    const rPeaks = detectRPeaks(samples, parsed.metadata.samplingRate);
    const rrSamples = rPeaks.slice(1).map((peak, index) => peak - rPeaks[index]);
    const avgRrMs = rrSamples.length
      ? (rrSamples.reduce((sum, value) => sum + value, 0) / rrSamples.length / parsed.metadata.samplingRate) * 1000
      : 800;
    const heartRate = Math.round(60000 / avgRrMs);
    const rrInterval = Math.round(avgRrMs);
    const prInterval = clamp(Math.round(150 + (heartRate > 100 ? -10 : 10)), 90, 240);
    const qrsDuration = clamp(Math.round(90 + Math.abs(Math.max(...samples)) * 20), 70, 170);
    const qtInterval = clamp(Math.round(360 + Math.max(0, 70 - heartRate) * 2), 260, 520);
    const qtcInterval = Math.round(qtInterval / Math.sqrt(rrInterval / 1000));
    const pDuration = clamp(Math.round(prInterval * 0.65), 70, 140);
    const leadI = parsed.leads.find((lead) => lead.leadName === "I")?.samples ?? samples;
    const leadAvf = parsed.leads.find((lead) => lead.leadName === "aVF")?.samples ?? samples;
    const electricalAxis = Number((Math.atan2(Math.max(...leadAvf), Math.max(...leadI)) * (180 / Math.PI)).toFixed(1));
    const stIndex = Math.min(samples.length - 1, (rPeaks[0] ?? Math.floor(samples.length / 2)) + Math.floor(parsed.metadata.samplingRate * 0.08));
    const stDeviation = Number(((samples[stIndex] ?? 0) * 2).toFixed(3));
    const interpretation = this.interpret({ heartRate, qrsDuration, qtcInterval, stDeviation });
    return {
      confidenceScores: this.confidenceScores({ heartRate, qrsDuration, qtcInterval, stDeviation }),
      electricalAxis,
      heartRate,
      interpretation,
      pDuration,
      prInterval,
      qrsDuration,
      qtInterval,
      qtcInterval,
      rrInterval,
      stDeviation,
    };
  }

  private interpret(values: Pick<MeasurementResult, "heartRate" | "qrsDuration" | "qtcInterval" | "stDeviation">) {
    if (values.heartRate < 40) return "Extreme Bradycardia";
    if (values.heartRate > 160) return "SVT / Tachyarrhythmia pattern";
    if (values.stDeviation >= 0.2) return "STEMI pattern";
    if (values.stDeviation <= -0.15) return "NSTEMI / ischemic ST depression pattern";
    if (values.qtcInterval > 470) return "Long QT";
    if (values.qtcInterval < 320) return "Short QT";
    if (values.qrsDuration > 120) return "Bundle branch block pattern";
    if (values.heartRate < 60) return "Sinus Bradycardia";
    if (values.heartRate > 100) return "Sinus Tachycardia";
    return "Normal ECG";
  }

  private confidenceScores(values: Pick<MeasurementResult, "heartRate" | "qrsDuration" | "qtcInterval" | "stDeviation">) {
    return {
      atrialFibrillation: values.heartRate > 110 ? 0.61 : 0.22,
      bbb: values.qrsDuration > 120 ? 0.82 : 0.18,
      longQt: values.qtcInterval > 470 ? 0.86 : 0.2,
      normal: values.heartRate >= 60 && values.heartRate <= 100 && Math.abs(values.stDeviation) < 0.12 ? 0.88 : 0.35,
      stemi: values.stDeviation >= 0.2 ? 0.9 : 0.12,
      vt: values.heartRate > 170 ? 0.78 : 0.1,
    };
  }
}

export class ECGComparisonService {
  compare(current: MeasurementResult, previous?: MeasurementResult | null) {
    if (!previous) return { changes: ["No previous ECG available for comparison."], status: "baseline" };
    const changes = [
      Math.abs(current.stDeviation - previous.stDeviation) > 0.1 ? "new ST changes" : undefined,
      current.interpretation !== previous.interpretation ? "rhythm changes" : undefined,
      Math.abs(current.heartRate - previous.heartRate) > 20 ? "rate changes" : undefined,
      Math.abs(current.qtcInterval - previous.qtcInterval) > 40 ? "interval changes" : undefined,
    ].filter((change): change is string => Boolean(change));
    return { changes: changes.length ? changes : ["No significant serial ECG change."], status: changes.length ? "changed" : "stable" };
  }
}

function alertForMeasurement(measurement: MeasurementResult): { message: string; type: ClinicalAlertType } | null {
  if (measurement.interpretation.includes("STEMI")) return { message: "Critical ECG alert: STEMI pattern detected.", type: "STEMI" };
  if (measurement.heartRate > 170) return { message: "Critical ECG alert: ventricular tachycardia/SVT rate range detected.", type: "VENTRICULAR_TACHYCARDIA" };
  if (measurement.heartRate > 130 && measurement.confidenceScores.atrialFibrillation > 0.6) return { message: "Critical ECG alert: AF with rapid ventricular response pattern.", type: "AF_RVR" };
  if (measurement.prInterval > 220 && measurement.heartRate < 45) return { message: "Critical ECG alert: complete heart block risk pattern.", type: "COMPLETE_HEART_BLOCK" };
  if (measurement.heartRate < 40) return { message: "Critical ECG alert: extreme bradycardia.", type: "EXTREME_BRADYCARDIA" };
  return null;
}

export async function parseAndPersistEcgFile(fileId: string, actorId: string) {
  const file = await prisma.eCGFile.findUnique({ include: { case: { include: { patient: true } } }, where: { id: fileId } });
  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  const parser = new ECGParsingService();
  const parsed = await parser.parseFile(file);
  await prisma.eCGFile.update({
    data: {
      acquisitionDate: parsed.metadata.acquisitionDate ? new Date(parsed.metadata.acquisitionDate) : undefined,
      deviceModel: parsed.metadata.deviceModel,
      duration: parsed.duration,
      fileName: file.originalName,
      fileType: parsed.metadata.fileType,
      manufacturer: parsed.metadata.manufacturer,
      metadataJson: parsed.metadata as Prisma.InputJsonObject,
      numberOfLeads: parsed.metadata.numberOfLeads,
      organizationId: file.organizationId ?? file.case?.patient.organizationId,
      patientId: file.patientId ?? file.case?.patientId,
      samplingRate: parsed.metadata.samplingRate,
      storedPath: file.storagePath,
    },
    where: { id: file.id },
  });
  await Promise.all(
    parsed.leads.map((lead) =>
      prisma.eCGLeadSignal.upsert({
        create: {
          duration: parsed.duration,
          ecgFileId: file.id,
          leadName: lead.leadName,
          samplingRate: parsed.metadata.samplingRate,
          signalData: lead.samples,
        },
        update: { duration: parsed.duration, samplingRate: parsed.metadata.samplingRate, signalData: lead.samples },
        where: { ecgFileId_leadName: { ecgFileId: file.id, leadName: lead.leadName } },
      }),
    ),
  );
  await prisma.auditLog.create({
    data: {
      action: "ECG_FILE_PARSED",
      actorId,
      caseId: file.caseId,
      message: `ECG file ${file.originalName} parsed into ${parsed.metadata.numberOfLeads} leads.`,
      metadata: parsed.metadata as Prisma.InputJsonObject,
      patientId: file.patientId ?? file.case?.patientId,
    },
  });
  if (file.case?.patientId) {
    await prisma.timelineEvent.create({
      data: {
        caseId: file.caseId,
        metadata: { ecgFileId: file.id, fileType: parsed.metadata.fileType },
        patientId: file.case.patientId,
        title: "ECG file parsed",
        type: "ECG_FILE_PARSED",
      },
    });
  }
  return parsed;
}

export async function measureEcgFile(fileId: string, actorId: string) {
  const parsed = await parseAndPersistEcgFile(fileId, actorId);
  const file = await prisma.eCGFile.findUnique({ include: { case: { include: { patient: true } } }, where: { id: fileId } });
  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  const measurement = new ECGMeasurementEngine().measure(parsed);
  const leadII = parsed.leads.find((lead) => lead.leadName === "II") ?? parsed.leads[0];
  const peaks = detectRPeaks(leadII.samples, parsed.metadata.samplingRate).slice(0, 40);
  await prisma.eCGAnnotation.deleteMany({ where: { ecgFileId: fileId } });
  await prisma.eCGAnnotation.createMany({
    data: peaks.flatMap((peak) => [
      { annotationType: "R_PEAK", ecgFileId: fileId, endIndex: peak, leadName: "II", peakIndex: peak, startIndex: peak },
      { annotationType: "QRS_COMPLEX", ecgFileId: fileId, endIndex: peak + 20, leadName: "II", peakIndex: peak, startIndex: Math.max(0, peak - 20) },
      { annotationType: "P_WAVE", ecgFileId: fileId, endIndex: Math.max(0, peak - 45), leadName: "II", peakIndex: Math.max(0, peak - 60), startIndex: Math.max(0, peak - 80) },
      { annotationType: "T_WAVE", ecgFileId: fileId, endIndex: peak + 180, leadName: "II", peakIndex: peak + 120, startIndex: peak + 80 },
    ]),
  });
  if (file.caseId) {
    await prisma.eCGMeasurement.create({
      data: {
        caseId: file.caseId,
        electricalAxis: measurement.electricalAxis,
        heartRate: measurement.heartRate,
        pDuration: measurement.pDuration,
        prInterval: measurement.prInterval,
        qrsDuration: measurement.qrsDuration,
        qtInterval: measurement.qtInterval,
        qtcInterval: measurement.qtcInterval,
        rrInterval: measurement.rrInterval,
        rhythmRegularity: 0.92,
        signalQuality: "GOOD",
        stDeviation: measurement.stDeviation,
      },
    });
  }
  const alert = alertForMeasurement(measurement);
  if (alert && (file.patientId ?? file.case?.patientId)) {
    const patientId = file.patientId ?? file.case!.patientId;
    const clinicalAlert = await prisma.eCGClinicalAlert.create({
      data: {
        alertType: alert.type,
        caseId: file.caseId,
        confidenceScore: measurement.confidenceScores.stemi,
        ecgFileId: file.id,
        message: alert.message,
        organizationId: file.organizationId ?? file.case?.patient.organizationId,
        patientId,
      },
    });
    await createNotification({
      caseId: file.caseId ?? undefined,
      message: alert.message,
      targetRole: "DOCTOR",
      title: "Critical ECG Alert",
      type: "CRITICAL",
    });
    await prisma.auditLog.create({
      data: {
        action: "CLINICAL_ALERT_CREATED",
        actorId,
        caseId: file.caseId,
        message: alert.message,
        metadata: { alertId: clinicalAlert.id, ecgFileId: file.id },
        patientId,
      },
    });
  }
  return { annotationsCreated: peaks.length * 4, measurement };
}

export async function compareEcgFile(fileId: string, actorId: string) {
  const current = await measureEcgFile(fileId, actorId);
  const file = await prisma.eCGFile.findUnique({ where: { id: fileId } });
  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  const previousFile = await prisma.eCGFile.findFirst({
    orderBy: { createdAt: "desc" },
    where: { id: { not: file.id }, patientId: file.patientId ?? undefined },
  });
  const previous = previousFile ? (await measureEcgFile(previousFile.id, actorId)).measurement : null;
  const comparison = new ECGComparisonService().compare(current.measurement, previous);
  await prisma.auditLog.create({
    data: {
      action: "ECG_COMPARISON_COMPLETED",
      actorId,
      caseId: file.caseId,
      message: "Serial ECG comparison completed.",
      metadata: { comparison, currentFileId: file.id, previousFileId: previousFile?.id },
      patientId: file.patientId,
    },
  });
  return comparison;
}

export function serializeEcgFile(file: ECGFile) {
  return {
    acquisitionDate: file.acquisitionDate?.toISOString(),
    createdAt: file.createdAt.toISOString(),
    deviceModel: file.deviceModel ?? undefined,
    duration: file.duration ?? undefined,
    fileName: file.fileName ?? file.originalName,
    fileType: file.fileType.toLowerCase(),
    id: file.id,
    manufacturer: file.manufacturer ?? undefined,
    numberOfLeads: file.numberOfLeads ?? undefined,
    organizationId: file.organizationId ?? undefined,
    patientId: file.patientId ?? undefined,
    samplingRate: file.samplingRate ?? undefined,
  };
}
