import type { EmkpClinicalRule } from "../model/knowledge-model";
import { EMKP_DISEASES } from "../knowledge/diagnoses";

function ruleFromDisease(
  ruleId: string,
  code: string,
  overrides: Partial<EmkpClinicalRule> = {},
): EmkpClinicalRule {
  const d = EMKP_DISEASES.find((x) => x.code === code);
  if (!d) throw new Error(`Unknown diagnosis code: ${code}`);
  return {
    ruleId,
    diagnosisCode: code,
    definition: d.definition,
    diagnosticCriteria: d.diagnosticCriteria,
    requiredFindings: d.diagnosticCriteria.slice(0, 2),
    supportingFindings: d.ecgCharacteristics,
    exclusionFindings: d.pitfalls,
    severity: d.severity,
    clinicalSignificance: d.clinicalNotes[0] ?? d.definition,
    riskLevel: d.riskCategory,
    urgency: d.urgency,
    recommendedAction: d.clinicalNotes,
    evidenceLevel: d.evidenceLevel,
    confidence: d.confidence,
    guidelineRefs: d.guidelineReferences,
    ...overrides,
  };
}

export const EMKP_CLINICAL_RULES: EmkpClinicalRule[] = [
  ruleFromDisease("EMKP-R-001", "NORMAL_ECG"),
  ruleFromDisease("EMKP-R-002", "NSR"),
  ruleFromDisease("EMKP-R-003", "SBRAD"),
  ruleFromDisease("EMKP-R-004", "STACH"),
  ruleFromDisease("EMKP-R-005", "AF", { requiredFindings: ["Irregularly irregular RR", "Absent P waves"] }),
  ruleFromDisease("EMKP-R-006", "AFL"),
  ruleFromDisease("EMKP-R-007", "SVT"),
  ruleFromDisease("EMKP-R-008", "AVNRT", { requiredFindings: ["Regular narrow QRS tachycardia", "RP < PR or hidden P"] }),
  ruleFromDisease("EMKP-R-009", "AVRT", { exclusionFindings: ["AV nodal blockers in antidromic WPW"] }),
  ruleFromDisease("EMKP-R-010", "PAC"),
  ruleFromDisease("EMKP-R-011", "PVC"),
  ruleFromDisease("EMKP-R-012", "VT", { requiredFindings: ["Wide QRS tachycardia"], recommendedAction: ["Immediate cardioversion if unstable", "Amiodarone per ACLS"] }),
  ruleFromDisease("EMKP-R-013", "VF", { recommendedAction: ["Immediate defibrillation"] }),
  ruleFromDisease("EMKP-R-014", "ASYSTOLE"),
  ruleFromDisease("EMKP-R-015", "PEA"),
  ruleFromDisease("EMKP-R-016", "AVB1"),
  ruleFromDisease("EMKP-R-017", "AVB2I"),
  ruleFromDisease("EMKP-R-018", "AVB2II", { recommendedAction: ["Permanent pacemaker"] }),
  ruleFromDisease("EMKP-R-019", "AVB3", { recommendedAction: ["Emergency pacing", "Permanent pacemaker"] }),
  ruleFromDisease("EMKP-R-020", "RBBB"),
  ruleFromDisease("EMKP-R-021", "LBBB", { exclusionFindings: ["Standard STEMI criteria unreliable — use Sgarbossa"] }),
  ruleFromDisease("EMKP-R-022", "LAFB"),
  ruleFromDisease("EMKP-R-023", "LPFB"),
  ruleFromDisease("EMKP-R-024", "LVH"),
  ruleFromDisease("EMKP-R-025", "RVH"),
  ruleFromDisease("EMKP-R-026", "STEMI", { requiredFindings: ["ST elevation ≥1 mm in ≥2 contiguous leads"], recommendedAction: ["Activate cath lab", "Dual antiplatelet therapy"] }),
  ruleFromDisease("EMKP-R-027", "NSTEMI", { recommendedAction: ["Serial troponin", "Risk stratify GRACE/TIMI"] }),
  ruleFromDisease("EMKP-R-028", "ANT_MI"),
  ruleFromDisease("EMKP-R-029", "INF_MI"),
  ruleFromDisease("EMKP-R-030", "LAT_MI"),
  ruleFromDisease("EMKP-R-031", "POST_MI", { requiredFindings: ["ST depression V1–V3", "Tall R V1–V2"], recommendedAction: ["Obtain V7–V9 leads"] }),
  ruleFromDisease("EMKP-R-032", "HYPERK", { recommendedAction: ["Stat K+", "Calcium gluconate if ECG changes"] }),
  ruleFromDisease("EMKP-R-033", "HYPOK"),
  ruleFromDisease("EMKP-R-034", "HYPERCAL"),
  ruleFromDisease("EMKP-R-035", "HYPOCAL"),
  ruleFromDisease("EMKP-R-036", "PERICARDITIS"),
  ruleFromDisease("EMKP-R-037", "EARLY_REPOL"),
  ruleFromDisease("EMKP-R-038", "WPW", { exclusionFindings: ["AV nodal blockers if AF present"] }),
  ruleFromDisease("EMKP-R-039", "LONG_QT"),
  ruleFromDisease("EMKP-R-040", "SHORT_QT"),
  ruleFromDisease("EMKP-R-041", "BRUGADA"),
  ruleFromDisease("EMKP-R-042", "ARVC"),
  ruleFromDisease("EMKP-R-043", "PACEMAKER"),
  ruleFromDisease("EMKP-R-044", "BBB_ESCAPE"),
  ruleFromDisease("EMKP-R-045", "JUNCTIONAL"),
  ruleFromDisease("EMKP-R-046", "IVR"),
  ruleFromDisease("EMKP-R-047", "AIVR"),
];

export function getRuleById(ruleId: string): EmkpClinicalRule | undefined {
  return EMKP_CLINICAL_RULES.find((r) => r.ruleId === ruleId);
}

export function getRulesForDiagnosis(code: string): EmkpClinicalRule[] {
  return EMKP_CLINICAL_RULES.filter((r) => r.diagnosisCode === code);
}
