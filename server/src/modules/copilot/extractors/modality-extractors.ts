import type { MedicalExtractor } from "./types";
import {
  keywordFindings,
  parseDates,
  parseImpression,
  parseIntervals,
  parsePatientIdentifiers,
} from "./shared/text-patterns";

const ECG_RULES = [
  { finding: "ST elevation language detected", pattern: /st elevation|stemi/i, warning: "Possible acute coronary syndrome — urgent correlation required" },
  { finding: "Atrial fibrillation or irregular rhythm language detected", pattern: /atrial fibrillation|\baf\b|irregularly irregular/i },
  { finding: "Left ventricular hypertrophy language detected", pattern: /left ventricular hypertrophy|\blvh\b/i },
  { finding: "Prolonged QT language detected", pattern: /prolonged qt|long qt|qtc/i },
];

export const EcgMedicalExtractor: MedicalExtractor = {
  extract(input) {
    const text = `${input.originalName} ${input.extractedText}`.toLowerCase();
    const { findings, warnings } = keywordFindings(text, ECG_RULES);
    const intervals = parseIntervals(text);
    const ecg = input.ecgMeasurements ?? {};
    const measurements = [
      ...Object.entries(intervals).map(([key, value]) => ({ key, unit: key.includes("Ms") ? "ms" : "bpm", value })),
      ...(typeof ecg.heartRate === "number" ? [{ key: "heartRate", unit: "bpm", value: ecg.heartRate as number }] : []),
      ...(typeof ecg.prIntervalMs === "number" ? [{ key: "prIntervalMs", unit: "ms", value: ecg.prIntervalMs as number }] : []),
      ...(typeof ecg.qrsDurationMs === "number" ? [{ key: "qrsDurationMs", unit: "ms", value: ecg.qrsDurationMs as number }] : []),
      ...(typeof ecg.qtIntervalMs === "number" ? [{ key: "qtIntervalMs", unit: "ms", value: ecg.qtIntervalMs as number }] : []),
      ...(typeof ecg.qtcBazettMs === "number" ? [{ key: "qtcBazettMs", unit: "ms", value: ecg.qtcBazettMs as number }] : []),
    ];
    if (input.ecgMeasurements) findings.unshift("ECG digitization and measurement engine completed.");
    if (typeof ecg.rhythm === "string") findings.push(`Rhythm: ${ecg.rhythm}.`);
    if (!findings.length) findings.push(`${input.documentType.replace(/_/g, " ")} uploaded for ECG review`);

    return {
      confidence: Math.min(0.94, 0.7 + (input.extractedText.length > 40 ? 0.12 : 0) + (input.ecgMeasurements ? 0.12 : 0)),
      dates: parseDates(input.extractedText),
      diagnoses: [],
      findings,
      measurements,
      modality: "ecg",
      numericalValues: { ...intervals, ...(input.ecgMeasurements ?? {}) } as Record<string, string | number>,
      pageReferences: [],
      patientIdentifiers: parsePatientIdentifiers(input.extractedText, input.structuredOcr),
      recommendations: ["Correlate with symptoms, prior ECGs, and activate emergency pathway if clinically indicated"],
      summary: `${input.documentType.replace(/_/g, " ")} analyzed: ${findings.slice(0, 3).join(" ")}`,
      warnings,
    };
  },
  id: "ecg",
  supports: (input) => /ecg|ekg|rhythm|holter|stress/i.test(`${input.documentType} ${input.kind}`),
};

export const LabMedicalExtractor: MedicalExtractor = {
  extract(input) {
    const text = `${input.originalName} ${input.extractedText}`.toLowerCase();
    const { findings, warnings } = keywordFindings(text, [
      { finding: "Laboratory analyte language detected", pattern: /troponin|creatinine|hba1c|potassium|hemoglobin|wbc|platelet|sodium|lipid/i },
    ]);
    if (!findings.length) findings.push("Laboratory report uploaded for review");
    return {
      confidence: Math.min(0.9, 0.65 + (input.extractedText.length > 40 ? 0.15 : 0)),
      dates: parseDates(input.extractedText),
      diagnoses: [],
      findings,
      measurements: [],
      modality: "lab",
      numericalValues: {},
      pageReferences: [],
      patientIdentifiers: parsePatientIdentifiers(input.extractedText, input.structuredOcr),
      recommendations: ["Trend abnormal values and correlate with symptoms and medications"],
      summary: `Laboratory report analyzed: ${findings.join(" ")}`,
      warnings,
    };
  },
  id: "lab",
  supports: (input) => /lab|troponin|cbc|chemistry/i.test(`${input.documentType} ${input.extractedText}`),
};

export const RadiologyMedicalExtractor: MedicalExtractor = {
  extract(input) {
    const text = `${input.originalName} ${input.extractedText}`.toLowerCase();
    const { findings, warnings } = keywordFindings(text, [
      { finding: "Radiology descriptive language detected", pattern: /opacity|infiltrate|fracture|consolidation|effusion|x[\s-]?ray|ct|mri/i },
    ]);
    const impression = parseImpression(input.extractedText);
    if (impression) findings.push(`Impression: ${impression}`);
    if (!findings.length) findings.push("Radiology report uploaded for review");
    const modality = /\bct\b|computed tomography/i.test(text) ? "ct" as const
      : /\bmri\b|magnetic resonance/i.test(text) ? "mri" as const
      : "radiology" as const;
    return {
      confidence: Math.min(0.88, 0.62 + (input.extractedText.length > 40 ? 0.14 : 0)),
      dates: parseDates(input.extractedText),
      diagnoses: impression ? [impression] : [],
      findings,
      measurements: [],
      modality,
      numericalValues: {},
      pageReferences: [],
      patientIdentifiers: parsePatientIdentifiers(input.extractedText, input.structuredOcr),
      recommendations: ["Review original imaging and urgent findings with responsible clinician"],
      summary: `${modality.toUpperCase()} report analyzed: ${findings.slice(0, 2).join(" ")}`,
      warnings,
    };
  },
  id: "radiology",
  supports: (input) => /radiology|xray|x-ray|cxr|ct|mri|opacity|infiltrate/i.test(`${input.documentType} ${input.extractedText}`),
};

export const EchoMedicalExtractor: MedicalExtractor = {
  extract(input) {
    const text = `${input.originalName} ${input.extractedText}`.toLowerCase();
    const { findings, warnings } = keywordFindings(text, [
      { finding: "Echocardiography function/valve language detected", pattern: /ejection fraction|\bef\b|hypokinesia|regurgitation|valvular|ventricle|echo/i },
    ]);
    if (!findings.length) findings.push("Echo report uploaded for review");
    return {
      confidence: Math.min(0.9, 0.64 + (input.extractedText.length > 40 ? 0.14 : 0)),
      dates: parseDates(input.extractedText),
      diagnoses: [],
      findings,
      measurements: [],
      modality: "echo",
      numericalValues: {},
      pageReferences: [],
      patientIdentifiers: parsePatientIdentifiers(input.extractedText, input.structuredOcr),
      recommendations: ["Correlate with symptoms, ECG, and prior echo studies"],
      summary: `Echo report analyzed: ${findings.join(" ")}`,
      warnings,
    };
  },
  id: "echo",
  supports: (input) => /echo|echocardiography|ejection fraction|\bef\b/i.test(`${input.documentType} ${input.extractedText}`),
};

export const CathMedicalExtractor: MedicalExtractor = {
  extract(input) {
    const text = `${input.originalName} ${input.extractedText}`.toLowerCase();
    const { findings, warnings } = keywordFindings(text, [
      { finding: "Cath lab / angiography language detected", pattern: /cath|angiography|stenosis|coronary|pci|stent/i },
    ]);
    if (!findings.length) findings.push("Cath report uploaded for review");
    return {
      confidence: 0.72,
      dates: parseDates(input.extractedText),
      diagnoses: [],
      findings,
      measurements: [],
      modality: "cath",
      numericalValues: {},
      pageReferences: [],
      patientIdentifiers: parsePatientIdentifiers(input.extractedText, input.structuredOcr),
      recommendations: ["Review angiographic findings with interventional cardiology team"],
      summary: `Cath report analyzed: ${findings.join(" ")}`,
      warnings,
    };
  },
  id: "cath",
  supports: (input) => /cath|angiography|coronary/i.test(`${input.documentType} ${input.extractedText}`),
};

export const GeneralMedicalExtractor: MedicalExtractor = {
  extract(input) {
    const findings = [`${input.documentType.replace(/_/g, " ")} uploaded for clinical review`];
    const warnings: string[] = [];
    if (input.extractedText.length <= 40) {
      warnings.push("OCR extracted limited text — physician verification required.");
    }
    return {
      confidence: Math.min(0.82, 0.55 + (input.extractedText.length > 40 ? 0.15 : 0)),
      dates: parseDates(input.extractedText),
      diagnoses: [],
      findings,
      measurements: [],
      modality: input.mimeType.startsWith("image/") ? "clinical_photo" : "general",
      numericalValues: {},
      pageReferences: [],
      patientIdentifiers: parsePatientIdentifiers(input.extractedText, input.structuredOcr),
      recommendations: ["Physician review and correlation with the full clinical record are required."],
      summary: `${input.documentType.replace(/_/g, " ")} indexed for clinical chat context`,
      warnings,
    };
  },
  id: "general",
  supports: () => true,
};
