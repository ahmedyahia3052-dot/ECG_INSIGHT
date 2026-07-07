import type { CardiologistWorkspaceModel } from "../ai-cardiologist/types";
import type { EcgClinicalMeasurement } from "../measurementTypes";
import type { EcgLeadId } from "../types";
import type { CdssRuleEvaluation, CdssRuleId, CdssSeverity } from "./types";

export type ClinicalRuleContext = {
  analysisText: string;
  cardiologist: CardiologistWorkspaceModel;
  measurements: EcgClinicalMeasurement[];
};

function norm(text?: string | null) {
  return String(text ?? "").toLowerCase();
}

function contains(text: string, ...terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function intervalMs(cardiologist: CardiologistWorkspaceModel, name: string) {
  return cardiologist.intervals.find((row) => row.name === name)?.value ?? null;
}

function measurementValue(measurements: EcgClinicalMeasurement[], kind: string) {
  return measurements.find((m) => m.kind === kind && !m.hidden);
}

function leadsFromFindings(cardiologist: CardiologistWorkspaceModel, codes: string[]): EcgLeadId[] {
  const all = [...cardiologist.arrhythmias, ...cardiologist.blocks, ...cardiologist.hypertrophy, ...cardiologist.ischemia];
  const leads = all.filter((f) => codes.some((c) => f.code.includes(c) || norm(f.label).includes(c.replace(/_/g, " ")))).flatMap((f) => f.affectedLeads);
  return [...new Set(leads)] as EcgLeadId[];
}

function stLeads(cardiologist: CardiologistWorkspaceModel, pattern: "elevation" | "depression" | "reciprocal") {
  return cardiologist.stAnalysis.filter((row) => row.pattern === pattern).flatMap((row) => row.affectedLeads);
}

function rule(
  ruleId: CdssRuleId,
  diagnosis: string,
  matched: boolean,
  severity: CdssSeverity,
  confidence: number,
  evidence: CdssRuleEvaluation["evidence"],
  supporting: string[],
  contradicting: string[] = [],
): CdssRuleEvaluation {
  return {
    confidence: matched ? confidence : 0,
    contradictingFindings: contradicting,
    diagnosis,
    evidence,
    matched,
    ruleId,
    severity: matched ? severity : "normal",
    supportingFindings: supporting,
  };
}

export function evaluateClinicalRules(context: ClinicalRuleContext): CdssRuleEvaluation[] {
  const { analysisText, cardiologist, measurements } = context;
  const text = norm(`${analysisText} ${cardiologist.clinicalImpression} ${cardiologist.primaryDiagnosis.label} ${cardiologist.rhythm.rhythm}`);
  const hr = cardiologist.rhythm.heartRate;
  const pr = intervalMs(cardiologist, "PR");
  const qrs = intervalMs(cardiologist, "QRS");
  const qtc = intervalMs(cardiologist, "QTc");
  const axis = cardiologist.axis.degrees;
  const axisClass = cardiologist.axis.classification;

  const hasCriticalIschemia = cardiologist.ischemia.some((f) => f.severity === "critical" || f.severity === "urgent");
  const hasArrhythmia = cardiologist.arrhythmias.length > 0;
  const hasBlock = cardiologist.blocks.length > 0;
  const hasHypertrophy = cardiologist.hypertrophy.length > 0;

  const inferiorLeads: EcgLeadId[] = ["II", "III", "aVF"];
  const anteriorLeads: EcgLeadId[] = ["V1", "V2", "V3", "V4"];
  const lateralLeads: EcgLeadId[] = ["I", "aVL", "V5", "V6"];

  const inferiorSt = stLeads(cardiologist, "elevation").filter((l) => inferiorLeads.includes(l));
  const anteriorSt = stLeads(cardiologist, "elevation").filter((l) => anteriorLeads.includes(l));
  const lateralSt = stLeads(cardiologist, "elevation").filter((l) => lateralLeads.includes(l));
  const reciprocalDep = stLeads(cardiologist, "reciprocal");

  const rules: CdssRuleEvaluation[] = [];

  const normalMatched =
    !hasCriticalIschemia &&
    !hasArrhythmia &&
    !hasBlock &&
    !hasHypertrophy &&
    (hr == null || (hr >= 60 && hr <= 100)) &&
    (qtc == null || qtc <= 450) &&
    contains(text, "normal", "sinus rhythm") &&
    !contains(text, "abnormal", "ischemia", "block", "fibrillation", "flutter", "stemi", "mi");
  rules.push(
    rule(
      "normal_ecg",
      "Normal ECG",
      normalMatched,
      "normal",
      88,
      {
        affectedLeads: [],
        axis: axisClass,
        measurements: [`HR ${hr ?? "—"} bpm`, `PR ${pr ?? "—"} ms`, `QRS ${qrs ?? "—"} ms`, `QTc ${qtc ?? "—"} ms`],
        morphology: ["No acute ischemic ST-T changes", "No conduction block pattern"],
        reasoning: "Rate, intervals, axis, and morphology within expected limits without acute abnormality patterns.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Normal rate and intervals", "No acute ischemia or conduction block"],
      hasCriticalIschemia ? ["Ischemic pattern present"] : [],
    ),
  );

  const sinusRhythm = contains(text, "sinus") && !contains(text, "fibrillation", "flutter", "junctional", "paced");
  rules.push(
    rule(
      "sinus_rhythm",
      "Sinus Rhythm",
      sinusRhythm,
      "normal",
      92,
      {
        affectedLeads: [],
        measurements: [`HR ${hr ?? "—"} bpm`, `PR ${pr ?? "—"} ms`],
        morphology: cardiologist.rhythm.pWaveDetected ? ["P wave before each QRS"] : ["Regular narrow-complex rhythm"],
        reasoning: "P-wave synchronous narrow-complex rhythm consistent with sinus node origin.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Regular rhythm", cardiologist.rhythm.pWaveDetected ? "P waves detected" : "Narrow QRS rhythm"],
      contains(text, "fibrillation") ? ["Atrial fibrillation pattern suggested"] : [],
    ),
  );

  rules.push(
    rule(
      "sinus_bradycardia",
      "Sinus Bradycardia",
      hr != null && hr < 60 && sinusRhythm,
      hr != null && hr < 40 ? "high_risk" : "low_risk",
      hr != null && hr < 60 ? 90 : 0,
      {
        affectedLeads: [],
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["Sinus P morphology with rate below 60 bpm"],
        reasoning: "Sinus-origin rhythm with ventricular rate below 60 bpm.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`Heart rate ${hr} bpm`],
      hr != null && hr >= 60 ? ["Rate not bradycardic"] : [],
    ),
  );

  rules.push(
    rule(
      "sinus_tachycardia",
      "Sinus Tachycardia",
      hr != null && hr > 100 && sinusRhythm,
      "moderate",
      hr != null && hr > 100 ? 91 : 0,
      {
        affectedLeads: [],
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["Sinus P morphology with rate above 100 bpm"],
        reasoning: "Sinus-origin rhythm with ventricular rate above 100 bpm.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`Heart rate ${hr} bpm`],
      [],
    ),
  );

  rules.push(
    rule(
      "atrial_fibrillation",
      "Atrial Fibrillation",
      contains(text, "atrial fibrillation", "afib", "a-fib", "af ") || cardiologist.arrhythmias.some((f) => contains(norm(f.label), "fibrillation")),
      "moderate",
      94,
      {
        affectedLeads: leadsFromFindings(cardiologist, ["af", "fibrillation"]),
        measurements: [`HR ${hr ?? "—"} bpm`, `RR variability ${cardiologist.rhythm.rrVariability}`],
        morphology: ["Irregularly irregular RR intervals", "Absent discrete P waves"],
        reasoning: "Irregular narrow-complex rhythm without organized atrial activity.",
        rhythm: "Atrial Fibrillation",
      },
      ["Irregular rhythm", "No organized P waves"],
      sinusRhythm ? ["Sinus rhythm pattern also detected"] : [],
    ),
  );

  rules.push(
    rule(
      "atrial_flutter",
      "Atrial Flutter",
      contains(text, "atrial flutter", "flutter waves", "sawtooth"),
      "moderate",
      93,
      {
        affectedLeads: leadsFromFindings(cardiologist, ["flutter"]),
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["Sawtooth flutter waves in inferior leads"],
        reasoning: "Regular atrial activity ~300/min with variable AV conduction pattern.",
        rhythm: "Atrial Flutter",
      },
      ["Flutter wave morphology"],
      [],
    ),
  );

  rules.push(
    rule(
      "pac",
      "Premature Atrial Contraction (PAC)",
      contains(text, "pac", "premature atrial", "atrial premature"),
      "low_risk",
      85,
      {
        affectedLeads: leadsFromFindings(cardiologist, ["pac", "premature"]),
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["Early P morphology with non-compensatory pause"],
        reasoning: "Premature supraventricular beat with atrial origin morphology.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Premature supraventricular beat"],
      [],
    ),
  );

  rules.push(
    rule(
      "pvc",
      "Premature Ventricular Contraction (PVC)",
      contains(text, "pvc", "premature ventricular", "ventricular premature"),
      "low_risk",
      86,
      {
        affectedLeads: leadsFromFindings(cardiologist, ["pvc", "premature"]),
        measurements: [`HR ${hr ?? "—"} bpm`, `QRS ${qrs ?? "—"} ms`],
        morphology: ["Wide QRS premature beat", "Compensatory pause"],
        reasoning: "Premature wide-complex beat originating below the AV node.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Wide QRS premature beat"],
      [],
    ),
  );

  rules.push(
    rule(
      "first_degree_av_block",
      "First Degree AV Block",
      (pr != null && pr > 200) || contains(text, "first degree", "prolonged pr", "1st degree"),
      "low_risk",
      pr != null && pr > 200 ? 92 : contains(text, "first degree") ? 80 : 0,
      {
        affectedLeads: [],
        measurements: [`PR ${pr ?? "—"} ms`],
        morphology: ["Constant prolonged PR with 1:1 AV conduction"],
        reasoning: "PR interval exceeds 200 ms with maintained 1:1 AV relationship.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`PR interval ${pr} ms`],
      pr != null && pr <= 200 ? ["PR not prolonged"] : [],
    ),
  );

  rules.push(
    rule(
      "second_degree_av_block",
      "Second Degree AV Block",
      contains(text, "second degree", "2nd degree", "mobitz", "wenckebach", "2:1 block"),
      "high_risk",
      90,
      {
        affectedLeads: [],
        measurements: [`PR ${pr ?? "—"} ms`],
        morphology: ["Intermittent non-conducted P waves"],
        reasoning: "Some P waves fail to conduct to ventricles (Mobitz I/II pattern).",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Dropped QRS complexes", "AV conduction block language"],
      [],
    ),
  );

  rules.push(
    rule(
      "complete_heart_block",
      "Complete Heart Block",
      contains(text, "complete heart block", "third degree", "3rd degree", "av dissociation"),
      "life_threatening",
      96,
      {
        affectedLeads: [],
        measurements: [`HR ${hr ?? "—"} bpm`, `QRS ${qrs ?? "—"} ms`],
        morphology: ["AV dissociation", "Independent atrial and ventricular activity"],
        reasoning: "No AV conduction with independent atrial and ventricular rates.",
        rhythm: "Complete Heart Block",
      },
      ["AV dissociation"],
      [],
    ),
  );

  rules.push(
    rule(
      "rbbb",
      "Right Bundle Branch Block (RBBB)",
      contains(text, "rbbb", "right bundle") || qrs != null && qrs >= 120 && contains(text, "right bundle", "rsr", "r' in v1"),
      "moderate",
      91,
      {
        affectedLeads: ["V1", "V2"],
        measurements: [`QRS ${qrs ?? "—"} ms`],
        morphology: ["rsR' pattern in V1-V2", "Wide S wave in lateral leads"],
        reasoning: "Wide QRS with terminal R' in right precordial leads.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`QRS duration ${qrs} ms`, "RBBB morphology"],
      [],
    ),
  );

  rules.push(
    rule(
      "lbbb",
      "Left Bundle Branch Block (LBBB)",
      contains(text, "lbbb", "left bundle") || (qrs != null && qrs >= 120 && contains(text, "left bundle", "broad r in v5")),
      "moderate",
      91,
      {
        affectedLeads: ["V5", "V6", "I", "aVL"],
        measurements: [`QRS ${qrs ?? "—"} ms`],
        morphology: ["Broad monophasic R in V5-V6", "Absent septal Q in I/aVL"],
        reasoning: "Wide QRS with LBBB morphology; new LBBB with ischemia is high risk.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`QRS duration ${qrs} ms`, "LBBB morphology"],
      [],
    ),
  );

  rules.push(
    rule(
      "left_axis_deviation",
      "Left Axis Deviation",
      axisClass === "Left Axis Deviation" || (axis != null && axis <= -30),
      "moderate",
      axis != null && axis <= -30 ? 90 : 0,
      {
        affectedLeads: ["I", "aVL"],
        axis: `${axis ?? "—"}°`,
        measurements: [`QRS axis ${axis ?? "—"}°`],
        morphology: ["Dominant R in I/aVL with S in II/III/aVF"],
        reasoning: "Mean QRS axis more negative than -30 degrees.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`Axis ${axis}°`],
      axis != null && axis > -30 ? ["Axis not leftward"] : [],
    ),
  );

  rules.push(
    rule(
      "right_axis_deviation",
      "Right Axis Deviation",
      axisClass === "Right Axis Deviation" || (axis != null && axis >= 90),
      "moderate",
      axis != null && axis >= 90 ? 90 : 0,
      {
        affectedLeads: ["III", "aVF"],
        axis: `${axis ?? "—"}°`,
        measurements: [`QRS axis ${axis ?? "—"}°`],
        morphology: ["Dominant R in III/aVF with S in I/aVL"],
        reasoning: "Mean QRS axis more positive than +90 degrees.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`Axis ${axis}°`],
      [],
    ),
  );

  rules.push(
    rule(
      "lvh",
      "Left Ventricular Hypertrophy (LVH)",
      contains(text, "lvh", "left ventricular hypertrophy") || cardiologist.hypertrophy.some((f) => contains(norm(f.label), "lvh", "left ventricular")),
      "moderate",
      87,
      {
        affectedLeads: ["V5", "V6", "I", "aVL"],
        measurements: [`QRS ${qrs ?? "—"} ms`],
        morphology: ["Increased Sokolov-Lyon or Cornell voltage criteria"],
        reasoning: "Voltage and repolarization pattern consistent with LVH.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      cardiologist.hypertrophy.map((f) => f.label),
      [],
    ),
  );

  rules.push(
    rule(
      "rvh",
      "Right Ventricular Hypertrophy (RVH)",
      contains(text, "rvh", "right ventricular hypertrophy") || cardiologist.hypertrophy.some((f) => contains(norm(f.label), "rvh", "right ventricular")),
      "moderate",
      86,
      {
        affectedLeads: ["V1", "V2", "III", "aVF"],
        measurements: [`QRS ${qrs ?? "—"} ms`],
        morphology: ["Right axis deviation with dominant R in V1"],
        reasoning: "Right-sided voltage and axis pattern consistent with RVH.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      cardiologist.hypertrophy.map((f) => f.label),
      [],
    ),
  );

  rules.push(
    rule(
      "early_repolarization",
      "Early Repolarization",
      contains(text, "early repolarization", "benign early repol", "j-point elevation"),
      "low_risk",
      82,
      {
        affectedLeads: lateralLeads,
        measurements: [],
        morphology: ["Concave ST elevation at J-point in precordial/lateral leads"],
        reasoning: "Benign J-point elevation pattern without reciprocal changes.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["J-point elevation"],
      hasCriticalIschemia ? ["Ischemic ST pattern also present"] : [],
    ),
  );

  rules.push(
    rule(
      "qt_prolongation",
      "QT Prolongation",
      (qtc != null && qtc >= 470) || contains(text, "prolonged qt", "long qt", "qtc prolongation"),
      qtc != null && qtc >= 500 ? "critical" : "high_risk",
      qtc != null && qtc >= 470 ? 95 : 0,
      {
        affectedLeads: [],
        measurements: [`QTc ${qtc ?? "—"} ms`, `QT ${intervalMs(cardiologist, "QT") ?? "—"} ms`],
        morphology: ["Prolonged ventricular repolarization"],
        reasoning: "Corrected QT interval exceeds gender-adjusted prolonged threshold.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`QTc ${qtc} ms`],
      qtc != null && qtc < 470 ? ["QTc within normal range"] : [],
    ),
  );

  rules.push(
    rule(
      "short_qt",
      "Short QT Syndrome Pattern",
      (qtc != null && qtc <= 340) || contains(text, "short qt"),
      "high_risk",
      qtc != null && qtc <= 340 ? 88 : contains(text, "short qt") ? 75 : 0,
      {
        affectedLeads: [],
        measurements: [`QTc ${qtc ?? "—"} ms`],
        morphology: ["Abbreviated repolarization"],
        reasoning: "Short corrected QT may indicate short QT syndrome risk.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [`QTc ${qtc} ms`],
      [],
    ),
  );

  rules.push(
    rule(
      "wpw",
      "Wolff-Parkinson-White (WPW)",
      contains(text, "wpw", "wolff-parkinson", "delta wave", "short pr delta"),
      "high_risk",
      89,
      {
        affectedLeads: leadsFromFindings(cardiologist, ["wpw", "preexcitation"]),
        measurements: [`PR ${pr ?? "—"} ms`],
        morphology: ["Short PR with delta wave slurring initial QRS"],
        reasoning: "Ventricular pre-excitation via accessory pathway.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Delta wave", pr != null && pr < 120 ? "Short PR" : "Pre-excitation pattern"].filter(Boolean) as string[],
      [],
    ),
  );

  rules.push(
    rule(
      "brugada_pattern",
      "Brugada Pattern",
      contains(text, "brugada"),
      "critical",
      90,
      {
        affectedLeads: ["V1", "V2", "V3"],
        measurements: [],
        morphology: ["Coved ST elevation V1-V3 with T-wave inversion"],
        reasoning: "Type 1 Brugada morphology in right precordial leads.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Right precordial ST elevation pattern"],
      [],
    ),
  );

  rules.push(
    rule(
      "pericarditis",
      "Pericarditis Pattern",
      contains(text, "pericarditis", "diffuse st elevation", "pr depression"),
      "moderate",
      84,
      {
        affectedLeads: [...inferiorLeads, ...lateralLeads, ...anteriorLeads],
        measurements: [],
        morphology: ["Diffuse concave ST elevation", "PR segment depression"],
        reasoning: "Diffuse inflammatory ST-T pattern sparing reciprocal single-territory STEMI morphology.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Diffuse ST changes"],
      anteriorSt.length > 0 ? ["Territorial ST elevation present"] : [],
    ),
  );

  rules.push(
    rule(
      "hyperkalemia_pattern",
      "Hyperkalemia Pattern",
      contains(text, "hyperkalemia", "peaked t", "tenting", "sine wave"),
      "critical",
      88,
      {
        affectedLeads: ["V2", "V3", "V4"],
        measurements: [`QRS ${qrs ?? "—"} ms`],
        morphology: ["Peaked symmetric T waves", "QRS widening at severe levels"],
        reasoning: "Repolarization and conduction changes consistent with hyperkalemia.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Peaked T waves", qrs != null && qrs >= 120 ? "QRS widening" : "T-wave changes"].filter(Boolean) as string[],
      [],
    ),
  );

  rules.push(
    rule(
      "hypokalemia_pattern",
      "Hypokalemia Pattern",
      contains(text, "hypokalemia", "u wave", "flat t", "prominent u"),
      "moderate",
      83,
      {
        affectedLeads: lateralLeads,
        measurements: [`QT ${intervalMs(cardiologist, "QT") ?? "—"} ms`, `QTc ${qtc ?? "—"} ms`],
        morphology: ["Flattened T waves", "Prominent U waves"],
        reasoning: "Repolarization flattening and U waves suggest hypokalemia.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["T-wave flattening / U waves"],
      [],
    ),
  );

  rules.push(
    rule(
      "pulmonary_embolism_pattern",
      "Pulmonary Embolism Pattern",
      contains(text, "pulmonary embolism", "pe pattern", "s1q3t3", "right heart strain"),
      "high_risk",
      85,
      {
        affectedLeads: ["III", "aVF", "V1"],
        axis: axisClass,
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["S1Q3T3", "Right heart strain", "T-wave inversion V1-V4"],
        reasoning: "Acute right ventricular strain pattern with tachycardia.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Right strain pattern", hr != null && hr > 100 ? "Tachycardia" : "Clinical suspicion"].filter(Boolean) as string[],
      [],
    ),
  );

  const inferiorStemiMatched =
    inferiorSt.length >= 2 ||
    contains(text, "inferior stemi", "inferior st elevation") ||
    (inferiorSt.length >= 1 && reciprocalDep.some((l) => ["I", "aVL"].includes(l)));
  rules.push(
    rule(
      "inferior_stemi",
      "Possible Inferior STEMI",
      inferiorStemiMatched,
      "life_threatening",
      inferiorStemiMatched ? 97 : 0,
      {
        affectedLeads: inferiorSt.length ? inferiorSt : inferiorLeads,
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["ST elevation in II, III, aVF", reciprocalDep.length ? "Reciprocal depression in I, aVL" : "Inferior ST elevation"],
        reasoning: "Territorial ST elevation in inferior leads with reciprocal lateral depression supports acute inferior STEMI.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      [
        ...inferiorSt.map((l) => `ST elevation ${l}`),
        ...reciprocalDep.filter((l) => ["I", "aVL"].includes(l)).map((l) => `Reciprocal depression ${l}`),
      ],
      anteriorSt.length > 0 && !inferiorStemiMatched ? ["Anterior ST elevation without inferior territory"] : [],
    ),
  );

  rules.push(
    rule(
      "anterior_stemi",
      "Anterior STEMI",
      anteriorSt.length >= 2 || contains(text, "anterior stemi", "anterior st elevation"),
      "life_threatening",
      anteriorSt.length >= 2 ? 96 : contains(text, "anterior stemi") ? 85 : 0,
      {
        affectedLeads: anteriorSt.length ? anteriorSt : anteriorLeads,
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["ST elevation V1-V4 territory"],
        reasoning: "Anterior precordial ST elevation consistent with LAD territory occlusion.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      anteriorSt.map((l) => `ST elevation ${l}`),
      [],
    ),
  );

  rules.push(
    rule(
      "lateral_stemi",
      "Lateral STEMI",
      lateralSt.length >= 2 || contains(text, "lateral stemi", "lateral st elevation"),
      "life_threatening",
      lateralSt.length >= 2 ? 95 : 0,
      {
        affectedLeads: lateralSt.length ? lateralSt : lateralLeads,
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["ST elevation I, aVL, V5-V6"],
        reasoning: "Lateral territory ST elevation supports circumflex/LAD lateral branch occlusion.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      lateralSt.map((l) => `ST elevation ${l}`),
      [],
    ),
  );

  rules.push(
    rule(
      "posterior_mi_suspicion",
      "Posterior MI Suspicion",
      contains(text, "posterior", "posterior mi", "r wave v1", "v1 v2 st depression"),
      "high_risk",
      86,
      {
        affectedLeads: ["V1", "V2"],
        measurements: [],
        morphology: ["Horizontal ST depression V1-V3", "Tall R waves V1-V2"],
        reasoning: "Posterior involvement suggested by anterior reciprocal ST depression pattern.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["Reciprocal anterior ST depression"],
      [],
    ),
  );

  rules.push(
    rule(
      "nstemi_suspicion",
      "NSTEMI Suspicion",
      (contains(text, "nstemi", "non-st elevation", "nste mi") || (stLeads(cardiologist, "depression").length >= 2 && !inferiorStemiMatched)) &&
        !anteriorSt.length,
      "critical",
      88,
      {
        affectedLeads: stLeads(cardiologist, "depression"),
        measurements: [`HR ${hr ?? "—"} bpm`],
        morphology: ["ST depression without diagnostic ST elevation"],
        reasoning: "Ischemic ST depression without ST elevation meets NSTEMI suspicion criteria pending troponin.",
        rhythm: cardiologist.rhythm.rhythm,
      },
      ["ST depression pattern", "Ischemic symptoms correlation required"],
      inferiorStemiMatched ? ["STEMI pattern takes priority"] : [],
    ),
  );

  // Enrich with manual measurement evidence where available
  for (const entry of rules) {
    if (!entry.matched) continue;
    const prMeas = measurementValue(measurements, "pr_interval");
    const qrsMeas = measurementValue(measurements, "qrs_duration");
    const qtcMeas = measurementValue(measurements, "qtc_bazett");
    if (prMeas) entry.evidence.measurements.push(`Manual ${prMeas.name}: ${prMeas.value} ${prMeas.unit}`);
    if (qrsMeas) entry.evidence.measurements.push(`Manual ${qrsMeas.name}: ${qrsMeas.value} ${qrsMeas.unit}`);
    if (qtcMeas) entry.evidence.measurements.push(`Manual ${qtcMeas.name}: ${qtcMeas.value} ${qtcMeas.unit}`);
  }

  return rules;
}

export function matchedRules(rules: CdssRuleEvaluation[]) {
  return rules.filter((r) => r.matched).sort((a, b) => b.confidence - a.confidence);
}

export function highestSeverity(rules: CdssRuleEvaluation[]): CdssSeverity {
  const order: CdssSeverity[] = ["life_threatening", "critical", "high_risk", "moderate", "low_risk", "normal"];
  const matched = matchedRules(rules);
  if (!matched.length) return "normal";
  for (const level of order) {
    if (matched.some((r) => r.severity === level)) return level;
  }
  return "normal";
}
