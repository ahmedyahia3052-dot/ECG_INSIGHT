import type { ClinicalDiagnosis, DiagnosticCertainty, EnterpriseMeasurementBundle, MorphologyClass, RhythmResult } from "../types";

function certaintyFromConfidence(confidence: number): DiagnosticCertainty {
  if (confidence >= 0.85) return "definite";
  if (confidence >= 0.7) return "probable";
  if (confidence >= 0.55) return "possible";
  return "uncertain";
}

function diagnosis(
  category: ClinicalDiagnosis["category"],
  code: string,
  label: string,
  confidence: number,
  reason: string,
  supporting: string[],
  contradicting: string[],
  measurements: string[],
): ClinicalDiagnosis {
  return {
    category,
    certainty: certaintyFromConfidence(confidence),
    code,
    confidence: Number(confidence.toFixed(3)),
    contradictingEvidence: contradicting,
    label,
    measurements,
    reason,
    supportingEvidence: supporting,
  };
}

export function evaluateClinicalRules(
  measurements: EnterpriseMeasurementBundle,
  rhythm: RhythmResult,
  morphology: MorphologyClass[],
): ClinicalDiagnosis[] {
  const findings: ClinicalDiagnosis[] = [];

  if (measurements.prIntervalMs > 200) {
    findings.push(diagnosis(
      "conduction",
      "AVB1",
      "First Degree AV Block",
      0.84,
      "PR interval exceeds 200 ms threshold for first-degree AV block.",
      [`PR interval = ${measurements.prIntervalMs} ms (> 200 ms)`],
      measurements.prIntervalMs <= 200 ? ["PR within normal range on repeat beat"] : [],
      ["prIntervalMs"],
    ));
  }

  if (measurements.qrsDurationMs > 120) {
    findings.push(diagnosis(
      "conduction",
      "BBB",
      "Bundle Branch Block / Intraventricular Conduction Delay",
      0.8,
      "QRS duration exceeds 120 ms indicating conduction delay.",
      [
        `QRS duration = ${measurements.qrsDurationMs} ms (> 120 ms)`,
        ...measurements.bundleBranchIndicators.map((item) => `Pattern: ${item}`),
      ],
      [],
      ["qrsDurationMs", "bundleBranchIndicators"],
    ));
  }

  if (measurements.qtcBazettMs > 470) {
    findings.push(diagnosis(
      "interval",
      "LQT",
      "Long QT Syndrome Pattern",
      0.78,
      "Corrected QT interval (Bazett) exceeds prolonged threshold.",
      [`QTc Bazett = ${measurements.qtcBazettMs} ms (> 470 ms)`, `QT = ${measurements.qtIntervalMs} ms`],
      [],
      ["qtcBazettMs", "qtIntervalMs"],
    ));
  }

  if (measurements.qtcBazettMs > 0 && measurements.qtcBazettMs < 350) {
    findings.push(diagnosis(
      "interval",
      "SQT",
      "Short QT Pattern",
      0.72,
      "Corrected QT interval below short QT threshold.",
      [`QTc Bazett = ${measurements.qtcBazettMs} ms (< 350 ms)`],
      [],
      ["qtcBazettMs"],
    ));
  }

  if (measurements.stElevationMm > 1) {
    findings.push(diagnosis(
      "ischemia",
      "STEMI",
      "Possible STEMI",
      0.75,
      "ST elevation exceeds 1 mm criterion in analyzed leads.",
      [`ST elevation = ${measurements.stElevationMm} mm (> 1 mm)`, `J point deviation = ${measurements.jPointMm} mm`],
      measurements.stDepressionMm > 0.5 ? [`Concurrent ST depression ${measurements.stDepressionMm} mm`] : [],
      ["stElevationMm", "jPointMm"],
    ));
  }

  if (measurements.stDepressionMm > 0.5) {
    findings.push(diagnosis(
      "ischemia",
      "ISCHEMIA",
      "Possible Ischemia",
      0.7,
      "ST depression exceeds ischemia threshold.",
      [`ST depression = ${measurements.stDepressionMm} mm`],
      [],
      ["stDepressionMm"],
    ));
  }

  if (Math.abs(measurements.qrsAxisDeg) > 90) {
    findings.push(diagnosis(
      "axis",
      "AXIS_DEV",
      "QRS Axis Deviation",
      0.74,
      "Mean QRS axis outside normal frontal plane range.",
      [`QRS axis = ${measurements.qrsAxisDeg}°`],
      Math.abs(measurements.qrsAxisDeg) <= 90 ? ["Axis within normal on adjacent beats"] : [],
      ["qrsAxisDeg"],
    ));
  }

  if (measurements.lvhVoltageCriteria) {
    findings.push(diagnosis(
      "hypertrophy",
      "LVH",
      "Left Ventricular Hypertrophy Voltage Criteria",
      0.68,
      "Combined precordial and V1 S-wave voltage meets LVH criteria.",
      ["S-V1 + max(R-V5/V6) > 3.5 mV equivalent"],
      [],
      ["lvhVoltageCriteria"],
    ));
  }

  if (measurements.rvhVoltageCriteria) {
    findings.push(diagnosis(
      "hypertrophy",
      "RVH",
      "Right Ventricular Hypertrophy Voltage Criteria",
      0.65,
      "Dominant R wave in V1 suggests RVH pattern.",
      ["R wave amplitude in V1 elevated"],
      [],
      ["rvhVoltageCriteria"],
    ));
  }

  if (morphology.includes("voltage_abnormality")) {
    findings.push(diagnosis(
      "morphology",
      "LOWV",
      "Low Voltage",
      0.7,
      "Limb lead QRS amplitudes below low-voltage threshold.",
      [`Composite voltage = ${measurements.voltageMv} mV`],
      [],
      ["voltageMv"],
    ));
  }

  if (morphology.includes("pathological_q")) {
    findings.push(diagnosis(
      "morphology",
      "PATHQ",
      "Pathological Q Waves",
      0.72,
      "Q wave depth exceeds 25% of R amplitude in territorial leads.",
      ["Pathological Q pattern detected in limb or precordial leads"],
      [],
      ["qrsAmplitudeMv"],
    ));
  }

  const rhythmLabels: Record<string, { code: string; label: string; category: ClinicalDiagnosis["category"] }> = {
    atrial_fibrillation: { category: "rhythm", code: "AF", label: "Atrial Fibrillation" },
    atrial_flutter: { category: "rhythm", code: "AFL", label: "Atrial Flutter" },
    bigeminy: { category: "rhythm", code: "BIGEM", label: "Ventricular Bigeminy" },
    escape_rhythm: { category: "rhythm", code: "ESCAPE", label: "Escape Rhythm" },
    first_degree_av_block: { category: "conduction", code: "AVB1", label: "First Degree AV Block" },
    heart_block: { category: "conduction", code: "AVB", label: "Heart Block" },
    junctional_rhythm: { category: "rhythm", code: "JUNCTIONAL", label: "Junctional Rhythm" },
    normal_sinus_rhythm: { category: "rhythm", code: "NSR", label: "Normal Sinus Rhythm" },
    premature_atrial_contraction: { category: "rhythm", code: "PAC", label: "Premature Atrial Contraction" },
    premature_ventricular_contraction: { category: "rhythm", code: "PVC", label: "Premature Ventricular Contraction" },
    second_degree_av_block: { category: "conduction", code: "AVB2", label: "Second Degree AV Block" },
    sinus_bradycardia: { category: "rhythm", code: "SBRAD", label: "Sinus Bradycardia" },
    sinus_tachycardia: { category: "rhythm", code: "STACH", label: "Sinus Tachycardia" },
    supraventricular_tachycardia: { category: "rhythm", code: "SVT", label: "Supraventricular Tachycardia" },
    third_degree_av_block: { category: "conduction", code: "AVB3", label: "Third Degree AV Block" },
    trigeminy: { category: "rhythm", code: "TRIGEM", label: "Ventricular Trigeminy" },
    unknown_rhythm: { category: "rhythm", code: "UNK", label: "Unknown Rhythm" },
    ventricular_fibrillation: { category: "rhythm", code: "VF", label: "Ventricular Fibrillation" },
    ventricular_tachycardia: { category: "rhythm", code: "VT", label: "Ventricular Tachycardia" },
  };

  const rhythmMeta = rhythmLabels[rhythm.classification];
  if (rhythmMeta) {
    findings.push(diagnosis(
      rhythmMeta.category,
      rhythmMeta.code,
      rhythmMeta.label,
      rhythm.confidence,
      `Rhythm engine classified ${rhythmMeta.label} from RR variability, rate, and QRS morphology.`,
      rhythm.evidence.map((item) => `${item.feature} = ${item.value}`),
      [],
      Object.keys(rhythm.supportingMeasurements),
    ));
  }

  return findings;
}

export function toStructuredFindings(findings: ClinicalDiagnosis[]): import("../types").StructuredClinicalFinding[] {
  const severityMap: Record<ClinicalDiagnosis["category"], import("../types").StructuredClinicalFinding["severity"]> = {
    axis: "minor",
    conduction: "abnormal",
    hypertrophy: "abnormal",
    interval: "abnormal",
    ischemia: "urgent",
    morphology: "minor",
    rhythm: "abnormal",
  };
  const urgentCodes = new Set(["STEMI", "VT", "VF", "AVB3"]);
  const criticalCodes = new Set(["VF"]);
  return findings.map((item) => ({
    code: item.code,
    confidence: item.confidence,
    evidence: item.supportingEvidence,
    label: item.label,
    measurementsReferenced: item.measurements,
    severity: criticalCodes.has(item.code)
      ? "critical"
      : urgentCodes.has(item.code)
        ? "urgent"
        : item.code === "NSR"
          ? "normal"
          : severityMap[item.category],
  }));
}
