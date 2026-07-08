import type { ClinicalFinding } from "../../ecg-interpretation/types";

export const INTERPRETATION_KNOWLEDGE_CODE_MAP: Record<string, string> = {
  AF: "ATRIAL_FIBRILLATION",
  AFL: "ATRIAL_FLUTTER",
  ANT_MI: "STEMI",
  AVB1: "FIRST_DEGREE_AV_BLOCK",
  AVB2I: "SECOND_DEGREE_AV_BLOCK_TYPE_I",
  AVB2II: "SECOND_DEGREE_AV_BLOCK_TYPE_II",
  AVB3: "THIRD_DEGREE_AV_BLOCK",
  EXTREME_AXIS: "EXTREME_AXIS_DEVIATION",
  HYPERACUTE_T: "HYPERACUTE_T_WAVES",
  INF_MI: "STEMI",
  JUNCTIONAL: "JUNCTIONAL_RHYTHM",
  LAD: "LEFT_AXIS_DEVIATION",
  LAE: "LEFT_ATRIAL_ENLARGEMENT",
  LAT_MI: "STEMI",
  LBBB: "LEFT_BUNDLE_BRANCH_BLOCK",
  LPFB: "LEFT_POSTERIOR_FASCICULAR_BLOCK",
  LAFB: "LEFT_ANTERIOR_FASCICULAR_BLOCK",
  LVH: "LEFT_VENTRICULAR_HYPERTROPHY",
  NSR: "SINUS_RHYTHM",
  NSTEMI: "NSTEMI",
  PATH_Q: "PATHOLOGICAL_Q_WAVES",
  POST_MI: "POSTERIOR_MI",
  RAD: "RIGHT_AXIS_DEVIATION",
  RAE: "RIGHT_ATRIAL_ENLARGEMENT",
  RBBB: "RIGHT_BUNDLE_BRANCH_BLOCK",
  RVH: "RIGHT_VENTRICULAR_HYPERTROPHY",
  SBRAD: "SINUS_BRADYCARDIA",
  STACH: "SINUS_TACHYCARDIA",
  STEMI: "STEMI",
  ST_DEP: "ST_DEPRESSION",
  SVT: "SUPRAVENTRICULAR_TACHYCARDIA",
  T_INV: "T_WAVE_INVERSION",
  VENTRICULAR: "VENTRICULAR_TACHYCARDIA",
};

export function mapKnowledgeDiagnosisId(findingCode: string): string {
  return INTERPRETATION_KNOWLEDGE_CODE_MAP[findingCode] ?? findingCode;
}

export function lookupKnowledgeEntry(
  lookupKnowledge: (code: string) => import("../../clinical-knowledge-engine/types").EcgClinicalKnowledgeEntry | null,
  findingCode: string,
) {
  return lookupKnowledge(mapKnowledgeDiagnosisId(findingCode));
}

export function pickFinding(findings: ClinicalFinding[], codes: string[]): ClinicalFinding | undefined {
  const codeSet = new Set(codes);
  return findings.find((item) => codeSet.has(item.code));
}

export function pickFindingsByCategory(findings: ClinicalFinding[], category: ClinicalFinding["category"]): ClinicalFinding[] {
  return findings.filter((item) => item.category === category);
}

export function highestSeverityFinding(findings: ClinicalFinding[]): ClinicalFinding | undefined {
  const rank: Record<ClinicalFinding["severity"], number> = {
    abnormal: 3,
    critical: 5,
    minor: 2,
    normal: 1,
    urgent: 4,
  };
  return [...findings].sort((left, right) => rank[right.severity] - rank[left.severity] || right.confidence - left.confidence)[0];
}

export function intervalInterpretation(label: string, ms: number, normalMin: number, normalMax: number) {
  if (ms >= normalMin && ms <= normalMax) {
    return { interpretation: `${label} within normal limits (${ms} ms).`, normal: true };
  }
  if (ms < normalMin) {
    return { interpretation: `${label} shortened (${ms} ms; expected ${normalMin}-${normalMax} ms).`, normal: false };
  }
  return { interpretation: `${label} prolonged (${ms} ms; expected ${normalMin}-${normalMax} ms).`, normal: false };
}
