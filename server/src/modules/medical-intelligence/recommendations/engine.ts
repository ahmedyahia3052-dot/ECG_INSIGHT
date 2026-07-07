import type { ClinicalRecommendation, MedicalDiagnosisCode, RecommendationType, RuleFinding } from "../types";
import type { ClinicalSeverity, ClinicalUrgency } from "../types";

const RECOMMENDATION_CATALOG: Record<RecommendationType, { action: string; defaultPriority: ClinicalRecommendation["priority"] }> = {
  repeat_ecg: { action: "Repeat 12-lead ECG with careful lead placement", defaultPriority: "routine" },
  serial_troponin: { action: "Obtain serial high-sensitivity troponin per ACS protocol", defaultPriority: "urgent" },
  echo: { action: "Transthoracic echocardiography to assess structure and function", defaultPriority: "routine" },
  electrolytes: { action: "Stat electrolyte panel including K+, Ca2+, Mg2+", defaultPriority: "urgent" },
  cardiology_consult: { action: "Cardiology consultation for expert interpretation", defaultPriority: "urgent" },
  emergency_referral: { action: "Emergency department referral / activate acute care pathway", defaultPriority: "immediate" },
  observation: { action: "Continuous cardiac monitoring and observation", defaultPriority: "urgent" },
  no_immediate_action: { action: "No immediate intervention; routine follow-up as clinically indicated", defaultPriority: "optional" },
  continuous_monitoring: { action: "Continuous telemetry monitoring", defaultPriority: "urgent" },
  anticoagulation_review: { action: "Review anticoagulation candidacy and stroke risk stratification", defaultPriority: "urgent" },
  chest_xray: { action: "Chest radiograph to evaluate pulmonary and cardiac silhouette", defaultPriority: "routine" },
  ct_angiography: { action: "CT pulmonary angiography if PE clinically suspected", defaultPriority: "immediate" },
};

const DIAGNOSIS_RECOMMENDATIONS: Partial<Record<MedicalDiagnosisCode, RecommendationType[]>> = {
  NSR: ["no_immediate_action", "repeat_ecg"],
  SBRAD: ["observation", "echo"],
  STACH: ["repeat_ecg", "electrolytes"],
  AF: ["anticoagulation_review", "cardiology_consult", "echo"],
  AFL: ["anticoagulation_review", "cardiology_consult"],
  PAC: ["no_immediate_action"],
  PVC: ["echo", "observation"],
  SVT: ["emergency_referral", "cardiology_consult"],
  VT: ["emergency_referral", "continuous_monitoring"],
  VF: ["emergency_referral"],
  ASYSTOLE: ["emergency_referral"],
  PEA: ["emergency_referral"],
  LBBB: ["echo", "serial_troponin"],
  RBBB: ["echo", "chest_xray"],
  BIFASC: ["cardiology_consult", "continuous_monitoring"],
  TRIFASC: ["cardiology_consult", "emergency_referral"],
  AVB1: ["observation", "repeat_ecg"],
  AVB2I: ["observation", "cardiology_consult"],
  AVB2II: ["cardiology_consult", "continuous_monitoring"],
  AVB3: ["emergency_referral", "continuous_monitoring"],
  WPW: ["cardiology_consult", "observation"],
  BRUGADA: ["cardiology_consult", "observation"],
  LONG_QT: ["electrolytes", "observation"],
  SHORT_QT: ["cardiology_consult"],
  HYPERK: ["electrolytes", "emergency_referral"],
  HYPOK: ["electrolytes", "observation"],
  HYPOCAL: ["electrolytes"],
  LVH: ["echo", "no_immediate_action"],
  RVH: ["echo", "chest_xray"],
  PERICARDITIS: ["serial_troponin", "echo"],
  PE: ["ct_angiography", "emergency_referral"],
  STEMI: ["emergency_referral", "serial_troponin"],
  NSTEMI: ["serial_troponin", "cardiology_consult"],
  EARLY_REPOL: ["no_immediate_action"],
  ELECTROLYTE: ["electrolytes"],
};

function makeRecommendation(
  type: RecommendationType,
  rationale: string,
  priorityOverride?: ClinicalRecommendation["priority"],
  timeframe?: string,
): ClinicalRecommendation {
  const catalog = RECOMMENDATION_CATALOG[type];
  return {
    type,
    priority: priorityOverride ?? catalog.defaultPriority,
    action: catalog.action,
    rationale,
    timeframe,
  };
}

export function generateRecommendations(
  findings: RuleFinding[],
  overallSeverity: ClinicalSeverity,
  overallUrgency: ClinicalUrgency,
): ClinicalRecommendation[] {
  const recommendations = new Map<RecommendationType, ClinicalRecommendation>();

  for (const finding of findings) {
    const types = DIAGNOSIS_RECOMMENDATIONS[finding.code] ?? [];
    for (const type of types) {
      if (recommendations.has(type)) continue;
      recommendations.set(
        type,
        makeRecommendation(type, `Indicated for ${finding.label} (${finding.code})`, undefined, urgencyTimeframe(finding.urgency)),
      );
    }
  }

  if (overallSeverity === "critical" || overallUrgency === "critical") {
    recommendations.set(
      "emergency_referral",
      makeRecommendation("emergency_referral", "Critical ECG finding requires emergent evaluation", "immediate", "Immediately"),
    );
  }

  if (findings.some((f) => f.category === "ischemia")) {
    recommendations.set(
      "serial_troponin",
      makeRecommendation("serial_troponin", "Ischemic pattern detected — troponin protocol indicated", "urgent", "Within 1 hour"),
    );
  }

  if (findings.some((f) => f.category === "electrolyte")) {
    recommendations.set(
      "electrolytes",
      makeRecommendation("electrolytes", "Electrolyte pattern on ECG — laboratory confirmation required", "urgent", "Stat"),
    );
  }

  if (!recommendations.size) {
    recommendations.set(
      "no_immediate_action",
      makeRecommendation("no_immediate_action", "No acute abnormality detected by automated rules"),
    );
    recommendations.set(
      "repeat_ecg",
      makeRecommendation("repeat_ecg", "Baseline ECG for future comparison recommended"),
    );
  }

  const priorityOrder: Record<ClinicalRecommendation["priority"], number> = {
    immediate: 0,
    urgent: 1,
    routine: 2,
    optional: 3,
  };

  return [...recommendations.values()].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function urgencyTimeframe(urgency: ClinicalUrgency): string | undefined {
  switch (urgency) {
    case "critical": return "Immediately";
    case "emergent": return "Within 30 minutes";
    case "urgent": return "Within 1–4 hours";
    default: return undefined;
  }
}
