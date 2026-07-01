import type { AttachmentForAnalysis } from "../../copilot-types";
import type { DocumentAnalysisJson } from "../types";

function pipelineFor(documentType: string, kind: string): DocumentAnalysisJson["pipeline"] {
  const haystack = `${documentType} ${kind}`.toLowerCase();
  if (/ecg|ekg/.test(haystack)) return "ecg";
  if (/lab|cbc|troponin|chemistry/.test(haystack)) return "laboratory";
  if (/xray|x-ray|ct|mri|radiology|cxr|echo/.test(haystack)) return "radiology";
  return "general";
}

function parseIntervals(text: string) {
  const intervals: Record<string, string | number | null> = {};
  const hr = text.match(/(?:heart rate|hr|\brate\b)\s*[:=]?\s*(\d{2,3})/i);
  if (hr) intervals.heartRateBpm = Number(hr[1]);
  const pr = text.match(/\bpr\s*[:=]?\s*(\d{2,3})\s*ms/i);
  if (pr) intervals.prMs = Number(pr[1]);
  const qrs = text.match(/\bqrs\s*[:=]?\s*(\d{2,3})\s*ms/i);
  if (qrs) intervals.qrsMs = Number(qrs[1]);
  const qt = text.match(/\bqt[c]?\s*[:=]?\s*(\d{2,3})\s*ms/i);
  if (qt) intervals.qtcMs = Number(qt[1]);
  return intervals;
}

function parseLabAbnormals(text: string) {
  const abnormalValues: string[] = [];
  for (const match of text.matchAll(/(troponin|creatinine|potassium|sodium|hemoglobin|hba1c|wbc|platelet)[^.\n]{0,40}/gi)) {
    abnormalValues.push(match[0].trim());
  }
  return abnormalValues.slice(0, 8);
}

function parseImpression(text: string) {
  const impressionMatch = text.match(/(?:impression|conclusion|summary)\s*[:-]\s*([^\n]{20,400})/i);
  return impressionMatch?.[1]?.trim();
}

export function analyzeAttachmentStructured(attachment: AttachmentForAnalysis): DocumentAnalysisJson {
  const text = `${attachment.originalName} ${attachment.extractedText ?? ""} ${JSON.stringify(attachment.medicalAnalysis ?? {})}`.toLowerCase();
  const documentType = attachment.documentType ?? attachment.kind;
  const pipeline = pipelineFor(documentType, attachment.kind);
  const findings = new Set<string>();
  const warnings = new Set<string>();
  const morphology = new Set<string>();

  if (/st elevation|stemi/.test(text)) {
    findings.add("ST elevation language detected");
    warnings.add("Possible acute coronary syndrome — urgent correlation required");
  }
  if (/atrial fibrillation|\baf\b|irregularly irregular/.test(text)) {
    findings.add("Atrial fibrillation or irregular rhythm language detected");
  }
  if (/left ventricular hypertrophy|\blvh\b/.test(text)) {
    findings.add("Left ventricular hypertrophy language detected");
    morphology.add("Possible LVH pattern");
  }
  if (/prolonged qt|long qt|qtc/.test(text)) {
    findings.add("Prolonged QT language detected");
    morphology.add("QT prolongation concern");
  }
  if (/troponin|creatinine|potassium|hemoglobin|wbc|platelet/.test(text)) {
    findings.add("Laboratory analyte language detected");
  }
  if (/opacity|infiltrate|fracture|consolidation|effusion/.test(text)) {
    findings.add("Radiology descriptive language detected");
  }
  if (/ejection fraction|\bef\b|hypokinesia|regurgitation/.test(text)) {
    findings.add("Echocardiography function/valve language detected");
  }
  if (!findings.size) {
    findings.add(`${documentType.replace(/_/g, " ")} uploaded for clinical review`);
  }

  const intervals = pipeline === "ecg" ? parseIntervals(text) : undefined;
  const rhythm = /sinus|atrial fibrillation|flutter|vt|vf|junctional/.exec(text)?.[0] ?? null;

  return {
    abnormalValues: pipeline === "laboratory" ? parseLabAbnormals(text) : undefined,
    documentType,
    extractedTextPreview: attachment.extractedText?.slice(0, 500) || undefined,
    findings: Array.from(findings),
    impression: pipeline === "radiology" ? parseImpression(text) : undefined,
    intervals,
    measurements: intervals,
    morphology: morphology.size ? Array.from(morphology) : undefined,
    name: attachment.originalName,
    pipeline,
    recommendations: ["Correlate with symptoms, examination, and source document"],
    rhythm: pipeline === "ecg" ? rhythm : undefined,
    warnings: warnings.size ? Array.from(warnings) : undefined,
  };
}

export function analyzeAttachmentsStructured(attachments: AttachmentForAnalysis[]): DocumentAnalysisJson[] {
  return attachments.map(analyzeAttachmentStructured);
}
