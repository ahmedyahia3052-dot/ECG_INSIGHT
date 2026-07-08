import path from "node:path";
import { randomUUID } from "node:crypto";
import { runDigitizationPipeline } from "../ecg-digitization/digitizer";
import { detectGridCalibration } from "../ecg-processing/ecg-digitization.service";
import { interpretMeasurementBundle } from "../ecg-interpretation";
import { measureFromLeads } from "../ecg-measurement";
import type { ClinicalOcrStructuredData } from "../ocr/clinical-ocr.service";
import { isDicomUpload, parseDicomMetadata } from "./copilot-upload-ingest.service";
import { AttachmentContextBuilder } from "./attachment/attachment-context-builder.service";
import { extractClinicalTextCached } from "./attachment/ocr-cache.service";
import { classifyDocumentType } from "./extractors/document-classifier";
import { validateAttachmentContext } from "./validation/attachment-validator";
import { recordClinicalPipelineMetric } from "./observability/clinical-pipeline-metrics";

import type {
  PipelineStageName,
  PipelineStageRecord,
  PipelineStageStatus,
} from "./attachment/pipeline-stage.types";

export type { PipelineStageName, PipelineStageRecord, PipelineStageStatus } from "./attachment/pipeline-stage.types";

export type CopilotAttachmentPipelineResult = {
  analysisSummary: string;
  confidence: number;
  documentType: string;
  extractedText: string;
  medicalAnalysis: Record<string, unknown>;
  pipelineStages: PipelineStageRecord[];
  recommendations: string[];
  structuredOcr: ClinicalOcrStructuredData;
  warnings: string[];
};

type AttachmentKind = "camera" | "ecg" | "echo" | "file" | "image" | "labs";

const OCR_CONFIDENCE_THRESHOLD = 0.65;

function stage(
  name: PipelineStageName,
  status: PipelineStageStatus,
  message?: string,
  durationMs?: number,
): PipelineStageRecord {
  return { durationMs, message, stage: name, status };
}

function isEcgDocument(documentType: string, kind: AttachmentKind) {
  return kind === "ecg" || /ecg|ekg|rhythm|holter|stress/i.test(documentType);
}

function isDigitizableEcg(mimeType: string, originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  return mimeType.startsWith("image/") || mimeType === "application/pdf" || [".png", ".jpg", ".jpeg", ".pdf"].includes(ext);
}

async function runEcgDigitization(filePath: string, mimeType: string, originalName: string, sizeBytes: number) {
  const file = {
    id: randomUUID(),
    metadataJson: {},
    mimeType,
    originalName,
    sizeBytes,
    storagePath: filePath,
  };
  detectGridCalibration(file);
  const pipeline = await runDigitizationPipeline(file);
  if (!pipeline.leads.length) {
    throw new Error("No ECG leads could be digitized from the uploaded image.");
  }
  const measurementEngine = measureFromLeads({ calibration: pipeline.calibration, leads: pipeline.leads });
  const interpretationEngine = interpretMeasurementBundle(measurementEngine);
  return {
    interpretation: interpretationEngine,
    leads: pipeline.leads.length,
    measurement: measurementEngine,
    qualityScore: pipeline.quality.score,
  };
}

export async function processCopilotAttachment(input: {
  filePath: string;
  kind: AttachmentKind;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}): Promise<CopilotAttachmentPipelineResult> {
  const stages: PipelineStageRecord[] = [];
  const started = Date.now();

  stages.push(stage("upload", "completed", "File received"));
  stages.push(stage("validation", "completed", "Integrity and format validated"));
  stages.push(stage("storage", "completed", "Stored in temporary clinical upload area"));
  stages.push(stage("preview", input.mimeType.startsWith("image/") ? "completed" : "skipped", input.mimeType.startsWith("image/") ? "Image preview available" : "Preview not applicable"));
  stages.push(stage("metadata", "completed", `Size ${input.sizeBytes} bytes, type ${input.mimeType}`));

  const ocrStarted = Date.now();
  let ocrResult = await extractClinicalTextCached(input.filePath, input.mimeType, input.originalName);
  if (isDicomUpload(input.originalName, input.mimeType)) {
    const dicomMeta = parseDicomMetadata(input.filePath);
    ocrResult = {
      ...ocrResult,
      structured: {
        ...ocrResult.structured,
        ...dicomMeta,
        confidence: Math.max(ocrResult.confidence, 0.72),
        engine: ocrResult.engine,
        leadLabels: ocrResult.structured.leadLabels,
        measurements: { ...ocrResult.structured.measurements, ...dicomMeta.measurements },
      },
      text: [ocrResult.text, dicomMeta.patientName, dicomMeta.patientId, dicomMeta.modality].filter(Boolean).join(" "),
    };
  }
  const extractedText = ocrResult.text;
  const ocrWarnings = [...ocrResult.warnings];
  if (ocrResult.confidence < OCR_CONFIDENCE_THRESHOLD) {
    ocrWarnings.push("OCR confidence below clinical threshold — verify extracted values.");
  }
  stages.push(stage(
    "ocr",
    ocrResult.confidence >= OCR_CONFIDENCE_THRESHOLD ? "completed" : "warning",
    `OCR via ${ocrResult.engine} (${Math.round(ocrResult.confidence * 100)}% confidence)`,
    Date.now() - ocrStarted,
  ));
  recordClinicalPipelineMetric("copilot_ocr_completed", {
    confidence: Math.round(ocrResult.confidence * 100),
    durationMs: Date.now() - ocrStarted,
    engine: ocrResult.engine,
    originalName: input.originalName,
  });

  const classifyStarted = Date.now();
  const documentType = classifyDocumentType({
    kind: input.kind,
    mimeType: input.mimeType,
    originalName: input.originalName,
    text: extractedText,
  });
  stages.push(stage("classification", "completed", `Classified as ${documentType.replace(/_/g, " ")}`, Date.now() - classifyStarted));

  let ecgMeasurements: Record<string, unknown> | undefined;
  if (isEcgDocument(documentType, input.kind) && isDigitizableEcg(input.mimeType, input.originalName) && process.env["PLAYWRIGHT_E2E_FAST"] !== "1") {
    const ecgStarted = Date.now();
    try {
      stages.push(stage("ecg_digitization", "running", "Digitizing ECG waveform"));
      const ecg = await runEcgDigitization(input.filePath, input.mimeType, input.originalName, input.sizeBytes);
      ecgMeasurements = {
        heartRate: ecg.measurement.heartRate,
        interpretationSummary: ecg.interpretation.report.summary,
        leadsDigitized: ecg.leads,
        prIntervalMs: ecg.measurement.intervals.prIntervalMs,
        qrsDurationMs: ecg.measurement.intervals.qrsDurationMs,
        qualityScore: ecg.qualityScore,
        qtIntervalMs: ecg.measurement.intervals.qtIntervalMs,
        qtcBazettMs: ecg.measurement.intervals.qtcBazettMs,
        rhythm: ecg.interpretation.findings.find((item) => item.category === "rhythm")?.label ?? ecg.measurement.rhythm,
      };
      stages[stages.length - 1] = stage("ecg_digitization", "completed", `${ecg.leads} leads digitized`, Date.now() - ecgStarted);
      stages.push(stage("measurements", "completed", "Interval and rate measurements computed", Date.now() - ecgStarted));
      stages.push(stage("clinical_interpretation", "completed", ecg.interpretation.report.summary ?? "Clinical interpretation generated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "ECG digitization failed";
      stages[stages.length - 1] = stage("ecg_digitization", "failed", message);
      stages.push(stage("measurements", "skipped", "Skipped due to digitization failure"));
      stages.push(stage("clinical_interpretation", "skipped", "Skipped due to digitization failure"));
    }
  } else {
    stages.push(stage("ecg_digitization", "skipped", "Not an ECG document"));
    stages.push(stage("measurements", "skipped", "Not applicable"));
    stages.push(stage("clinical_interpretation", "skipped", "Awaiting clinician context"));
  }

  const contextStarted = Date.now();
  const normalizedContext = AttachmentContextBuilder.build({
    documentType,
    ecgMeasurements,
    extractedText,
    kind: input.kind,
    mimeType: input.mimeType,
    originalName: input.originalName,
    pipelineStages: stages,
    processingStatus: "completed",
    sizeBytes: input.sizeBytes,
    structuredOcr: ocrResult.structured,
  });
  const validation = validateAttachmentContext(normalizedContext);
  normalizedContext.warnings = Array.from(new Set([...normalizedContext.warnings, ...validation.flags]));
  stages.push(stage(
    "context_builder",
    validation.valid ? "completed" : "warning",
    validation.requiresPhysicianReview ? "Normalized context built — physician review recommended" : "Normalized clinical context built",
    Date.now() - contextStarted,
  ));
  stages.push(stage("completed", "completed", "Pipeline finished", Date.now() - started));

  return {
    analysisSummary: normalizedContext.summary,
    confidence: normalizedContext.confidence,
    documentType,
    extractedText,
    medicalAnalysis: {
      ecgMeasurements: ecgMeasurements ?? null,
      normalizedContext,
      validation,
    },
    pipelineStages: stages,
    recommendations: normalizedContext.recommendations,
    structuredOcr: ocrResult.structured,
    warnings: Array.from(new Set([...normalizedContext.warnings, ...ocrWarnings])),
  };
}
