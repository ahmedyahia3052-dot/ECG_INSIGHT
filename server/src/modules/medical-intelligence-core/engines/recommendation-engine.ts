import { MIC_DIAGNOSIS_BY_CODE, MIC_DIAGNOSIS_CATALOG } from "../data/diagnoses";
import type { MicDiagnosisEntry, MicRecommendationEntry } from "../types";

const RECOMMENDATION_TYPES = {
  repeat_ecg: { action: "Repeat 12-lead ECG with careful lead placement", priority: "routine" as const },
  troponin: { action: "Obtain serial high-sensitivity troponin per ACS protocol", priority: "urgent" as const },
  echo: { action: "Transthoracic echocardiography", priority: "routine" as const },
  holter: { action: "Ambulatory Holter monitoring for rhythm correlation", priority: "routine" as const },
  cardiology_referral: { action: "Cardiology referral for expert interpretation", priority: "urgent" as const },
  emergency_transfer: { action: "Emergency department transfer / activate acute care pathway", priority: "immediate" as const },
  electrolytes: { action: "Stat electrolyte panel including K+, Ca2+, Mg2+", priority: "urgent" as const },
  continuous_monitoring: { action: "Continuous telemetry monitoring", priority: "urgent" as const },
  observation: { action: "Clinical observation with serial assessment", priority: "routine" as const },
  anticoagulation_review: { action: "Stroke risk stratification and anticoagulation review", priority: "urgent" as const },
};

const DIAGNOSIS_RECOMMENDATION_MAP: Record<string, (keyof typeof RECOMMENDATION_TYPES)[]> = {
  NSR: ["observation"],
  SBRAD: ["observation", "echo", "holter"],
  STACH: ["repeat_ecg", "electrolytes"],
  AF: ["anticoagulation_review", "cardiology_referral", "echo"],
  AFL: ["anticoagulation_review", "cardiology_referral"],
  SVT: ["emergency_transfer", "cardiology_referral"],
  VT: ["emergency_transfer", "continuous_monitoring"],
  VF: ["emergency_transfer"],
  PAC: ["observation"],
  PVC: ["echo", "electrolytes", "holter"],
  AVB1: ["observation", "repeat_ecg"],
  AVB2I: ["continuous_monitoring", "cardiology_referral"],
  AVB2II: ["cardiology_referral", "continuous_monitoring", "emergency_transfer"],
  AVB3: ["emergency_transfer", "continuous_monitoring"],
  LBBB: ["echo", "troponin"],
  RBBB: ["echo"],
  STEMI_ANT: ["emergency_transfer", "troponin"],
  STEMI_INF: ["emergency_transfer", "troponin"],
  STEMI_LAT: ["emergency_transfer", "troponin"],
  STEMI_POST: ["emergency_transfer", "troponin"],
  STEMI_SEPT: ["emergency_transfer", "troponin"],
  STEMI_RV: ["emergency_transfer", "troponin"],
  NSTEMI: ["troponin", "cardiology_referral"],
  ST_DEP: ["troponin", "repeat_ecg"],
  T_WAVE: ["repeat_ecg", "electrolytes", "troponin"],
  LVH: ["echo", "observation"],
};

/** Module 5 — Clinical Recommendation Engine */
export function getRecommendationsForDiagnosis(code: string): MicRecommendationEntry[] {
  const diagnosis = MIC_DIAGNOSIS_BY_CODE.get(code.toUpperCase());
  if (!diagnosis) return [];

  const types = DIAGNOSIS_RECOMMENDATION_MAP[code.toUpperCase()] ?? diagnosis.recommendedNextSteps.slice(0, 2).map(() => "observation" as const);
  const seen = new Set<string>();

  return types
    .filter((type) => {
      if (seen.has(type)) return false;
      seen.add(type);
      return true;
    })
    .map((type) => {
      const catalog = RECOMMENDATION_TYPES[type];
      return {
        diagnosisCode: diagnosis.code,
        type,
        action: catalog.action,
        priority: catalog.priority,
        rationale: `Recommended for ${diagnosis.name} based on MIC clinical mapping (${diagnosis.emergencyLevel} urgency).`,
      };
    });
}

export function listAllRecommendationMappings(): MicRecommendationEntry[] {
  return MIC_DIAGNOSIS_CATALOG.flatMap((entry) => getRecommendationsForDiagnosis(entry.code));
}

export { RECOMMENDATION_TYPES };
