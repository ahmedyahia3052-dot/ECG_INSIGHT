import type { CdssGuidelineReference, CdssRuleEvaluation, CdssRuleId, CdssSeverity } from "./types";

const GUIDELINE_CATALOG: Array<Omit<CdssGuidelineReference, "topic"> & { ruleIds: CdssRuleId[]; topics: string[] }> = [
  {
    evidenceLevel: "I",
    recommendationClass: "I",
    ruleIds: ["anterior_stemi", "inferior_stemi", "lateral_stemi"],
    source: "ACC/AHA",
    statement: "Immediate reperfusion therapy is recommended for patients with STEMI and ischemic symptoms.",
    topics: ["STEMI", "Reperfusion"],
  },
  {
    evidenceLevel: "I",
    recommendationClass: "I",
    ruleIds: ["nstemi_suspicion"],
    source: "Universal Definition of MI",
    statement: "Acute myocardial injury with ST depression and elevated cardiac troponin defines NSTEMI when clinical context supports ischemia.",
    topics: ["NSTEMI", "Troponin"],
  },
  {
    evidenceLevel: "I",
    recommendationClass: "I",
    ruleIds: ["qt_prolongation"],
    source: "ESC",
    statement: "Review QT-prolonging medications and correct electrolytes; consider cardiology referral for QTc ≥500 ms.",
    topics: ["QT Prolongation"],
  },
  {
    evidenceLevel: "IIa",
    recommendationClass: "IIa",
    ruleIds: ["atrial_fibrillation"],
    source: "ESC",
    statement: "Assess stroke risk (CHA2DS2-VASc) and bleeding risk when atrial fibrillation is detected.",
    topics: ["Atrial Fibrillation"],
  },
  {
    evidenceLevel: "I",
    recommendationClass: "I",
    ruleIds: ["complete_heart_block"],
    source: "ACC/AHA",
    statement: "Symptomatic complete heart block requires urgent evaluation for temporary or permanent pacing.",
    topics: ["Complete Heart Block"],
  },
  {
    evidenceLevel: "IIa",
    recommendationClass: "IIa",
    ruleIds: ["lvh", "rvh"],
    source: "ESC",
    statement: "Echocardiography is reasonable when ECG voltage criteria suggest ventricular hypertrophy.",
    topics: ["Ventricular Hypertrophy"],
  },
  {
    evidenceLevel: "I",
    recommendationClass: "I",
    ruleIds: ["brugada_pattern"],
    source: "ESC",
    statement: "Type 1 Brugada pattern warrants arrhythmia specialist evaluation and risk stratification.",
    topics: ["Brugada"],
  },
  {
    evidenceLevel: "I",
    recommendationClass: "I",
    ruleIds: ["hyperkalemia_pattern"],
    source: "ACC/AHA",
    statement: "Severe hyperkalemia ECG changes require emergent potassium correction and cardiac monitoring.",
    topics: ["Hyperkalemia"],
  },
  {
    evidenceLevel: "IIa",
    recommendationClass: "IIa",
    ruleIds: ["pulmonary_embolism_pattern"],
    source: "ESC",
    statement: "Right heart strain on ECG with compatible presentation should prompt PE evaluation.",
    topics: ["Pulmonary Embolism"],
  },
  {
    evidenceLevel: "III",
    recommendationClass: "III",
    ruleIds: ["normal_ecg", "sinus_rhythm"],
    source: "ACC/AHA",
    statement: "No acute intervention required for normal sinus rhythm without ischemic or arrhythmic red flags.",
    topics: ["Normal ECG"],
  },
];

export function buildGuidelineReferences(matched: CdssRuleEvaluation[]): CdssGuidelineReference[] {
  const ids = new Set(matched.map((r) => r.ruleId));
  const refs: CdssGuidelineReference[] = [];
  for (const entry of GUIDELINE_CATALOG) {
    if (entry.ruleIds.some((id) => ids.has(id))) {
      for (const topic of entry.topics) {
        refs.push({
          evidenceLevel: entry.evidenceLevel,
          recommendationClass: entry.recommendationClass,
          source: entry.source,
          statement: entry.statement,
          topic,
        });
      }
    }
  }
  if (!refs.length && matched.length) {
    refs.push({
      evidenceLevel: "IIa",
      recommendationClass: "IIa",
      source: "ACC/AHA",
      statement: "Clinical correlation with symptoms, examination, and serial ECG/troponin is recommended for abnormal findings.",
      topic: "Clinical Correlation",
    });
  }
  return refs;
}

export function severityToTriage(severity: CdssSeverity) {
  switch (severity) {
    case "life_threatening":
      return "black" as const;
    case "critical":
      return "red" as const;
    case "high_risk":
      return "orange" as const;
    case "moderate":
      return "yellow" as const;
    default:
      return "green" as const;
  }
}

export function triageLabel(level: ReturnType<typeof severityToTriage>) {
  return (
    {
      black: "BLACK — Immediate life threat",
      green: "GREEN — Routine",
      orange: "ORANGE — Urgent cardiology",
      red: "RED — Critical / emergent",
      yellow: "YELLOW — Prompt evaluation",
    }[level]
  );
}
