import type { ClinicalFinding, EcgClinicalInterpretation } from "../../ecg-interpretation/types";
import type { EcgClinicalMeasurementResult } from "../../ecg-measurement/types";
import type { EcgClinicalKnowledgeEntry } from "../../clinical-knowledge-engine/types";
import type {
  AxisSection,
  ClinicalImpressionSection,
  ConductionSection,
  HypertrophySection,
  IntervalsSection,
  QWaveSection,
  RateSection,
  RhythmSection,
  StSegmentSection,
  TWaveSection,
} from "../types/sections";
import { highestSeverityFinding, intervalInterpretation, lookupKnowledgeEntry, mapKnowledgeDiagnosisId, pickFinding, pickFindingsByCategory } from "../services/knowledge-bridge";

function knowledgeRef(entry: EcgClinicalKnowledgeEntry | null | undefined) {
  return entry?.diagnosisId ?? null;
}

function sectionFromFinding(
  finding: ClinicalFinding,
  knowledge: EcgClinicalKnowledgeEntry | null,
  fallbackInterpretation: string,
): Pick<RhythmSection, "classification" | "confidence" | "evidence" | "interpretation" | "knowledgeDiagnosisId" | "label" | "severity"> {
  return {
    classification: finding.code,
    confidence: finding.confidence,
    evidence: finding.evidence,
    interpretation: knowledge?.description ?? fallbackInterpretation,
    knowledgeDiagnosisId: knowledgeRef(knowledge),
    label: finding.label,
    severity: finding.severity,
  };
}

export function interpretRhythmSection(
  measurement: EcgClinicalMeasurementResult,
  findings: ClinicalFinding[],
  lookupKnowledge: (code: string) => EcgClinicalKnowledgeEntry | null,
): RhythmSection {
  const rhythmFindings = pickFindingsByCategory(findings, "rhythm");
  const priority = pickFinding(rhythmFindings, ["VENTRICULAR", "AF", "AFL", "SVT", "JUNCTIONAL", "STACH", "SBRAD", "NSR"])
    ?? highestSeverityFinding(rhythmFindings);
  if (priority) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, priority.code);
    return {
      ...sectionFromFinding(priority, knowledge, `${priority.label} based on automated rhythm analysis.`),
      rhythmCode: priority.code,
    };
  }
  return {
    classification: "UNSPECIFIED",
    confidence: measurement.confidence * 0.6,
    evidence: [{ feature: "Rhythm classifier", value: measurement.rhythm }],
    interpretation: "Rhythm pattern could not be classified with high confidence. Physician review required.",
    knowledgeDiagnosisId: null,
    label: "Unspecified Rhythm",
    rhythmCode: "UNSPECIFIED",
    severity: "minor",
  };
}

export function interpretRateSection(measurement: EcgClinicalMeasurementResult): RateSection {
  const heartRate = measurement.heartRate;
  let rateCategory: RateSection["rateCategory"] = "normal";
  let label = "Normal Rate";
  let severity: RateSection["severity"] = "normal";
  let interpretation = `Heart rate ${heartRate} bpm is within normal resting range (60-100 bpm).`;

  if (heartRate > 100) {
    rateCategory = "fast";
    label = "Fast Rate";
    severity = heartRate >= 150 ? "urgent" : "minor";
    interpretation = `Heart rate ${heartRate} bpm is elevated (tachycardia threshold > 100 bpm).`;
  } else if (heartRate < 60) {
    rateCategory = "slow";
    label = "Slow Rate";
    severity = heartRate < 45 ? "urgent" : "minor";
    interpretation = `Heart rate ${heartRate} bpm is reduced (bradycardia threshold < 60 bpm).`;
  }

  return {
    classification: rateCategory,
    confidence: 0.9,
    evidence: [{ feature: "Heart Rate", value: `${heartRate} bpm` }],
    heartRateBpm: heartRate,
    interpretation,
    knowledgeDiagnosisId: null,
    label,
    rateCategory,
    severity,
  };
}

export function interpretAxisSection(
  measurement: EcgClinicalMeasurementResult,
  findings: ClinicalFinding[],
  lookupKnowledge: (code: string) => EcgClinicalKnowledgeEntry | null,
): AxisSection {
  const axisFinding = pickFinding(findings, ["EXTREME_AXIS", "RAD", "LAD", "AXIS_NORMAL"])
    ?? highestSeverityFinding(pickFindingsByCategory(findings, "axis"));
  const axisDegrees = measurement.axis.meanQrsAxisDeg;
  if (axisFinding) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, axisFinding.code);
    return {
      ...sectionFromFinding(axisFinding, knowledge, `Mean QRS axis ${axisDegrees}°.`),
      axisDegrees,
    };
  }
  return {
    axisDegrees,
    classification: "indeterminate",
    confidence: 0.5,
    evidence: [{ feature: "Mean QRS axis", value: `${axisDegrees}°` }],
    interpretation: `Mean QRS axis ${axisDegrees}° — correlate with lead-specific QRS polarity.`,
    knowledgeDiagnosisId: null,
    label: "Axis Assessment",
    severity: "minor",
  };
}

export function interpretIntervalsSection(measurement: EcgClinicalMeasurementResult): IntervalsSection {
  const { intervals } = measurement;
  const pr = intervalInterpretation("PR interval", intervals.prIntervalMs, 120, 200);
  const qrs = intervalInterpretation("QRS duration", intervals.qrsDurationMs, 80, 120);
  const qt = intervalInterpretation("QT interval", intervals.qtIntervalMs, 320, 440);
  const qtc = intervalInterpretation("QTc (Bazett)", intervals.qtcBazettMs, 350, 450);
  const rr = intervalInterpretation("RR interval", intervals.rrIntervalMs, 600, 1000);
  const abnormalCount = [pr, qrs, qt, qtc, rr].filter((item) => !item.normal).length;
  const severity = abnormalCount >= 3 ? "abnormal" : abnormalCount >= 1 ? "minor" : "normal";

  return {
    confidence: measurement.confidence,
    interpretation: abnormalCount
      ? `${abnormalCount} interval measurement(s) outside expected reference range.`
      : "All measured intervals within expected reference ranges.",
    pr: { ...pr, ms: intervals.prIntervalMs, unit: "ms" },
    qrs: { ...qrs, ms: intervals.qrsDurationMs, unit: "ms" },
    qt: { ...qt, ms: intervals.qtIntervalMs, unit: "ms" },
    qtc: { ...qtc, ms: intervals.qtcBazettMs, unit: "ms" },
    rr: { ...rr, ms: intervals.rrIntervalMs, unit: "ms" },
    severity,
  };
}

export function interpretConductionSection(
  measurement: EcgClinicalMeasurementResult,
  findings: ClinicalFinding[],
  lookupKnowledge: (code: string) => EcgClinicalKnowledgeEntry | null,
): ConductionSection {
  const conductionFindings = pickFindingsByCategory(findings, "conduction");
  const blocks = conductionFindings.map((item) => item.label);
  const primary = highestSeverityFinding(conductionFindings);
  if (primary) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, primary.code);
    return {
      ...sectionFromFinding(primary, knowledge, blocks.length ? `Conduction abnormality: ${blocks.join("; ")}.` : "Normal conduction."),
      blocks: blocks.length ? blocks : ["Normal Conduction"],
    };
  }
  const normalQrs = measurement.intervals.qrsDurationMs <= 120 && measurement.intervals.prIntervalMs <= 200;
  return {
    blocks: ["Normal Conduction"],
    classification: "normal",
    confidence: normalQrs ? 0.82 : 0.55,
    evidence: [
      { feature: "PR interval", value: `${measurement.intervals.prIntervalMs} ms` },
      { feature: "QRS duration", value: `${measurement.intervals.qrsDurationMs} ms` },
    ],
    interpretation: "No bundle branch or high-grade AV conduction block detected.",
    knowledgeDiagnosisId: knowledgeRef(lookupKnowledge("SINUS_RHYTHM")),
    label: "Normal Conduction",
    severity: "normal",
  };
}

export function interpretHypertrophySection(
  findings: ClinicalFinding[],
  lookupKnowledge: (code: string) => EcgClinicalKnowledgeEntry | null,
): HypertrophySection {
  const hypertrophyFindings = pickFindingsByCategory(findings, "hypertrophy");
  const labels = hypertrophyFindings.map((item) => item.label);
  const primary = highestSeverityFinding(hypertrophyFindings);
  if (primary) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, primary.code);
    const biventricular = labels.includes("Left Ventricular Hypertrophy") && labels.includes("Right Ventricular Hypertrophy");
    return {
      ...sectionFromFinding(
        primary,
        knowledge,
        biventricular ? "Biventricular enlargement pattern suggested." : labels.join("; "),
      ),
      classification: biventricular ? "biventricular" : primary.code,
      findings: labels.length ? labels : [primary.label],
      label: biventricular ? "Biventricular Enlargement" : primary.label,
    };
  }
  return {
    classification: "none",
    confidence: 0.78,
    evidence: [{ feature: "Voltage criteria", value: "Not met" }],
    findings: [],
    interpretation: "No chamber enlargement criteria met on automated analysis.",
    knowledgeDiagnosisId: null,
    label: "No Chamber Enlargement",
    severity: "normal",
  };
}

export function interpretStSegmentSection(
  measurement: EcgClinicalMeasurementResult,
  findings: ClinicalFinding[],
  lookupKnowledge: (code: string) => EcgClinicalKnowledgeEntry | null,
): StSegmentSection {
  const stMm = measurement.amplitudes.stDeviationMm;
  const ischemia = pickFindingsByCategory(findings, "ischemia");
  const elevation = pickFinding(ischemia, ["STEMI", "ANT_MI", "INF_MI", "LAT_MI", "POST_MI"]);
  const depression = pickFinding(ischemia, ["NSTEMI", "ST_DEP"]);
  const diffuse = stMm !== 0 && !elevation && !depression && Math.abs(stMm) >= 0.3;

  if (elevation) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, elevation.code);
    return {
      ...sectionFromFinding(elevation, knowledge, `ST elevation ${stMm} mm.`),
      deviationMm: stMm,
      classification: "elevation",
      label: "ST Elevation",
    };
  }
  if (depression) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, depression.code);
    return {
      ...sectionFromFinding(depression, knowledge, `ST depression ${stMm} mm.`),
      deviationMm: stMm,
      classification: "depression",
      label: "ST Depression",
    };
  }
  if (diffuse) {
    return {
      classification: "diffuse_changes",
      confidence: 0.58,
      deviationMm: stMm,
      evidence: [{ feature: "ST deviation", value: `${stMm} mm` }],
      interpretation: `Non-localized ST segment changes (${stMm} mm).`,
      knowledgeDiagnosisId: null,
      label: "Diffuse ST Changes",
      severity: "minor",
    };
  }
  return {
    classification: "normal",
    confidence: 0.84,
    deviationMm: stMm,
    evidence: [{ feature: "ST deviation", value: `${stMm} mm` }],
    interpretation: "ST segment at baseline without significant deviation.",
    knowledgeDiagnosisId: null,
    label: "Normal ST Segment",
    severity: "normal",
  };
}

export function interpretTWaveSection(
  measurement: EcgClinicalMeasurementResult,
  findings: ClinicalFinding[],
  lookupKnowledge: (code: string) => EcgClinicalKnowledgeEntry | null,
): TWaveSection {
  const ischemia = pickFindingsByCategory(findings, "ischemia");
  const hyperacute = pickFinding(ischemia, ["HYPERACUTE_T"]);
  const inversion = pickFinding(ischemia, ["T_INV"]);
  const amplitude = measurement.amplitudes.tWaveAmplitudeMv;

  if (hyperacute) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, "HYPERACUTE_T");
    return {
      ...sectionFromFinding(hyperacute, knowledge, `Hyperacute T waves (${amplitude} mV).`),
      amplitudeMv: amplitude,
      classification: "hyperacute",
      label: "Hyperacute T Waves",
    };
  }
  if (inversion) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, "T_INV");
    return {
      ...sectionFromFinding(inversion, knowledge, `T-wave inversion pattern (${amplitude} mV).`),
      amplitudeMv: amplitude,
      classification: "inversion",
      label: "T-Wave Inversion",
    };
  }
  if (amplitude > 0 && amplitude < 0.15 && measurement.amplitudes.stDeviationMm <= 0.1) {
    return {
      amplitudeMv: amplitude,
      classification: "flattened",
      confidence: 0.6,
      evidence: [{ feature: "T wave amplitude", value: `${amplitude} mV` }],
      interpretation: "T waves appear low amplitude / flattened.",
      knowledgeDiagnosisId: null,
      label: "Flattened T Waves",
      severity: "minor",
    };
  }
  return {
    amplitudeMv: amplitude,
    classification: "normal",
    confidence: 0.8,
    evidence: [{ feature: "T wave amplitude", value: `${amplitude} mV` }],
    interpretation: "T-wave morphology within expected limits for automated analysis.",
    knowledgeDiagnosisId: null,
    label: "Normal T Waves",
    severity: "normal",
  };
}

export function interpretQWaveSection(
  measurement: EcgClinicalMeasurementResult,
  findings: ClinicalFinding[],
  lookupKnowledge: (code: string) => EcgClinicalKnowledgeEntry | null,
): QWaveSection {
  const pathologicFinding = pickFinding(findings, ["PATH_Q"]);
  const pathologic = measurement.morphology.includes("pathological_q_waves") || Boolean(pathologicFinding);
  if (pathologic && pathologicFinding) {
    const knowledge = lookupKnowledgeEntry(lookupKnowledge, "PATH_Q");
    return {
      ...sectionFromFinding(pathologicFinding, knowledge, "Pathologic Q waves detected."),
      classification: "pathologic",
      label: "Pathologic Q Waves",
      pathologic: true,
    };
  }
  return {
    classification: "physiologic",
    confidence: 0.8,
    evidence: [{ feature: "Q wave morphology", value: "No pathologic criteria met" }],
    interpretation: "No pathologic Q waves identified.",
    knowledgeDiagnosisId: null,
    label: "Physiologic Q Waves",
    pathologic: false,
    severity: "normal",
  };
}

export function interpretClinicalImpressionSection(legacy: EcgClinicalInterpretation): ClinicalImpressionSection {
  const primaryKnowledge = legacy.findings[0]?.code ? mapKnowledgeDiagnosisId(legacy.findings[0].code) : null;
  const differential = legacy.findings
    .slice(0, 5)
    .map((item) => item.label)
    .filter((label, index, array) => array.indexOf(label) === index && label !== legacy.primaryDiagnosis);

  return {
    confidence: legacy.confidence,
    differentialDiagnoses: differential,
    primaryDiagnosis: legacy.primaryDiagnosis,
    recommendations: legacy.recommendations,
    severity: legacy.severity,
    summary: legacy.report.summary,
    urgency: legacy.urgency,
  };
}
