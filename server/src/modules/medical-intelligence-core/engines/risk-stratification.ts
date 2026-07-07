import { MIC_DIAGNOSIS_BY_CODE } from "../data/diagnoses";
import type { MicEmergencyLevel, MicRiskAssessment, MicRiskLevel, MicSeverity } from "../types";

export interface MicRiskRule {
  criteria: {
    categories?: string[];
    emergencyLevels?: MicEmergencyLevel[];
    severities?: MicSeverity[];
  };
  enabled: boolean;
  level: MicRiskLevel;
  rationale: string;
  ruleId: string;
}

/** Module 7 — Risk Stratification (configurable rules) */
export const MIC_RISK_RULES: MicRiskRule[] = [
  {
    ruleId: "RISK_CRITICAL_EMERGENCY",
    level: "critical",
    enabled: true,
    criteria: { emergencyLevels: ["critical"] },
    rationale: "Critical emergency level mandates highest acuity pathway.",
  },
  {
    ruleId: "RISK_CRITICAL_SEVERITY",
    level: "critical",
    enabled: true,
    criteria: { severities: ["critical"] },
    rationale: "Critical severity classification requires immediate intervention.",
  },
  {
    ruleId: "RISK_HIGH_ISCHEMIA",
    level: "high",
    enabled: true,
    criteria: { categories: ["ischemia"], emergencyLevels: ["emergent", "urgent"] },
    rationale: "Ischemic pattern with urgent/emergent triage is high risk.",
  },
  {
    ruleId: "RISK_HIGH_URGENT",
    level: "high",
    enabled: true,
    criteria: { emergencyLevels: ["emergent"], severities: ["urgent"] },
    rationale: "Emergent emergency level with urgent severity.",
  },
  {
    ruleId: "RISK_INTERMEDIATE",
    level: "intermediate",
    enabled: true,
    criteria: { severities: ["abnormal"], emergencyLevels: ["urgent"] },
    rationale: "Abnormal findings with urgent but non-critical triage.",
  },
  {
    ruleId: "RISK_LOW_ROUTINE",
    level: "low",
    enabled: true,
    criteria: { emergencyLevels: ["routine"], severities: ["normal", "minor"] },
    rationale: "Routine emergency level with normal/minor severity.",
  },
];

const LEVEL_RANK: Record<MicRiskLevel, number> = {
  low: 1,
  intermediate: 2,
  high: 3,
  critical: 4,
};

function ruleMatches(rule: MicRiskRule, category: string, severity: MicSeverity, emergencyLevel: MicEmergencyLevel): boolean {
  if (!rule.enabled) return false;
  const { categories, emergencyLevels, severities } = rule.criteria;
  if (categories?.length && !categories.includes(category)) return false;
  if (emergencyLevels?.length && !emergencyLevels.includes(emergencyLevel)) return false;
  if (severities?.length && !severities.includes(severity)) return false;
  return true;
}

export function assessRiskForDiagnosis(code: string): MicRiskAssessment | null {
  const diagnosis = MIC_DIAGNOSIS_BY_CODE.get(code.toUpperCase());
  if (!diagnosis) return null;

  const matched = MIC_RISK_RULES.filter((rule) =>
    ruleMatches(rule, diagnosis.category, diagnosis.severity, diagnosis.emergencyLevel),
  );

  if (!matched.length) {
    return {
      ruleId: "RISK_DEFAULT",
      level: "intermediate",
      rationale: "No explicit rule matched; default intermediate stratification applied.",
      contributingFactors: [diagnosis.category, diagnosis.severity, diagnosis.emergencyLevel],
    };
  }

  const best = matched.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])[0];
  return {
    ruleId: best.ruleId,
    level: best.level,
    rationale: best.rationale,
    contributingFactors: [diagnosis.category, diagnosis.severity, diagnosis.emergencyLevel],
  };
}

export function listRiskRules(): MicRiskRule[] {
  return MIC_RISK_RULES.filter((rule) => rule.enabled);
}
