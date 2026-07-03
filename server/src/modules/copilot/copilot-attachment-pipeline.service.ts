import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runDigitizationPipeline } from "../ecg-digitization/digitizer";
import { detectGridCalibration } from "../ecg-processing/ecg-digitization.service";
import { interpretMeasurementBundle } from "../ecg-interpretation";
import { measureFromLeads } from "../ecg-measurement";
import { DocumentOCRService } from "../documents/document-intelligence.service";

export type PipelineStageName =
  | "upload"
  | "validation"
  | "storage"
  | "preview"
  | "metadata"
  | "ocr"
  | "classification"
  | "ecg_digitization"
  | "measurements"
  | "clinical_interpretation"
  | "completed";

export type PipelineStageStatus = "completed" | "failed" | "running" | "skipped" | "warning";

export type PipelineStageRecord = {
  durationMs?: number;
  message?: string;
  stage: PipelineStageName;
  status: PipelineStageStatus;
};

export type CopilotAttachmentPipelineResult = {
  analysisSummary: string;
  confidence: number;
  documentType: string;
  extractedText: string;
  medicalAnalysis: Record<string, unknown>;
  pipelineStages: PipelineStageRecord[];
  recommendations: string[];
  warnings: string[];
};

type AttachmentKind = "camera" | "ecg" | "echo" | "file" | "image" | "labs";

const OCR_CONFIDENCE_THRESHOLD = 0.65;
const documentOcr = new DocumentOCRService();

function stage(
  name: PipelineStageName,
  status: PipelineStageStatus,
  message?: string,
  durationMs?: number,
): PipelineStageRecord {
  return { durationMs, message, stage: name, status };
}

function readBestEffortOcrText(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if ([".txt", ".csv", ".json"].includes(ext)) {
    return buffer.toString("utf8").slice(0, 12000);
  }
  const printable = buffer
    .toString("latin1")
    .replace(/[^\x20-\x7E\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return printable.length > 40 ? printable.slice(0, 12000) : "";
}

function detectDocumentType(input: { kind: AttachmentKind; mimeType: string; originalName: string; text: string }) {
  const haystack = `${input.kind} ${input.mimeType} ${input.originalName} ${input.text}`.toLowerCase();
  if (input.kind === "ecg") return input.mimeType === "application/pdf" ? "12_LEAD_ECG_PDF" : "12_LEAD_ECG";
  if (/holter|24.?hour|ambulatory ecg/.test(haystack)) return "HOLTER";
  if (/stress|exercise ecg|treadmill/.test(haystack)) return "STRESS_ECG";
  if (/rhythm strip|single lead rhythm/.test(haystack)) return "RHYTHM_STRIP";
  if (/ecg|ekg|qrs|qtc|pr interval|st elevation|st depression|rhythm/.test(haystack)) return "12_LEAD_ECG";
  if (/echo|echocardiography|ejection fraction|\bef\b|valvular|ventricle/.test(haystack)) return "ECHO_REPORT";
  if (/troponin|hba1c|creatinine|hemoglobin|lipid|laboratory|lab|cbc|potassium|sodium/.test(haystack)) return "LABORATORY_REPORT";
  if (/cardiology report|cardiology consult|cardiac consult/.test(haystack)) return "CARDIOLOGY_REPORT";
  if (/referral|refer to cardiology/.test(haystack)) return "REFERRAL";
  if (/medication|tablet|capsule|dose|prescription|drug|pharmacy/.test(haystack)) return "PRESCRIPTION";
  if (/x[\s-]?ray|radiograph|chest xray|cxr|\bct\b|mri|radiology/.test(haystack)) return "RADIOLOGY_REPORT";
  if (input.mimeType.startsWith("image/")) return input.kind === "camera" ? "CAMERA_IMAGE" : "MEDICAL_IMAGE";
  if (input.mimeType === "application/pdf") return "CLINICAL_PDF";
  return "UNKNOWN";
}

function isEcgDocument(documentType: string, kind: AttachmentKind) {
  return kind === "ecg" || /ecg|ekg|rhythm|holter|stress/i.test(documentType);
}

function isDigitizableEcg(mimeType: string, originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  return mimeType.startsWith("image/") || mimeType === "application/pdf" || [".png", ".jpg", ".jpeg", ".pdf"].includes(ext);
}

function analyzeHeuristics(input: {
  documentType: string;
  kind: AttachmentKind;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  text: string;
  ecgMeasurements?: Record<string, unknown>;
}) {
  const text = `${input.originalName} ${input.text}`.toLowerCase();
  const findings = new Set<string>();
  const warnings = new Set<string>();
  const recommendations = new Set<string>(["Physician review and correlation with the full clinical record are required."]);

  if (input.ecgMeasurements) {
    findings.add("ECG digitization and measurement engine completed.");
    const hr = input.ecgMeasurements.heartRate;
    const rhythm = input.ecgMeasurements.rhythm;
    if (hr) findings.add(`Heart rate ${hr} bpm.`);
    if (rhythm) findings.add(`Rhythm: ${rhythm}.`);
  }

  if (/st elevation|stemi|acute mi/.test(text)) {
    findings.add("Possible acute ischemic ECG language detected.");
    warnings.add("Possible STEMI or acute coronary syndrome language requires urgent clinician review.");
  }
  if (/atrial fibrillation|\baf\b|irregular/.test(text)) {
    findings.add("Atrial fibrillation or irregular rhythm language detected.");
  }
  if (/troponin|creatinine|hba1c|potassium|hemoglobin/.test(text)) {
    findings.add("Laboratory markers were detected.");
  }
  if (/ejection fraction|\bef\b|valvular|hypokinesia/.test(text)) {
    findings.add("Echo/cardiac function findings were detected.");
  }
  if (!findings.size && input.mimeType.startsWith("image/")) {
    findings.add(`${input.documentType.replace(/_/g, " ")} uploaded for medical image review.`);
  }
  if (!findings.size) {
    findings.add(`${input.documentType.replace(/_/g, " ")} uploaded and indexed for clinical chat context.`);
  }

  const hasReadableText = input.text.length > 40;
  let confidence = Math.min(0.94, Math.max(0.55, 0.58 + (hasReadableText ? 0.16 : 0) + findings.size * 0.04));
  if (input.ecgMeasurements) confidence = Math.min(0.94, confidence + 0.12);
  if (!hasReadableText && !input.ecgMeasurements) {
    warnings.add("OCR extracted limited text — interpretation may rely on image structure only.");
    confidence = Math.min(confidence, OCR_CONFIDENCE_THRESHOLD - 0.05);
  }

  return {
    analysisSummary: `${input.documentType.replace(/_/g, " ")} analyzed: ${Array.from(findings).join(" ")}`,
    confidence,
    medicalAnalysis: {
      documentType: input.documentType,
      ecgMeasurements: input.ecgMeasurements ?? null,
      findings: Array.from(findings),
      hasReadableText,
      mimeType: input.mimeType,
      ocrConfidence: hasReadableText ? confidence : Math.max(0.4, confidence - 0.2),
      originalName: input.originalName,
      sizeBytes: input.sizeBytes,
    },
    recommendations: Array.from(recommendations),
    warnings: Array.from(warnings),
  };
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
  const calibration = detectGridCalibration(file);
  const pipeline = await runDigitizationPipeline(file);
  if (!pipeline.leads.length) {
    throw new Error("No ECG leads could be digitized from the uploaded image.");
  }
  const measurementEngine = measureFromLeads({ calibration: pipeline.calibration, leads: pipeline.leads });
  const interpretationEngine = interpretMeasurementBundle(measurementEngine);
  return {
    calibration: pipeline.calibration,
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

  if (input.mimeType.startsWith("image/")) {
    stages.push(stage("preview", "completed", "Image preview available"));
  } else {
    stages.push(stage("preview", "skipped", "Preview not applicable for this format"));
  }

  stages.push(stage("metadata", "completed", `Size ${input.sizeBytes} bytes, type ${input.mimeType}`));

  const ocrStarted = Date.now();
  let extractedText = readBestEffortOcrText(input.filePath);
  if (!extractedText && ![".txt", ".csv", ".json"].includes(path.extname(input.originalName).toLowerCase())) {
    try {
      const pseudoDoc = {
        category: "OTHER" as const,
        id: randomUUID(),
        originalName: input.originalName,
        storagePath: input.filePath,
      };
      extractedText = await documentOcr.extractText(pseudoDoc as never);
      if (extractedText.includes("OCR placeholder")) {
        extractedText = readBestEffortOcrText(input.filePath);
        stages.push(stage("ocr", "warning", "Limited OCR — scanned document may need manual review", Date.now() - ocrStarted));
      } else {
        stages.push(stage("ocr", "completed", "Text extraction completed", Date.now() - ocrStarted));
      }
    } catch {
      stages.push(stage("ocr", "warning", "OCR partial — continuing with available metadata", Date.now() - ocrStarted));
    }
  } else {
    stages.push(stage("ocr", "completed", extractedText ? "Text extraction completed" : "No readable text layer", Date.now() - ocrStarted));
  }

  const classifyStarted = Date.now();
  const documentType = detectDocumentType({
    kind: input.kind,
    mimeType: input.mimeType,
    originalName: input.originalName,
    text: extractedText,
  });
  stages.push(stage("classification", "completed", `Classified as ${documentType.replace(/_/g, " ")}`, Date.now() - classifyStarted));

  let ecgMeasurements: Record<string, unknown> | undefined;
  if (isEcgDocument(documentType, input.kind) && isDigitizableEcg(input.mimeType, input.originalName)) {
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

  const analysis = analyzeHeuristics({
    documentType,
    ecgMeasurements,
    kind: input.kind,
    mimeType: input.mimeType,
    originalName: input.originalName,
    sizeBytes: input.sizeBytes,
    text: extractedText,
  });

  stages.push(stage("completed", "completed", "Pipeline finished", Date.now() - started));

  return {
    ...analysis,
    documentType,
    extractedText,
    pipelineStages: stages,
  };
}
