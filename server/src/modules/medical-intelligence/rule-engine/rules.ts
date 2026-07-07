import type { EcgClinicalMeasurementResult } from "../../ecg-measurement/types";
import type { ClinicalSeverity, ClinicalUrgency, MedicalDiagnosisCode, RuleEvidence, RuleFinding } from "../types";

function evidence(feature: string, value: string | number, threshold?: string, met = true): RuleEvidence {
  return { feature, value: String(value), threshold, met };
}

function finding(
  code: MedicalDiagnosisCode,
  label: string,
  category: RuleFinding["category"],
  severity: ClinicalSeverity,
  urgency: ClinicalUrgency,
  ruleId: string,
  triggeredBy: string[],
  ev: RuleEvidence[],
  rawConfidence: number,
): RuleFinding {
  return { code, label, category, severity, urgency, ruleId, triggeredBy, evidence: ev, rawConfidence };
}

function hasMorphology(m: EcgClinicalMeasurementResult, flag: string) {
  return m.morphology.includes(flag as never);
}

function rrVariability(m: EcgClinicalMeasurementResult) {
  const rr = m.intervals.rrIntervalMs;
  return rr > 0 ? Math.abs(rr - 60000 / Math.max(m.heartRate, 1)) / rr : 0;
}

export function evaluateRhythmRules(m: EcgClinicalMeasurementResult): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const { heartRate, intervals, rhythm } = m;
  const regular = rhythm !== "irregular";
  const rrMs = intervals.rrIntervalMs;

  if (regular && heartRate >= 60 && heartRate <= 100 && rhythm === "sinus_rhythm") {
    findings.push(finding("NSR", "Normal Sinus Rhythm", "rhythm", "normal", "routine", "RHY-001", ["sinus_rhythm", "heart_rate"], [
      evidence("Heart Rate", `${heartRate} bpm`, "60–100 bpm"),
      evidence("Rhythm", "Regular"),
      evidence("RR interval", `${rrMs} ms`),
    ], 0.88));
  }
  if ((rhythm === "sinus_bradycardia" || (regular && heartRate < 60)) && heartRate >= 40) {
    findings.push(finding("SBRAD", "Sinus Bradycardia", "rhythm", heartRate < 50 ? "abnormal" : "minor", "routine", "RHY-002", ["heart_rate"], [
      evidence("Heart Rate", `${heartRate} bpm`, "< 60 bpm"),
      evidence("Regular RR", `${rrMs} ms`),
    ], 0.82));
  }
  if ((rhythm === "sinus_tachycardia" || (regular && heartRate > 100)) && heartRate < 150) {
    findings.push(finding("STACH", "Sinus Tachycardia", "rhythm", "minor", "routine", "RHY-003", ["heart_rate"], [
      evidence("Heart Rate", `${heartRate} bpm`, "> 100 bpm"),
    ], 0.8));
  }
  if (rhythm === "irregular" && heartRate >= 90) {
    findings.push(finding("AF", "Atrial Fibrillation", "rhythm", "abnormal", "urgent", "RHY-004", ["irregular_rhythm"], [
      evidence("Rhythm", "Irregularly irregular"),
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("RR variability", `${Math.round(rrVariability(m) * 100)}%`, "> 15%"),
    ], 0.74));
  }
  if (rhythm === "irregular" && heartRate >= 130 && heartRate <= 170) {
    findings.push(finding("AFL", "Atrial Flutter", "rhythm", "abnormal", "urgent", "RHY-005", ["irregular_rhythm", "heart_rate"], [
      evidence("Heart Rate", `${heartRate} bpm`, "130–170 bpm"),
      evidence("Regular atrial pattern", "Suggested"),
    ], 0.62));
  }
  if (rhythm === "irregular" && intervals.qrsDurationMs < 120 && heartRate < 130) {
    findings.push(finding("PAC", "Premature Atrial Contraction", "rhythm", "minor", "routine", "RHY-006", ["irregular_rhythm", "narrow_qrs"], [
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`, "< 120 ms"),
    ], 0.58));
  }
  if (rhythm === "irregular" && intervals.qrsDurationMs >= 120) {
    findings.push(finding("PVC", "Premature Ventricular Contraction", "rhythm", "minor", "routine", "RHY-007", ["irregular_rhythm", "wide_qrs"], [
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`, "≥ 120 ms"),
    ], 0.64));
  }
  if (regular && heartRate >= 150 && intervals.qrsDurationMs < 120) {
    findings.push(finding("SVT", "Supraventricular Tachycardia", "rhythm", "urgent", "urgent", "RHY-008", ["heart_rate", "narrow_qrs"], [
      evidence("Heart Rate", `${heartRate} bpm`, "≥ 150 bpm"),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ], 0.7));
  }
  if (regular && intervals.qrsDurationMs >= 120 && heartRate >= 100 && heartRate <= 250) {
    findings.push(finding("VT", "Ventricular Tachycardia", "rhythm", "critical", "critical", "RHY-009", ["wide_qrs", "tachycardia"], [
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`, "≥ 120 ms"),
    ], 0.72));
  }
  if (heartRate <= 5 && intervals.qrsDurationMs < 40) {
    findings.push(finding("VF", "Ventricular Fibrillation", "rhythm", "critical", "critical", "RHY-010", ["chaotic_rhythm"], [
      evidence("Rhythm", "Chaotic/no organized QRS"),
      evidence("Heart Rate", `${heartRate} bpm`),
    ], 0.55));
  }
  if (heartRate <= 5 && intervals.qrsDurationMs >= 40) {
    findings.push(finding("ASYSTOLE", "Asystole", "rhythm", "critical", "critical", "RHY-011", ["flat_line"], [
      evidence("Heart Rate", `${heartRate} bpm`, "≤ 5 bpm"),
      evidence("QRS", "Absent or minimal"),
    ], 0.5));
  }
  if (heartRate >= 20 && heartRate <= 60 && intervals.qrsDurationMs >= 120 && regular) {
    findings.push(finding("PEA", "Pulseless Electrical Activity", "rhythm", "critical", "critical", "RHY-012", ["organized_no_pulse"], [
      evidence("Organized rhythm", "Present"),
      evidence("Heart Rate", `${heartRate} bpm`),
    ], 0.45));
  }
  return findings;
}

export function evaluateConductionRules(m: EcgClinicalMeasurementResult): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const { intervals, axis } = m;

  if (intervals.prIntervalMs >= 200) {
    findings.push(finding("AVB1", "First Degree AV Block", "conduction", "minor", "routine", "CON-001", ["pr_interval"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`, "> 200 ms"),
    ], 0.84));
  }
  if (intervals.prIntervalMs >= 180 && m.rhythm === "irregular") {
    findings.push(finding("AVB2I", "Second Degree AV Block Type I", "conduction", "abnormal", "urgent", "CON-002", ["pr_interval", "irregular"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("Rhythm", "Irregular (Wenckebach pattern suggested)"),
    ], 0.55));
  }
  if (intervals.prIntervalMs >= 200 && intervals.qrsDurationMs >= 120 && m.heartRate < 55) {
    findings.push(finding("AVB2II", "Second Degree AV Block Type II", "conduction", "urgent", "urgent", "CON-003", ["pr_interval", "wide_qrs"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ], 0.58));
  }
  if (intervals.prIntervalMs >= 220 && m.heartRate < 45) {
    findings.push(finding("AVB3", "Third Degree AV Block", "conduction", "critical", "critical", "CON-004", ["pr_interval", "bradycardia"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("Heart Rate", `${m.heartRate} bpm`, "< 45 bpm"),
    ], 0.66));
  }
  if (intervals.qrsDurationMs >= 120 && axis.meanQrsAxisDeg >= 0) {
    findings.push(finding("RBBB", "Right Bundle Branch Block", "conduction", "abnormal", "routine", "CON-005", ["qrs_duration", "axis"], [
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`, "≥ 120 ms"),
      evidence("Mean QRS axis", `${axis.meanQrsAxisDeg}°`),
    ], 0.76));
  }
  if (intervals.qrsDurationMs >= 120 && axis.meanQrsAxisDeg < 0) {
    findings.push(finding("LBBB", "Left Bundle Branch Block", "conduction", "abnormal", "routine", "CON-006", ["qrs_duration", "axis"], [
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
      evidence("Mean QRS axis", `${axis.meanQrsAxisDeg}°`),
    ], 0.76));
  }
  if (intervals.qrsDurationMs >= 120 && axis.meanQrsAxisDeg <= -45 && axis.meanQrsAxisDeg > -90) {
    findings.push(finding("BIFASC", "Bifascicular Block", "conduction", "abnormal", "urgent", "CON-007", ["bbb", "left_axis"], [
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
      evidence("Axis", `${axis.meanQrsAxisDeg}°`, "LAD pattern"),
    ], 0.68));
  }
  if (intervals.qrsDurationMs >= 120 && intervals.prIntervalMs >= 200 && (axis.meanQrsAxisDeg <= -45 || axis.meanQrsAxisDeg >= 90)) {
    findings.push(finding("TRIFASC", "Trifascicular Block", "conduction", "urgent", "urgent", "CON-008", ["bbb", "av_block"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
      evidence("Axis", `${axis.meanQrsAxisDeg}°`),
    ], 0.6));
  }
  if (intervals.prIntervalMs < 120 && intervals.qrsDurationMs >= 110 && m.amplitudes.pWaveAmplitudeMv < 0.1) {
    findings.push(finding("WPW", "Wolff-Parkinson-White Syndrome", "conduction", "abnormal", "urgent", "CON-009", ["short_pr", "wide_qrs"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`, "< 120 ms"),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ], 0.55));
  }
  return findings;
}

export function evaluateIschemiaRules(m: EcgClinicalMeasurementResult): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const stMm = m.amplitudes.stDeviationMm;

  if (stMm >= 1 || m.stDeviation >= 0.2) {
    findings.push(finding("STEMI", "ST-Elevation Myocardial Infarction", "ischemia", "critical", "critical", "ISC-001", ["st_elevation"], [
      evidence("ST deviation", `${stMm} mm`, "≥ 1 mm"),
    ], 0.78));
  }
  if (stMm <= -0.5 || m.stDeviation <= -0.1) {
    findings.push(finding("NSTEMI", "Non-ST-Elevation Myocardial Infarction", "ischemia", "urgent", "urgent", "ISC-002", ["st_depression"], [
      evidence("ST depression", `${stMm} mm`, "≤ -0.5 mm"),
    ], 0.72));
  }
  if (stMm >= 0.5 && stMm < 1 && m.amplitudes.tWaveAmplitudeMv >= 0.3) {
    findings.push(finding("EARLY_REPOL", "Early Repolarization", "other", "normal", "routine", "ISC-003", ["j_point_elevation"], [
      evidence("ST deviation", `${stMm} mm`, "0.5–1 mm concave"),
      evidence("T wave", `${m.amplitudes.tWaveAmplitudeMv} mV`),
    ], 0.65));
  }
  if (stMm >= 0.5 && m.amplitudes.tWaveAmplitudeMv >= 0.5 && stMm < 1) {
    findings.push(finding("PERICARDITIS", "Pericarditis", "other", "abnormal", "urgent", "ISC-004", ["diffuse_st_elevation"], [
      evidence("ST elevation", `${stMm} mm`, "Diffuse concave"),
      evidence("PR depression", "Suggested"),
    ], 0.58));
  }
  return findings;
}

export function evaluateElectrolyteRules(m: EcgClinicalMeasurementResult): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const { intervals, amplitudes } = m;

  if (amplitudes.tWaveAmplitudeMv >= 0.7 && intervals.qrsDurationMs >= 110) {
    findings.push(finding("HYPERK", "Hyperkalemia", "electrolyte", "urgent", "urgent", "ELE-001", ["peaked_t", "wide_qrs"], [
      evidence("T wave amplitude", `${amplitudes.tWaveAmplitudeMv} mV`, "≥ 0.7 mV"),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ], 0.6));
  }
  if (intervals.qtIntervalMs >= 440 && amplitudes.stDeviationMm <= 0.2) {
    findings.push(finding("HYPOK", "Hypokalemia", "electrolyte", "abnormal", "urgent", "ELE-002", ["prolonged_qt", "st_flattening"], [
      evidence("QT interval", `${intervals.qtIntervalMs} ms`),
      evidence("ST deviation", `${amplitudes.stDeviationMm} mm`),
    ], 0.55));
  }
  if (intervals.qtcBazettMs >= 470) {
    findings.push(finding("LONG_QT", "Long QT Syndrome", "channelopathy", "urgent", "urgent", "ELE-003", ["prolonged_qtc"], [
      evidence("QTc Bazett", `${intervals.qtcBazettMs} ms`, "> 470 ms"),
    ], 0.7));
  }
  if (intervals.qtcBazettMs <= 340) {
    findings.push(finding("SHORT_QT", "Short QT Syndrome", "channelopathy", "abnormal", "urgent", "ELE-004", ["short_qtc"], [
      evidence("QTc Bazett", `${intervals.qtcBazettMs} ms`, "≤ 340 ms"),
    ], 0.55));
  }
  if (intervals.qtcBazettMs >= 470 && amplitudes.tWaveAmplitudeMv < 0.5) {
    findings.push(finding("HYPOCAL", "Hypocalcemia", "electrolyte", "abnormal", "routine", "ELE-005", ["prolonged_qt"], [
      evidence("QTc Bazett", `${intervals.qtcBazettMs} ms`),
    ], 0.62));
  }
  if (amplitudes.tWaveAmplitudeMv >= 0.7 || intervals.qtcBazettMs >= 470 || intervals.qrsDurationMs >= 110) {
    findings.push(finding("ELECTROLYTE", "Electrolyte Disorder (Pattern)", "electrolyte", "abnormal", "urgent", "ELE-006", ["electrolyte_pattern"], [
      evidence("Pattern", "Consistent with electrolyte disturbance"),
    ], 0.45));
  }
  return findings;
}

export function evaluateHypertrophyRules(m: EcgClinicalMeasurementResult): RuleFinding[] {
  const findings: RuleFinding[] = [];

  if (hasMorphology(m, "lvh_criteria")) {
    findings.push(finding("LVH", "Left Ventricular Hypertrophy", "hypertrophy", "abnormal", "routine", "HYP-001", ["lvh_criteria"], [
      evidence("Sokolow-Lyon", "Criteria met"),
      evidence("QRS amplitude", `${m.amplitudes.qrsAmplitudeMv} mV`),
    ], 0.74));
  }
  if (hasMorphology(m, "rvh_criteria")) {
    findings.push(finding("RVH", "Right Ventricular Hypertrophy", "hypertrophy", "abnormal", "urgent", "HYP-002", ["rvh_criteria"], [
      evidence("RVH criteria", "Met"),
    ], 0.7));
  }
  if (hasMorphology(m, "lvh_criteria") || hasMorphology(m, "rvh_criteria")) {
    findings.push(finding("HYPERTROPHY", "Hypertrophy (Unspecified)", "hypertrophy", "abnormal", "routine", "HYP-003", ["hypertrophy"], [
      evidence("Voltage criteria", "Met"),
    ], 0.65));
  }
  return findings;
}

export function evaluateSpecialRules(m: EcgClinicalMeasurementResult): RuleFinding[] {
  const findings: RuleFinding[] = [];

  if (m.heartRate >= 100 && m.axis.meanQrsAxisDeg > 90 && hasMorphology(m, "wide_qrs")) {
    findings.push(finding("PE", "Pulmonary Embolism", "other", "urgent", "emergent", "SPC-001", ["rv_strain"], [
      evidence("Heart Rate", `${m.heartRate} bpm`),
      evidence("Axis", `${m.axis.meanQrsAxisDeg}°`, "RAD"),
    ], 0.52));
  }
  if (m.amplitudes.stDeviationMm >= 2 && m.amplitudes.tWaveAmplitudeMv < 0.2) {
    findings.push(finding("BRUGADA", "Brugada Syndrome", "channelopathy", "urgent", "urgent", "SPC-002", ["coved_st"], [
      evidence("ST elevation V1-V3", `${m.amplitudes.stDeviationMm} mm`),
    ], 0.48));
  }
  if (m.heartRate >= 60 && m.heartRate <= 100 && m.intervals.qrsDurationMs >= 120 && m.amplitudes.pWaveAmplitudeMv < 0.05) {
    findings.push(finding("PACEMAKER", "Pacemaker Rhythm", "other", "minor", "routine", "SPC-003", ["pacing_spike"], [
      evidence("Pacing pattern", "Suggested by wide QRS without P waves"),
    ], 0.4));
  }
  return findings;
}

export function evaluateAllMedicalRules(m: EcgClinicalMeasurementResult): RuleFinding[] {
  return [
    ...evaluateRhythmRules(m),
    ...evaluateConductionRules(m),
    ...evaluateIschemiaRules(m),
    ...evaluateElectrolyteRules(m),
    ...evaluateHypertrophyRules(m),
    ...evaluateSpecialRules(m),
  ];
}

export function listRuleDefinitions() {
  return [
    { ruleId: "RHY-001", category: "rhythm", description: "Normal sinus rhythm criteria" },
    { ruleId: "RHY-002", category: "rhythm", description: "Sinus bradycardia" },
    { ruleId: "RHY-003", category: "rhythm", description: "Sinus tachycardia" },
    { ruleId: "RHY-004", category: "rhythm", description: "Atrial fibrillation pattern" },
    { ruleId: "RHY-005", category: "rhythm", description: "Atrial flutter pattern" },
    { ruleId: "RHY-006", category: "rhythm", description: "Premature atrial contraction" },
    { ruleId: "RHY-007", category: "rhythm", description: "Premature ventricular contraction" },
    { ruleId: "RHY-008", category: "rhythm", description: "Supraventricular tachycardia" },
    { ruleId: "RHY-009", category: "rhythm", description: "Ventricular tachycardia" },
    { ruleId: "RHY-010", category: "rhythm", description: "Ventricular fibrillation" },
    { ruleId: "RHY-011", category: "rhythm", description: "Asystole" },
    { ruleId: "RHY-012", category: "rhythm", description: "Pulseless electrical activity" },
    { ruleId: "CON-001", category: "conduction", description: "First degree AV block" },
    { ruleId: "CON-002", category: "conduction", description: "Second degree AV block Type I" },
    { ruleId: "CON-003", category: "conduction", description: "Second degree AV block Type II" },
    { ruleId: "CON-004", category: "conduction", description: "Third degree AV block" },
    { ruleId: "CON-005", category: "conduction", description: "Right bundle branch block" },
    { ruleId: "CON-006", category: "conduction", description: "Left bundle branch block" },
    { ruleId: "CON-007", category: "conduction", description: "Bifascicular block" },
    { ruleId: "CON-008", category: "conduction", description: "Trifascicular block" },
    { ruleId: "CON-009", category: "conduction", description: "Wolff-Parkinson-White pattern" },
    { ruleId: "ISC-001", category: "ischemia", description: "STEMI criteria" },
    { ruleId: "ISC-002", category: "ischemia", description: "NSTEMI pattern" },
    { ruleId: "ISC-003", category: "ischemia", description: "Early repolarization" },
    { ruleId: "ISC-004", category: "ischemia", description: "Pericarditis pattern" },
    { ruleId: "ELE-001", category: "electrolyte", description: "Hyperkalemia pattern" },
    { ruleId: "ELE-002", category: "electrolyte", description: "Hypokalemia pattern" },
    { ruleId: "ELE-003", category: "electrolyte", description: "Long QT" },
    { ruleId: "ELE-004", category: "electrolyte", description: "Short QT" },
    { ruleId: "ELE-005", category: "electrolyte", description: "Hypocalcemia pattern" },
    { ruleId: "ELE-006", category: "electrolyte", description: "General electrolyte disorder" },
    { ruleId: "HYP-001", category: "hypertrophy", description: "Left ventricular hypertrophy" },
    { ruleId: "HYP-002", category: "hypertrophy", description: "Right ventricular hypertrophy" },
    { ruleId: "HYP-003", category: "hypertrophy", description: "Unspecified hypertrophy" },
    { ruleId: "SPC-001", category: "other", description: "Pulmonary embolism pattern" },
    { ruleId: "SPC-002", category: "other", description: "Brugada pattern" },
    { ruleId: "SPC-003", category: "other", description: "Pacemaker rhythm" },
  ];
}
