import type { ECGAnnotation, ECGAnnotationType, ECGCase } from "@prisma/client";
import type { AiClinicalAnnotationDto } from "../ai-overlay/ai-overlay.contracts";

const STANDARD_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;

export type MeasurementOverlayInput = {
  heartRate?: number; prInterval?: number; qrsDuration?: number;
  qtInterval?: number; qtcInterval?: number; stDeviation?: number;
};

function uid(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function nowIso() { return new Date().toISOString(); }

export function confidencePercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

export function leadRegionInImage(lead: string, imageWidth: number, imageHeight: number) {
  const normalized = lead === "Rhythm Strip" ? "II" : lead;
  const index = STANDARD_LEADS.indexOf(normalized as (typeof STANDARD_LEADS)[number]);
  const col = index >= 0 ? index % 6 : 1;
  const row = index >= 0 ? Math.floor(index / 6) : 0;
  const cellW = imageWidth / 6;
  const cellH = imageHeight / 4.2;
  const rhythmOffset = lead === "Rhythm Strip" ? cellH * 2.1 : 0;
  return { height: cellH * 0.58, width: cellW * 0.86, x: col * cellW + cellW * 0.07, y: row * cellH + cellH * 0.12 + rhythmOffset };
}

function baseAnnotation(input: Omit<AiClinicalAnnotationDto, "createdAt" | "id" | "updatedAt"> & { id?: string }): AiClinicalAnnotationDto {
  const timestamp = nowIso();
  return { ...input, createdAt: timestamp, id: input.id ?? uid("ai-annotation"), updatedAt: timestamp };
}

function markerAnnotation(input: {
  clinicalMeaning?: string; confidence: number; createdBy: string; evidence: string[];
  imageHeight: number; imageWidth: number; lead: string; measurement?: string;
  medicalExplanation?: string; suggestedAction?: string; type: string; units?: string;
}): AiClinicalAnnotationDto {
  return baseAnnotation({
    aiGenerated: true, clinicalMeaning: input.clinicalMeaning, confidence: input.confidence, confirmed: false,
    coordinates: leadRegionInImage(input.lead, input.imageWidth, input.imageHeight), createdBy: input.createdBy,
    doctorEdited: false, evidence: input.evidence, lead: input.lead, locked: false, measurement: input.measurement,
    medicalExplanation: input.medicalExplanation, rejected: false, suggestedAction: input.suggestedAction,
    supportingMeasurements: input.measurement ? [input.measurement] : undefined, type: input.type, units: input.units, visible: true,
  });
}

const ANNOTATION_TYPE_MAP: Partial<Record<ECGAnnotationType, string>> = {
  ATRIAL_FIBRILLATION: "rhythm", BRADYCARDIA: "heart_rate", P_WAVE: "p_wave", PVC: "qrs_complex",
  QRS_COMPLEX: "qrs_complex", QT_PROLONGATION: "qt_interval", R_PEAK: "qrs_complex",
  ST_DEPRESSION: "st_segment", ST_ELEVATION: "st_segment", TACHYCARDIA: "heart_rate",
  T_INVERSION: "t_wave", T_WAVE: "t_wave",
};

export function mapDatabaseAnnotationsToOverlay(input: {
  annotations: ECGAnnotation[]; confidence: number; createdBy: string; imageHeight: number; imageWidth: number;
}): AiClinicalAnnotationDto[] {
  return input.annotations.map((annotation) => markerAnnotation({
    clinicalMeaning: `${annotation.annotationType} detected on lead ${annotation.leadName}`,
    confidence: input.confidence, createdBy: input.createdBy,
    evidence: [`Database annotation ${annotation.annotationType}`],
    imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead: annotation.leadName,
    type: ANNOTATION_TYPE_MAP[annotation.annotationType] ?? "custom",
  }));
}

export function buildPhysicianNoteAnnotation(input: {
  authorId: string; imageHeight: number; imageWidth: number; lead?: string; note: string;
}): AiClinicalAnnotationDto {
  return baseAnnotation({
    aiGenerated: false, clinicalMeaning: input.note, confidence: 100, confirmed: true,
    coordinates: leadRegionInImage(input.lead ?? "II", input.imageWidth, input.imageHeight),
    createdBy: input.authorId, doctorEdited: true, doctorNotes: input.note, evidence: ["Physician note overlay"],
    lead: input.lead ?? "II", locked: false, medicalExplanation: input.note, rejected: false, type: "physician_note", visible: true,
  });
}

export function buildMeasurementOverlayAnnotations(input: {
  createdBy: string;
  ecgCase: Pick<ECGCase, "aiDiagnosis" | "caseId" | "confidenceScore" | "finalDiagnosis" | "heartRate" | "id" | "prInterval" | "recommendations">;
  imageHeight: number; imageWidth: number; measurement: MeasurementOverlayInput;
}): AiClinicalAnnotationDto[] {
  const confidence = confidencePercent(input.ecgCase.confidenceScore ?? 0.75) / 100;
  const lead = "II";
  const diagnosis = input.ecgCase.finalDiagnosis ?? input.ecgCase.aiDiagnosis ?? "Clinical review";
  const hr = input.measurement.heartRate ?? input.ecgCase.heartRate;
  const pr = input.measurement.prInterval ?? input.ecgCase.prInterval;
  const qrs = input.measurement.qrsDuration;
  const qt = input.measurement.qtInterval;
  const qtc = input.measurement.qtcInterval;
  const st = input.measurement.stDeviation ?? 0;
  return [
    markerAnnotation({ clinicalMeaning: "P wave morphology marker", confidence, createdBy: input.createdBy, evidence: ["Measurement engine fiducial detection"], imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead, type: "p_wave" }),
    markerAnnotation({ clinicalMeaning: "PR interval measurement", confidence, createdBy: input.createdBy, evidence: ["PR interval from measurement engine"], imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead, measurement: pr ? `${pr}` : undefined, type: "pr_interval", units: "ms" }),
    markerAnnotation({ clinicalMeaning: "QRS complex marker", confidence, createdBy: input.createdBy, evidence: ["QRS duration analysis"], imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead, measurement: qrs ? `${qrs}` : undefined, type: "qrs_complex", units: "ms" }),
    markerAnnotation({ clinicalMeaning: "T wave morphology marker", confidence, createdBy: input.createdBy, evidence: ["T wave analysis"], imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead, type: "t_wave" }),
    markerAnnotation({ clinicalMeaning: st !== 0 ? "ST segment deviation detected" : "ST segment within normal limits", confidence, createdBy: input.createdBy, evidence: ["ST deviation measurement"], imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead, measurement: `${st}`, suggestedAction: Math.abs(st) >= 1 ? "Evaluate for ischemia" : undefined, type: "st_segment", units: "mm" }),
    markerAnnotation({ clinicalMeaning: "QT interval overlay", confidence, createdBy: input.createdBy, evidence: ["QT interval calculation"], imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead, measurement: qt ? `${qt}` : undefined, type: "qt_interval", units: "ms" }),
    markerAnnotation({ clinicalMeaning: "Corrected QT interval (Bazett)", confidence, createdBy: input.createdBy, evidence: ["QTc Bazett formula"], imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead, measurement: qtc ? `${qtc}` : undefined, type: "qtc_interval", units: "ms" }),
    markerAnnotation({ clinicalMeaning: diagnosis, confidence, createdBy: input.createdBy, evidence: ["AI diagnosis synthesis"], imageHeight: input.imageHeight, imageWidth: input.imageWidth, lead, measurement: hr ? `${hr}` : undefined, medicalExplanation: diagnosis, type: "heart_rate", units: "bpm" }),
  ];
}

export function mergeOverlayAnnotations(primary: AiClinicalAnnotationDto[], secondary: AiClinicalAnnotationDto[]): AiClinicalAnnotationDto[] {
  const seen = new Set(primary.map((item) => item.id));
  const merged = [...primary];
  for (const item of secondary) { if (!seen.has(item.id)) { merged.push(item); seen.add(item.id); } }
  return merged;
}
