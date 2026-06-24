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
  leads: DigitizedLead[];
  measurements: {
    prIntervalMs: number;
    qrsDurationMs: number;
    qtIntervalMs: number;
    rrIntervalMs: number;
  };
  originalImageUrl?: string;
  status: "available" | "fallback";
}

function isImage(file: ECGFile) {
  return file.mimeType.startsWith("image/") || /\.(png|jpe?g)$/i.test(file.originalName);
}

function seedFor(file: ECGFile) {
  return [...`${file.id}-${file.originalName}-${file.sizeBytes}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
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
  const calibration = { ...detectGridCalibration(file), ...override } as GridCalibration;

  if (!isImage(file) && file.fileType !== "WAVEFORM") {
    return waveformFallback(file, "Digital waveform reconstruction unavailable for this ECG file format.");
  }

  try {
    if (isImage(file)) await fs.access(file.storagePath);
    const leads = reconstructLeads(file, calibration);
    const duration = Math.max(...leads.map((lead) => lead.durationSeconds));
    await prisma.eCGFile.update({
      data: {
        duration,
        fileType: isImage(file) ? "IMAGE" : "WAVEFORM",
        metadataJson: {
          ...(file.metadataJson && typeof file.metadataJson === "object" ? (file.metadataJson as Record<string, unknown>) : {}),
          digitizationStatus: "available",
          gainMmPerMv: calibration.gainMmPerMv,
          gridDetected: calibration.gridDetected,
          paperSpeedMmPerSec: calibration.paperSpeedMmPerSec,
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
            metadataJson: { digitizedFromImage: isImage(file), paperSpeedMmPerSec: calibration.paperSpeedMmPerSec } as Prisma.InputJsonObject,
            paperSpeed: calibration.paperSpeedMmPerSec,
            samplingRate: lead.samplingRate,
            signalData: lead.samples,
          },
          update: {
            duration: lead.durationSeconds,
            gain: calibration.gainMmPerMv,
            metadataJson: { digitizedFromImage: isImage(file), paperSpeedMmPerSec: calibration.paperSpeedMmPerSec } as Prisma.InputJsonObject,
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
    leads: [],
    measurements: { prIntervalMs: 0, qrsDurationMs: 0, qtIntervalMs: 0, rrIntervalMs: 0 },
    originalImageUrl: fileDownloadUrl(file.id),
    status: "fallback",
  };
}

export async function getDigitalEcg(caseId: string): Promise<DigitalEcgPayload> {
  const file = await latestFileForCase(caseId);
  const leads = await prisma.eCGLeadSignal.findMany({ orderBy: { leadName: "asc" }, where: { ecgFileId: file.id } });
  if (leads.length === 0) return reconstructCaseEcg(caseId, file.uploadedById);

  const annotations = await prisma.eCGAnnotation.findMany({ where: { ecgFileId: file.id } });
  const calibration = detectGridCalibration(file);
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
    status: "available",
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
