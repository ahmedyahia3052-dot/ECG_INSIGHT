import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import type { ClinicalFinding, InterpretationCategory, InterpretationEvidence, InterpretationSeverity } from "./types";

export type { ClinicalFinding } from "./types";

function rrVariability(measurement: EcgClinicalMeasurementResult) {
  const rr = measurement.intervals.rrIntervalMs;
  return rr > 0 ? Math.abs(rr - 60000 / Math.max(measurement.heartRate, 1)) / rr : 0;
}

function hasMorphology(measurement: EcgClinicalMeasurementResult, flag: string) {
  return measurement.morphology.includes(flag as never);
}

function finding(
  category: InterpretationCategory,
  code: string,
  label: string,
  severity: InterpretationSeverity,
  confidence: number,
  triggeredBy: string[],
  evidence: InterpretationEvidence[],
): ClinicalFinding {
  return { category, code, confidence, evidence, label, severity, triggeredBy };
}

function evidence(feature: string, value: string | number): InterpretationEvidence {
  return { feature, value: String(value) };
}

export function evaluateRhythmRules(measurement: EcgClinicalMeasurementResult): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];
  const { heartRate, intervals, rhythm } = measurement;
  const regular = rhythm !== "irregular";
  const rrMs = intervals.rrIntervalMs;

  if (regular && heartRate >= 60 && heartRate <= 100 && rhythm === "sinus_rhythm") {
    findings.push(finding("rhythm", "NSR", "Normal Sinus Rhythm", "normal", 0.88, ["sinus_rhythm", "heart_rate"], [
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("Rhythm", "Regular"),
      evidence("P before QRS pattern", "Present on digitized Lead II"),
      evidence("RR interval", `${rrMs} ms`),
    ]));
  }
  if ((rhythm === "sinus_bradycardia" || (regular && heartRate < 60)) && heartRate >= 40) {
    findings.push(finding("rhythm", "SBRAD", "Sinus Bradycardia", heartRate < 50 ? "abnormal" : "minor", 0.82, ["heart_rate", "regular_rhythm"], [
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("Regular RR interval", `${rrMs} ms`),
      evidence("P before every QRS", "Suggested by sinus morphology"),
    ]));
  }
  if ((rhythm === "sinus_tachycardia" || (regular && heartRate > 100)) && heartRate < 150) {
    findings.push(finding("rhythm", "STACH", "Sinus Tachycardia", "minor", 0.8, ["heart_rate", "regular_rhythm"], [
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("Regular RR interval", `${rrMs} ms`),
      evidence("P before every QRS", "Suggested by sinus morphology"),
    ]));
  }
  if (rhythm === "irregular" && heartRate >= 90) {
    findings.push(finding("rhythm", "AF", "Atrial Fibrillation", "abnormal", 0.74, ["irregular_rhythm", "heart_rate"], [
      evidence("Rhythm", "Irregularly irregular"),
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("RR variability", `${Math.round(rrVariability(measurement) * 100)}%`),
    ]));
  }
  if (rhythm === "irregular" && heartRate >= 130 && heartRate <= 170) {
    findings.push(finding("rhythm", "AFL", "Atrial Flutter", "abnormal", 0.62, ["irregular_rhythm", "heart_rate"], [
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("Regular atrial activity pattern", "Suggested by rapid regular ventricular response"),
      evidence("Rhythm", "Irregular/regular hybrid pattern"),
    ]));
  }
  if (rhythm === "irregular" && intervals.qrsDurationMs < 120 && heartRate < 130) {
    findings.push(finding("rhythm", "PAC", "Premature Atrial Contraction", "minor", 0.58, ["irregular_rhythm", "narrow_qrs"], [
      evidence("Rhythm", "Irregular with narrow QRS beats"),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ]));
  }
  if (rhythm === "irregular" && intervals.qrsDurationMs >= 120) {
    findings.push(finding("rhythm", "PVC", "Premature Ventricular Contraction", "minor", 0.64, ["irregular_rhythm", "wide_qrs"], [
      evidence("Rhythm", "Irregular with wide QRS beats"),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ]));
  }
  if (regular && heartRate >= 150 && intervals.qrsDurationMs < 120) {
    findings.push(finding("rhythm", "SVT", "Supraventricular Tachycardia", "urgent", 0.7, ["heart_rate", "narrow_qrs"], [
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
      evidence("Regular rhythm", "Present"),
    ]));
  }
  if (regular && heartRate >= 40 && heartRate <= 60 && intervals.prIntervalMs < 120 && measurement.amplitudes.pWaveAmplitudeMv < 0.05) {
    findings.push(finding("rhythm", "JUNCTIONAL", "Junctional Rhythm", "abnormal", 0.6, ["regular_rhythm", "short_pr"], [
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("P wave amplitude", `${measurement.amplitudes.pWaveAmplitudeMv} mV`),
    ]));
  }
  if (regular && intervals.qrsDurationMs >= 120 && heartRate >= 20 && heartRate <= 60) {
    findings.push(finding("rhythm", "VENTRICULAR", "Ventricular Rhythm", "critical", 0.72, ["wide_qrs", "heart_rate"], [
      evidence("Heart Rate", `${heartRate} bpm`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
      evidence("Wide QRS morphology", "Present"),
    ]));
  }
  return findings;
}

export function evaluateConductionRules(measurement: EcgClinicalMeasurementResult): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];
  const { intervals, axis } = measurement;
  if (intervals.prIntervalMs >= 200) {
    findings.push(finding("conduction", "AVB1", "First Degree AV Block", "minor", 0.84, ["pr_interval"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("Threshold", "> 200 ms"),
    ]));
  }
  if (intervals.prIntervalMs >= 180 && measurement.rhythm === "irregular") {
    findings.push(finding("conduction", "AVB2I", "Second Degree AV Block Type I (Wenckebach pattern)", "abnormal", 0.55, ["pr_interval", "irregular_rhythm"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("Rhythm", "Irregular conduction pattern suggested"),
    ]));
  }
  if (intervals.prIntervalMs >= 200 && intervals.qrsDurationMs >= 120 && measurement.heartRate < 55) {
    findings.push(finding("conduction", "AVB2II", "Second Degree AV Block Type II", "urgent", 0.58, ["pr_interval", "bradycardia", "wide_qrs"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("Heart Rate", `${measurement.heartRate} bpm`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ]));
  }
  if (intervals.prIntervalMs >= 220 && measurement.heartRate < 45) {
    findings.push(finding("conduction", "AVB3", "Third Degree AV Block", "critical", 0.66, ["pr_interval", "bradycardia"], [
      evidence("PR interval", `${intervals.prIntervalMs} ms`),
      evidence("Heart Rate", `${measurement.heartRate} bpm`),
      evidence("AV dissociation pattern", "Suggested by extreme PR prolongation with bradycardia"),
    ]));
  }
  if (intervals.qrsDurationMs >= 120 && axis.meanQrsAxisDeg >= 0) {
    findings.push(finding("conduction", "RBBB", "Right Bundle Branch Block", "abnormal", 0.76, ["qrs_duration", "axis"], [
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
      evidence("Mean QRS axis", `${axis.meanQrsAxisDeg}°`),
      evidence("Terminal conduction delay", "Suggested by wide QRS"),
    ]));
  }
  if (intervals.qrsDurationMs >= 120 && axis.meanQrsAxisDeg < 0) {
    findings.push(finding("conduction", "LBBB", "Left Bundle Branch Block", "abnormal", 0.76, ["qrs_duration", "axis"], [
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
      evidence("Mean QRS axis", `${axis.meanQrsAxisDeg}°`),
      evidence("Broad notched QRS pattern", "Suggested by wide QRS with left axis"),
    ]));
  }
  if (axis.meanQrsAxisDeg <= -45 && axis.meanQrsAxisDeg > -90 && intervals.qrsDurationMs < 120) {
    findings.push(finding("conduction", "LAFB", "Left Anterior Fascicular Block", "minor", 0.68, ["left_axis"], [
      evidence("Frontal plane axis", `${axis.frontalPlaneAxisDeg}°`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ]));
  }
  if (axis.meanQrsAxisDeg >= 90 && axis.meanQrsAxisDeg < 180 && intervals.qrsDurationMs < 120) {
    findings.push(finding("conduction", "LPFB", "Left Posterior Fascicular Block", "abnormal", 0.62, ["right_axis"], [
      evidence("Frontal plane axis", `${axis.frontalPlaneAxisDeg}°`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ]));
  }
  return findings;
}

export function evaluateAxisRules(measurement: EcgClinicalMeasurementResult): ClinicalFinding[] {
  const axis = measurement.axis.meanQrsAxisDeg;
  const findings: ClinicalFinding[] = [];
  if (axis >= -30 && axis <= 90) {
    findings.push(finding("axis", "AXIS_NORMAL", "Normal Axis", "normal", 0.86, ["mean_qrs_axis"], [
      evidence("Mean QRS axis", `${axis}°`),
      evidence("Expected range", "-30° to +90°"),
    ]));
  }
  if (axis < -30 && axis >= -90) {
    findings.push(finding("axis", "LAD", "Left Axis Deviation", "minor", 0.8, ["mean_qrs_axis"], [
      evidence("Mean QRS axis", `${axis}°`),
      evidence("Threshold", "< -30°"),
    ]));
  }
  if (axis > 90 && axis <= 180) {
    findings.push(finding("axis", "RAD", "Right Axis Deviation", "abnormal", 0.8, ["mean_qrs_axis"], [
      evidence("Mean QRS axis", `${axis}°`),
      evidence("Threshold", "> +90°"),
    ]));
  }
  if (axis < -90 || axis > 180) {
    findings.push(finding("axis", "EXTREME_AXIS", "Extreme Axis", "abnormal", 0.72, ["mean_qrs_axis"], [
      evidence("Mean QRS axis", `${axis}°`),
      evidence("Threshold", "< -90° or > +180°"),
    ]));
  }
  return findings;
}

export function evaluateHypertrophyRules(measurement: EcgClinicalMeasurementResult): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];
  if (hasMorphology(measurement, "lvh_criteria")) {
    findings.push(finding("hypertrophy", "LVH", "Left Ventricular Hypertrophy", "abnormal", 0.74, ["lvh_criteria"], [
      evidence("Sokolow-Lyon criteria", "Met on digitized precordial leads"),
      evidence("QRS amplitude", `${measurement.amplitudes.qrsAmplitudeMv} mV`),
    ]));
  }
  if (hasMorphology(measurement, "rvh_criteria")) {
    findings.push(finding("hypertrophy", "RVH", "Right Ventricular Hypertrophy", "abnormal", 0.7, ["rvh_criteria"], [
      evidence("Right precordial dominance", "Detected"),
      evidence("QRS amplitude", `${measurement.amplitudes.qrsAmplitudeMv} mV`),
    ]));
  }
  if (measurement.intervals.pWaveDurationMs >= 120) {
    findings.push(finding("hypertrophy", "LAE", "Left Atrial Enlargement", "minor", 0.66, ["p_wave_duration"], [
      evidence("P wave duration", `${measurement.intervals.pWaveDurationMs} ms`),
      evidence("Threshold", ">= 120 ms"),
    ]));
  }
  if (measurement.amplitudes.pWaveAmplitudeMv >= 0.25) {
    findings.push(finding("hypertrophy", "RAE", "Right Atrial Enlargement", "minor", 0.62, ["p_wave_amplitude"], [
      evidence("P wave amplitude", `${measurement.amplitudes.pWaveAmplitudeMv} mV`),
      evidence("Threshold", ">= 0.25 mV"),
    ]));
  }
  return findings;
}

export function evaluateIschemiaRules(measurement: EcgClinicalMeasurementResult): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];
  const st = measurement.stDeviation;
  const stMm = measurement.amplitudes.stDeviationMm;

  if (stMm >= 1 || st >= 0.2) {
    findings.push(finding("ischemia", "STEMI", "ST-Elevation Myocardial Infarction (STEMI)", "critical", 0.78, ["st_elevation"], [
      evidence("ST deviation", `${stMm} mm`),
      evidence("STEMI threshold", ">= 1 mm in contiguous leads"),
    ]));
  }
  if (stMm <= -0.5 || st <= -0.1) {
    findings.push(finding("ischemia", "NSTEMI", "NSTEMI Pattern", "urgent", 0.72, ["st_depression"], [
      evidence("ST depression", `${stMm} mm`),
      evidence("Ischemic threshold", "<= -0.5 mm"),
    ]));
  }
  if ((stMm >= 1 || st >= 0.2) && measurement.axis.meanQrsAxisDeg >= -30 && measurement.axis.meanQrsAxisDeg <= 90) {
    findings.push(finding("ischemia", "ANT_MI", "Anterior Myocardial Infarction", "critical", 0.66, ["st_elevation", "anterior_territory"], [
      evidence("ST elevation", `${stMm} mm`),
      evidence("Territory", "Anterior (V1-V4 pattern suggested)"),
    ]));
  }
  if ((stMm >= 1 || st >= 0.2) && measurement.axis.meanQrsAxisDeg < -30) {
    findings.push(finding("ischemia", "INF_MI", "Inferior Myocardial Infarction", "critical", 0.66, ["st_elevation", "inferior_territory"], [
      evidence("ST elevation", `${stMm} mm`),
      evidence("Territory", "Inferior (II, III, aVF pattern suggested)"),
    ]));
  }
  if ((stMm >= 1 || st >= 0.2) && measurement.axis.meanQrsAxisDeg > 60) {
    findings.push(finding("ischemia", "LAT_MI", "Lateral Myocardial Infarction", "urgent", 0.64, ["st_elevation", "lateral_territory"], [
      evidence("ST elevation", `${stMm} mm`),
      evidence("Territory", "Lateral (I, aVL, V5-V6 pattern suggested)"),
    ]));
  }
  if (hasMorphology(measurement, "poor_r_progression") && stMm >= 0.5) {
    findings.push(finding("ischemia", "POST_MI", "Posterior Myocardial Infarction", "urgent", 0.58, ["reciprocal_changes", "poor_r_progression"], [
      evidence("Poor R wave progression", "Present"),
      evidence("Reciprocal ST changes", `${stMm} mm`),
    ]));
  }
  if (stMm >= 0.5 && stMm < 1) {
    findings.push(finding("ischemia", "RECIPROCAL", "Reciprocal Changes", "abnormal", 0.6, ["st_changes"], [
      evidence("ST deviation", `${stMm} mm`),
      evidence("Pattern", "Opposite-lead reciprocal change suggested"),
    ]));
  }
  if (measurement.amplitudes.tWaveAmplitudeMv >= 0.8 && stMm >= 0.5) {
    findings.push(finding("ischemia", "HYPERACUTE_T", "Hyperacute T Waves", "urgent", 0.63, ["t_wave_amplitude", "st_elevation"], [
      evidence("T wave amplitude", `${measurement.amplitudes.tWaveAmplitudeMv} mV`),
      evidence("ST deviation", `${stMm} mm`),
    ]));
  }
  if (hasMorphology(measurement, "pathological_q_waves")) {
    findings.push(finding("ischemia", "PATH_Q", "Pathological Q Waves", "abnormal", 0.76, ["pathological_q_waves"], [
      evidence("Q wave criteria", "Depth > 25% R and > 40 ms"),
      evidence("Digitized morphology flag", "Present"),
    ]));
  }
  if (stMm <= -0.5) {
    findings.push(finding("ischemia", "ST_DEP", "ST Depression", "abnormal", 0.74, ["st_depression"], [
      evidence("ST depression", `${stMm} mm`),
    ]));
  }
  if (measurement.amplitudes.tWaveAmplitudeMv > 0 && stMm <= -0.3 && measurement.amplitudes.tWaveAmplitudeMv < measurement.amplitudes.qrsAmplitudeMv * 0.4) {
    findings.push(finding("ischemia", "T_INV", "T-Wave Inversion", "abnormal", 0.61, ["t_wave_inversion"], [
      evidence("T wave amplitude", `${measurement.amplitudes.tWaveAmplitudeMv} mV`),
      evidence("ST deviation", `${stMm} mm`),
    ]));
  }
  return findings;
}

export function evaluateElectrolyteRules(measurement: EcgClinicalMeasurementResult): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];
  const { intervals, amplitudes } = measurement;
  if (amplitudes.tWaveAmplitudeMv >= 0.7 && intervals.qrsDurationMs >= 110) {
    findings.push(finding("electrolyte", "HYPERK", "Hyperkalemia Pattern", "urgent", 0.6, ["peaked_t", "wide_qrs"], [
      evidence("T wave amplitude", `${amplitudes.tWaveAmplitudeMv} mV`),
      evidence("QRS duration", `${intervals.qrsDurationMs} ms`),
    ]));
  }
  if (intervals.qtIntervalMs >= 440 && amplitudes.stDeviationMm <= 0.2) {
    findings.push(finding("electrolyte", "HYPOK", "Hypokalemia Pattern", "abnormal", 0.55, ["prolonged_qt", "st_flattening"], [
      evidence("QT interval", `${intervals.qtIntervalMs} ms`),
      evidence("ST deviation", `${amplitudes.stDeviationMm} mm`),
    ]));
  }
  if (intervals.qtcBazettMs <= 340) {
    findings.push(finding("electrolyte", "HYPERCAL", "Hypercalcemia Pattern", "minor", 0.58, ["short_qt"], [
      evidence("QTc Bazett", `${intervals.qtcBazettMs} ms`),
      evidence("Threshold", "<= 340 ms"),
    ]));
  }
  if (intervals.qtcBazettMs >= 470) {
    findings.push(finding("electrolyte", "HYPOCAL", "Hypocalcemia Pattern", "abnormal", 0.62, ["prolonged_qt"], [
      evidence("QTc Bazett", `${intervals.qtcBazettMs} ms`),
      evidence("Threshold", ">= 470 ms"),
    ]));
  }
  return findings;
}

export function evaluateAllRules(measurement: EcgClinicalMeasurementResult): ClinicalFinding[] {
  return [
    ...evaluateRhythmRules(measurement),
    ...evaluateConductionRules(measurement),
    ...evaluateAxisRules(measurement),
    ...evaluateHypertrophyRules(measurement),
    ...evaluateIschemiaRules(measurement),
    ...evaluateElectrolyteRules(measurement),
  ];
}
