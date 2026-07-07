import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";

import type {
  EcgAiAnnotationInspectorModel,
  EcgAiAnnotationType,
  EcgAiClinicalAnnotation,
  EcgAiOverlayBuildInput,
  EcgAiOverlayExportBundle,
  EcgAiOverlaySettings,
  EcgAiOverlayState,
} from "./aiOverlayTypes";
import { DEFAULT_AI_OVERLAY_SETTINGS } from "./aiOverlayTypes";

const STANDARD_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;

const TYPE_LABELS: Record<EcgAiAnnotationType, string> = {
  atrial_fibrillation: "Atrial Fibrillation",
  conduction_delay: "Conduction Delay",
  custom: "Custom Finding",
  electrical_axis: "Electrical Axis",
  heart_rate: "Heart Rate",
  lbbb: "LBBB",
  p_wave: "P Wave",
  pac: "PAC",
  pr_interval: "PR Interval",
  pvc: "PVC",
  qrs_complex: "QRS Complex",
  qt_interval: "QT Interval",
  qtc_interval: "QTc Interval",
  rbbb: "RBBB",
  rhythm: "Rhythm",
  rr_interval: "RR Interval",
  st_segment: "ST Segment",
  t_wave: "T Wave",
  u_wave: "U Wave",
};

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function confidencePercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

export function confidenceTone(confidence: number): EcgAiAnnotationInspectorModel["confidenceTone"] {
  if (confidence >= 95) return "very-high";
  if (confidence >= 70) return "high";
  if (confidence >= 50) return "moderate";
  if (confidence > 0) return "low";
  return "critical";
}

export function confidenceColor(confidence: number) {
  if (confidence >= 95) return "#22C55E";
  if (confidence >= 70) return "#EAB308";
  if (confidence >= 50) return "#F97316";
  return "#EF4444";
}

export function annotationTypeLabel(type: EcgAiAnnotationType) {
  return TYPE_LABELS[type];
}

export function leadRegionInImage(lead: string, imageWidth: number, imageHeight: number) {
  const normalized = lead === "Rhythm Strip" ? "II" : lead;
  const index = STANDARD_LEADS.indexOf(normalized as (typeof STANDARD_LEADS)[number]);
  const col = index >= 0 ? index % 6 : 1;
  const row = index >= 0 ? Math.floor(index / 6) : 0;
  const cellW = imageWidth / 6;
  const cellH = imageHeight / 4.2;
  const rhythmOffset = lead === "Rhythm Strip" ? cellH * 2.1 : 0;
  return {
    height: cellH * 0.58,
    width: cellW * 0.86,
    x: col * cellW + cellW * 0.07,
    y: row * cellH + cellH * 0.12 + rhythmOffset,
  };
}

function heatmapPointToRegion(point: AIExplainability["heatmap"]["points"][number], imageWidth: number, imageHeight: number) {
  const leadRegion = leadRegionInImage(point.lead, imageWidth, imageHeight);
  return {
    ...leadRegion,
    height: leadRegion.height * (0.65 + point.intensity * 0.35),
    width: leadRegion.width * (0.65 + point.intensity * 0.35),
  };
}

function baseAnnotation(
  input: Omit<EcgAiClinicalAnnotation, "createdAt" | "id" | "updatedAt"> & { id?: string },
): EcgAiClinicalAnnotation {
  const timestamp = nowIso();
  return {
    ...input,
    createdAt: timestamp,
    id: input.id ?? uid("ai-annotation"),
    updatedAt: timestamp,
  };
}

function measurementAnnotation(input: {
  clinicalMeaning?: string;
  confidence: number;
  createdBy: string;
  ecgCase: ApiECGCase;
  evidence: string[];
  imageHeight: number;
  imageWidth: number;
  lead: string;
  measurement?: string;
  medicalExplanation?: string;
  suggestedAction?: string;
  type: EcgAiAnnotationType;
  units?: string;
}): EcgAiClinicalAnnotation | null {
  if (!input.measurement && input.confidence <= 0) return null;
  return baseAnnotation({
    aiGenerated: true,
    clinicalMeaning: input.clinicalMeaning,
    confidence: input.confidence,
    confirmed: false,
    coordinates: leadRegionInImage(input.lead, input.imageWidth, input.imageHeight),
    createdBy: input.createdBy,
    doctorEdited: false,
    evidence: input.evidence,
    lead: input.lead,
    locked: false,
    measurement: input.measurement,
    medicalExplanation: input.medicalExplanation,
    rejected: false,
    selected: false,
    suggestedAction: input.suggestedAction,
    supportingMeasurements: input.measurement ? [input.measurement] : undefined,
    type: input.type,
    units: input.units,
    visible: true,
  });
}

function fallbackHighlights(analysis: AIAnalysisResult | null | undefined, ecgCase: ApiECGCase): AIExplainability["leadHighlights"] {
  const diagnosis = ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "Clinical review pending";
  const confidence = ecgCase.confidenceScore ?? analysis?.confidenceScore ?? 0.72;
  const lower = diagnosis.toLowerCase();
  if (lower.includes("stemi") || lower.includes("inferior")) {
    return ["II", "III", "aVF"].map((lead) => ({
      confidence,
      finding: "ST Elevation",
      lead,
      reason: "Territorial ST-segment elevation supports acute ischemia in inferior leads.",
    }));
  }
  if (lower.includes("af") || lower.includes("atrial fibrillation")) {
    return [{ confidence, finding: "Atrial Fibrillation", lead: "II", reason: "Irregular rhythm with absent organized P waves." }];
  }
  if (lower.includes("rbbb")) {
    return [{ confidence, finding: "RBBB morphology", lead: "V1", reason: "Right precordial QRS morphology supports RBBB." }];
  }
  return [{ confidence, finding: diagnosis, lead: "II", reason: analysis?.interpretation ?? "AI diagnosis pending detailed lead evidence." }];
}

function waveTypeForFinding(finding: string): EcgAiAnnotationType {
  const lower = finding.toLowerCase();
  if (lower.includes("pvc") || lower.includes("premature ventricular")) return "pvc";
  if (lower.includes("pac") || lower.includes("premature atrial")) return "pac";
  if (lower.includes("atrial fibrillation") || lower.includes(" af")) return "atrial_fibrillation";
  if (lower.includes("lbbb") || lower.includes("left bundle")) return "lbbb";
  if (lower.includes("rbbb") || lower.includes("right bundle")) return "rbbb";
  if (lower.includes("conduction delay") || lower.includes("av block")) return "conduction_delay";
  if (lower.includes("p wave") || lower.includes("absent p")) return "p_wave";
  if (lower.includes("pr")) return "pr_interval";
  if (lower.includes("qrs") || lower.includes("rbbb") || lower.includes("lbbb")) return "qrs_complex";
  if (lower.includes("qtc")) return "qtc_interval";
  if (lower.includes("qt")) return "qt_interval";
  if (lower.includes("st")) return "st_segment";
  if (lower.includes("rr")) return "rr_interval";
  if (lower.includes("rhythm") || lower.includes("fibrillation") || lower.includes("flutter")) return "rhythm";
  if (lower.includes("axis")) return "electrical_axis";
  if (lower.includes("u wave")) return "u_wave";
  if (lower.includes("heart rate") || lower.includes("bpm")) return "heart_rate";
  if (lower.includes("t wave")) return "t_wave";
  return "custom";
}

function evidenceForFinding(finding: string, reason: string) {
  const lower = finding.toLowerCase();
  if (lower.includes("st")) return ["ST segment morphology reviewed in affected leads", "Territorial distribution assessed", reason];
  if (lower.includes("af") || lower.includes("fibrillation")) return ["Irregular RR intervals", "Absent organized P waves", reason];
  if (lower.includes("rbbb") || lower.includes("lbbb")) return ["QRS morphology reviewed", "Bundle branch pattern assessed", reason];
  if (lower.includes("qt")) return ["QT interval measured", "Rate-corrected QT reviewed", reason];
  return [reason];
}

export function buildAiClinicalAnnotations(input: EcgAiOverlayBuildInput): EcgAiClinicalAnnotation[] {
  const { analysis, ecgCase, explainability, imageHeight, imageWidth, operatorName = "AI Clinical Engine" } = input;
  const confidence = confidencePercent(ecgCase.confidenceScore ?? analysis?.confidenceScore);
  const annotations: EcgAiClinicalAnnotation[] = [];

  const push = (item: EcgAiClinicalAnnotation | null) => {
    if (item) annotations.push(item);
  };

  push(
    measurementAnnotation({
      confidence,
      createdBy: operatorName,
      ecgCase,
      evidence: ["P-wave onset to QRS onset measured on calibrated grid"],
      imageHeight,
      imageWidth,
      lead: "II",
      measurement: ecgCase.prInterval ? `${ecgCase.prInterval}` : undefined,
      medicalExplanation: "PR interval reflects atrioventricular conduction time.",
      suggestedAction: ecgCase.prInterval && ecgCase.prInterval > 200 ? "Evaluate for first-degree AV block or conduction disease." : undefined,
      type: "pr_interval",
      units: "ms",
      clinicalMeaning: "Atrioventricular conduction interval",
    }),
  );
  push(
    measurementAnnotation({
      confidence,
      createdBy: operatorName,
      ecgCase,
      evidence: ["QRS duration measured across representative beats"],
      imageHeight,
      imageWidth,
      lead: "V1",
      measurement: ecgCase.qrsDuration ? `${ecgCase.qrsDuration}` : undefined,
      medicalExplanation: "QRS duration reflects ventricular depolarization time.",
      type: "qrs_complex",
      units: "ms",
      clinicalMeaning: "Ventricular conduction duration",
    }),
  );
  push(
    measurementAnnotation({
      confidence,
      createdBy: operatorName,
      ecgCase,
      evidence: ["QT interval measured and corrected for heart rate"],
      imageHeight,
      imageWidth,
      lead: "V5",
      measurement: ecgCase.qtInterval ? `${ecgCase.qtInterval}` : undefined,
      medicalExplanation: "QT interval reflects total ventricular repolarization.",
      type: "qt_interval",
      units: "ms",
      clinicalMeaning: "Ventricular repolarization duration",
    }),
  );
  push(
    measurementAnnotation({
      confidence,
      createdBy: operatorName,
      ecgCase,
      evidence: ["Bazett-corrected QT reviewed against institutional thresholds"],
      imageHeight,
      imageWidth,
      lead: "V5",
      measurement: ecgCase.qtcInterval ? `${ecgCase.qtcInterval}` : undefined,
      medicalExplanation: "QTc adjusts QT for heart rate to assess repolarization risk.",
      suggestedAction: ecgCase.qtcInterval && ecgCase.qtcInterval > 470 ? "Review medications and electrolytes; assess torsades risk." : undefined,
      type: "qtc_interval",
      units: "ms",
      clinicalMeaning: "Rate-corrected repolarization interval",
    }),
  );
  push(
    measurementAnnotation({
      confidence,
      createdBy: operatorName,
      ecgCase,
      evidence: ["RR interval derived from representative cardiac cycles"],
      imageHeight,
      imageWidth,
      lead: "II",
      measurement: ecgCase.heartRate ? `${Math.round(60000 / Math.max(ecgCase.heartRate, 1))}` : undefined,
      medicalExplanation: "RR interval is the time between consecutive R waves.",
      type: "rr_interval",
      units: "ms",
      clinicalMeaning: "Cardiac cycle length",
    }),
  );
  push(
    measurementAnnotation({
      confidence,
      createdBy: operatorName,
      ecgCase,
      evidence: ["Heart rate calculated from dominant rhythm"],
      imageHeight,
      imageWidth,
      lead: "II",
      measurement: ecgCase.heartRate ? `${ecgCase.heartRate}` : analysis?.heartRate ? `${analysis.heartRate}` : undefined,
      medicalExplanation: "Heart rate summarizes chronotropic status.",
      type: "heart_rate",
      units: "bpm",
      clinicalMeaning: "Ventricular rate",
    }),
  );
  push(
    measurementAnnotation({
      confidence,
      createdBy: operatorName,
      ecgCase,
      evidence: ["Rhythm regularity and P-wave organization reviewed"],
      imageHeight,
      imageWidth,
      lead: "II",
      measurement: ecgCase.rhythm ?? analysis?.rhythm,
      medicalExplanation: "Rhythm classification guides acute management priorities.",
      type: "rhythm",
      clinicalMeaning: "Cardiac rhythm interpretation",
    }),
  );
  push(
    measurementAnnotation({
      confidence: Math.max(confidence - 8, 45),
      createdBy: operatorName,
      ecgCase,
      evidence: ["Frontal plane QRS axis estimated from limb lead balance"],
      imageHeight,
      imageWidth,
      lead: "aVF",
      measurement: extractAxis(explainability, ecgCase),
      medicalExplanation: "Electrical axis reflects ventricular depolarization direction.",
      type: "electrical_axis",
      units: "degrees",
      clinicalMeaning: "QRS axis in the frontal plane",
    }),
  );

  const diagnosisText = `${ecgCase.aiDiagnosis ?? ""} ${analysis?.diagnosis ?? ""}`.toLowerCase();
  const morphologyOverlays: Array<{ lead: string; label: string; type: EcgAiAnnotationType }> = [
    { label: "PVC", lead: "V1", type: "pvc" },
    { label: "PAC", lead: "II", type: "pac" },
    { label: "AF", lead: "II", type: "atrial_fibrillation" },
    { label: "LBBB", lead: "V1", type: "lbbb" },
    { label: "RBBB", lead: "V1", type: "rbbb" },
    { label: "Conduction Delay", lead: "II", type: "conduction_delay" },
  ];
  for (const overlay of morphologyOverlays) {
    const token = overlay.type === "atrial_fibrillation" ? "fibrillation" : overlay.label.toLowerCase();
    if (!diagnosisText.includes(token) && overlay.type !== "conduction_delay") continue;
    if (overlay.type === "conduction_delay" && !diagnosisText.includes("block") && !diagnosisText.includes("delay")) continue;
    push(
      measurementAnnotation({
        confidence: Math.max(confidence - 5, 50),
        createdBy: operatorName,
        ecgCase,
        evidence: [`Morphology engine flagged ${overlay.label}`],
        imageHeight,
        imageWidth,
        lead: overlay.lead,
        measurement: overlay.label,
        medicalExplanation: `${overlay.label} pattern annotated for clinical review.`,
        type: overlay.type,
        clinicalMeaning: overlay.label,
      }),
    );
  }

  const highlights = explainability?.leadHighlights?.length
    ? explainability.leadHighlights
    : fallbackHighlights(analysis, ecgCase);

  for (const [index, highlight] of highlights.entries()) {
    const type = waveTypeForFinding(highlight.finding);
    const region = leadRegionInImage(highlight.lead, imageWidth, imageHeight);
    annotations.push(
      baseAnnotation({
        aiGenerated: true,
        clinicalMeaning: highlight.finding,
        confidence: confidencePercent(highlight.confidence),
        confirmed: false,
        coordinates: {
          ...region,
          x: region.x + (index % 2) * 8,
        },
        createdBy: operatorName,
        doctorEdited: false,
        evidence: evidenceForFinding(highlight.finding, highlight.reason),
        lead: highlight.lead,
        locked: false,
        measurement: highlight.finding,
        medicalExplanation: highlight.reason,
        rejected: false,
        selected: false,
        suggestedAction: suggestActionForFinding(highlight.finding),
        supportingMeasurements: buildSupportingMeasurements(ecgCase, analysis),
        type,
        visible: true,
      }),
    );
  }

  if (explainability?.heatmap?.points?.length) {
    const hottest = [...explainability.heatmap.points].sort((left, right) => right.intensity - left.intensity)[0];
    if (hottest && hottest.intensity >= 0.55) {
      const region = heatmapPointToRegion(hottest, imageWidth, imageHeight);
      annotations.push(
        baseAnnotation({
          aiGenerated: true,
          clinicalMeaning: "AI heatmap focus region",
          confidence: confidencePercent(hottest.intensity),
          confirmed: false,
          coordinates: region,
          createdBy: operatorName,
          doctorEdited: false,
          evidence: [`Lead ${hottest.lead} heat intensity ${Math.round(hottest.intensity * 100)}%`],
          lead: hottest.lead,
          locked: false,
          measurement: `${Math.round(hottest.intensity * 100)}% intensity`,
          medicalExplanation: "Spatial heatmap highlights the highest-confidence AI focus region.",
          rejected: false,
          selected: false,
          type: waveTypeForFinding(ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "custom"),
          units: "%",
          visible: true,
        }),
      );
    }
  }

  const deduped = new Map<string, EcgAiClinicalAnnotation>();
  for (const annotation of annotations) {
    const key = `${annotation.type}:${annotation.lead}:${annotation.measurement ?? ""}`;
    if (!deduped.has(key)) deduped.set(key, annotation);
  }
  return [...deduped.values()];
}

function extractAxis(explainability: AIExplainability | null | undefined, ecgCase: ApiECGCase) {
  const panelValue = explainability?.panel.find((item) => item.label.toLowerCase().includes("axis"))?.value;
  if (panelValue) return panelValue;
  const metadata = ecgCase.explainabilityData as { panel?: Array<{ label: string; value: string }> } | undefined;
  const stored = metadata?.panel?.find((item) => item.label.toLowerCase().includes("axis"))?.value;
  return stored ?? "Pending axis estimation";
}

function buildSupportingMeasurements(ecgCase: ApiECGCase, analysis?: AIAnalysisResult | null) {
  const values: string[] = [];
  if (ecgCase.prInterval) values.push(`PR ${ecgCase.prInterval} ms`);
  if (ecgCase.qrsDuration) values.push(`QRS ${ecgCase.qrsDuration} ms`);
  if (ecgCase.qtInterval) values.push(`QT ${ecgCase.qtInterval} ms`);
  if (ecgCase.qtcInterval) values.push(`QTc ${ecgCase.qtcInterval} ms`);
  if (ecgCase.heartRate ?? analysis?.heartRate) values.push(`HR ${ecgCase.heartRate ?? analysis?.heartRate} bpm`);
  return values.length ? values : undefined;
}

function suggestActionForFinding(finding: string) {
  const lower = finding.toLowerCase();
  if (lower.includes("stemi") || lower.includes("st elevation")) return "Activate acute coronary syndrome pathway and cardiology consult.";
  if (lower.includes("af") || lower.includes("fibrillation")) return "Assess anticoagulation need and rate control strategy.";
  if (lower.includes("qt") || lower.includes("long qt")) return "Review QT-prolonging medications and electrolyte status.";
  if (lower.includes("rbbb") || lower.includes("lbbb")) return "Correlate with symptoms and evaluate for structural heart disease.";
  return "Correlate AI overlay with clinical presentation and repeat ECG if indicated.";
}

export function buildAnnotationInspectorModel(annotation: EcgAiClinicalAnnotation): EcgAiAnnotationInspectorModel {
  const confidence = confidencePercent(annotation.confidence);
  return {
    annotation,
    clinicalSignificance: annotation.clinicalMeaning ?? annotationTypeLabel(annotation.type),
    confidenceLabel: `${confidence}%`,
    confidenceTone: confidenceTone(confidence),
  };
}

export function createAnnotationInput(
  type: EcgAiAnnotationType,
  lead: string,
  imageWidth: number,
  imageHeight: number,
  createdBy: string,
): EcgAiClinicalAnnotation {
  return baseAnnotation({
    aiGenerated: false,
    confidence: 100,
    confirmed: false,
    coordinates: leadRegionInImage(lead, imageWidth, imageHeight),
    createdBy,
    doctorEdited: true,
    evidence: ["Clinician placed annotation"],
    lead,
    locked: false,
    measurement: annotationTypeLabel(type),
    rejected: false,
    selected: true,
    type,
    visible: true,
  });
}

export function updateAnnotation(
  annotations: EcgAiClinicalAnnotation[],
  annotationId: string,
  patch: Partial<EcgAiClinicalAnnotation>,
): EcgAiClinicalAnnotation[] {
  return annotations.map((item) =>
    item.id === annotationId ? { ...item, ...patch, doctorEdited: patch.doctorEdited ?? true, updatedAt: nowIso() } : item,
  );
}

export function deleteAnnotation(annotations: EcgAiClinicalAnnotation[], annotationId: string) {
  return annotations.filter((item) => item.id !== annotationId);
}

export function serializeOverlayState(state: EcgAiOverlayState) {
  return JSON.parse(JSON.stringify(state)) as EcgAiOverlayState;
}

export function restoreOverlayState(raw: unknown): EcgAiOverlayState {
  if (!raw || typeof raw !== "object") {
    return { annotations: [], selectedAnnotationIds: [], settings: DEFAULT_AI_OVERLAY_SETTINGS, version: 1 };
  }
  const payload = raw as Partial<EcgAiOverlayState>;
  return {
    annotations: Array.isArray(payload.annotations) ? payload.annotations : [],
    selectedAnnotationIds: Array.isArray(payload.selectedAnnotationIds) ? payload.selectedAnnotationIds : [],
    settings: { ...DEFAULT_AI_OVERLAY_SETTINGS, ...(payload.settings ?? {}) },
    version: 1,
  };
}

export function exportOverlayAnnotations(state: EcgAiOverlayState): EcgAiOverlayExportBundle {
  return {
    annotations: state.annotations,
    exportedAt: nowIso(),
    format: "ecg-ai-overlay-v1",
    settings: state.settings,
  };
}

export function filterAnnotationsByLead(annotations: EcgAiClinicalAnnotation[], lead: string | "ALL") {
  if (lead === "ALL") return annotations;
  return annotations.filter((item) => item.lead === lead || (lead === "Rhythm Strip" && item.lead === "II"));
}

export function mergeGeneratedAnnotations(
  existing: EcgAiClinicalAnnotation[],
  generated: EcgAiClinicalAnnotation[],
): EcgAiClinicalAnnotation[] {
  const locked = existing.filter((item) => item.doctorEdited || item.confirmed || item.rejected || item.doctorNotes);
  const existingKeys = new Set(existing.map((item) => `${item.type}:${item.lead}`));
  const merged = [...locked];
  for (const item of existing) {
    if (locked.includes(item)) continue;
    merged.push(item);
  }
  for (const item of generated) {
    const key = `${item.type}:${item.lead}`;
    if (!existingKeys.has(key)) {
      merged.push(item);
      existingKeys.add(key);
    }
  }
  return merged;
}

export function migrateOverlaySettings(settings?: Partial<EcgAiOverlaySettings>): EcgAiOverlaySettings {
  return { ...DEFAULT_AI_OVERLAY_SETTINGS, ...(settings ?? {}) };
}
