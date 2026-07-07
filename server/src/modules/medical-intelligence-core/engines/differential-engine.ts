import { MIC_DIAGNOSIS_BY_CODE, MIC_DIAGNOSIS_CATALOG } from "../data/diagnoses";
import type { MicDifferentialResult } from "../types";

/** Finding-to-diagnosis affinity weights for differential ranking */
const FINDING_AFFINITIES: Record<string, Array<{ code: string; weight: number; features: string[] }>> = {
  ST_ELEVATION: [
    { code: "STEMI_ANT", weight: 0.85, features: ["Precordial ST elevation"] },
    { code: "STEMI_INF", weight: 0.82, features: ["Inferior ST elevation"] },
    { code: "STEMI_LAT", weight: 0.78, features: ["Lateral ST elevation"] },
    { code: "STEMI_POST", weight: 0.7, features: ["Posterior reciprocal pattern"] },
    { code: "STEMI_RV", weight: 0.65, features: ["Inferior STEMI with hypotension"] },
  ],
  ST_DEPRESSION: [
    { code: "NSTEMI", weight: 0.8, features: ["Ischemic ST depression"] },
    { code: "ST_DEP", weight: 0.75, features: ["Subendocardial ischemia pattern"] },
    { code: "STEMI_POST", weight: 0.55, features: ["Reciprocal anterior depression"] },
    { code: "LVH", weight: 0.35, features: ["Strain pattern"] },
  ],
  T_WAVE_INVERSION: [
    { code: "T_WAVE", weight: 0.78, features: ["Primary T inversion"] },
    { code: "NSTEMI", weight: 0.72, features: ["Evolved ischemia"] },
    { code: "LVH", weight: 0.4, features: ["Secondary strain"] },
  ],
  IRREGULAR_RHYTHM: [
    { code: "AF", weight: 0.88, features: ["Irregularly irregular rhythm"] },
    { code: "AFL", weight: 0.55, features: ["Regularly irregular if variable block"] },
    { code: "PAC", weight: 0.3, features: ["Premature beats"] },
  ],
  WIDE_QRS_TACHYCARDIA: [
    { code: "VT", weight: 0.9, features: ["Wide complex tachycardia"] },
    { code: "SVT", weight: 0.35, features: ["SVT with aberrancy"] },
  ],
  BRADYCARDIA: [
    { code: "SBRAD", weight: 0.75, features: ["Sinus bradycardia"] },
    { code: "AVB3", weight: 0.7, features: ["Complete heart block"] },
    { code: "AVB2II", weight: 0.6, features: ["Mobitz II"] },
  ],
  PROLONGED_PR: [
    { code: "AVB1", weight: 0.85, features: ["First-degree AV block"] },
    { code: "AVB2I", weight: 0.5, features: ["Wenckebach progression"] },
  ],
  PVC: [{ code: "PVC", weight: 0.9, features: ["Premature wide QRS"] }],
  PAC: [{ code: "PAC", weight: 0.9, features: ["Premature P wave"] }],
};

function normalizeFinding(finding: string): string {
  return finding.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

/** Module 6 — Differential Diagnosis Engine */
export function buildDifferentialForFinding(finding: string, limit = 5): MicDifferentialResult[] {
  const key = normalizeFinding(finding);
  const affinities = FINDING_AFFINITIES[key];

  if (!affinities?.length) {
    return MIC_DIAGNOSIS_CATALOG.slice(0, limit).map((entry, index) => ({
      code: entry.code,
      label: entry.name,
      confidence: Math.max(0.15, 0.4 - index * 0.05),
      rank: index + 1,
      rationale: "Low-confidence broad differential; refine with structured finding code.",
      distinguishingFeatures: entry.typicalFindings.slice(0, 2),
    }));
  }

  const totalWeight = affinities.reduce((sum, item) => sum + item.weight, 0);

  return affinities
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((item, index) => {
      const diagnosis = MIC_DIAGNOSIS_BY_CODE.get(item.code);
      const confidence = Number((item.weight / totalWeight).toFixed(3));
      return {
        code: item.code,
        label: diagnosis?.name ?? item.code,
        confidence,
        rank: index + 1,
        rationale: diagnosis?.definition ?? "Matched by structured finding affinity.",
        distinguishingFeatures: item.features,
      };
    });
}

export function buildDifferentialForDiagnosisCode(code: string): MicDifferentialResult[] {
  const diagnosis = MIC_DIAGNOSIS_BY_CODE.get(code.toUpperCase());
  if (!diagnosis) return [];

  return diagnosis.differentialDiagnosis.map((label, index) => {
    const match = MIC_DIAGNOSIS_CATALOG.find(
      (entry) => entry.name.toLowerCase() === label.toLowerCase() || entry.code === label,
    );
    const confidence = Number((0.7 - index * 0.1).toFixed(2));
    return {
      code: match?.code ?? label,
      label: match?.name ?? label,
      confidence: Math.max(confidence, 0.2),
      rank: index + 1,
      rationale: `Listed differential for ${diagnosis.name}.`,
      distinguishingFeatures: match?.diagnosticCriteria.slice(0, 2) ?? [],
    };
  });
}

export { FINDING_AFFINITIES };
