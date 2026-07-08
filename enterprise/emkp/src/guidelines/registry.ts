import type { EmkpGuidelineReference } from "../model/knowledge-model";

export const EMKP_GUIDELINE_REGISTRY: EmkpGuidelineReference[] = [
  { organization: "ESC", documentId: "ESC-ACS-2023", title: "2023 ESC Guidelines for the Management of Acute Coronary Syndromes", year: 2023, evidenceLevel: "A" },
  { organization: "ESC", documentId: "ESC-SYNC-2018", title: "2018 ESC Guidelines for the Diagnosis and Management of Syncope", year: 2018, evidenceLevel: "B" },
  { organization: "ESC", documentId: "ESC-VT-VF-2022", title: "2022 ESC Guidelines for Ventricular Arrhythmias and Sudden Cardiac Death", year: 2022, evidenceLevel: "A" },
  { organization: "AHA", documentId: "AHA-ECG-2009", title: "AHA/ACCF/HRS Recommendations for Standardization and Interpretation of the Electrocardiogram", year: 2009, evidenceLevel: "A" },
  { organization: "ACC/AHA", documentId: "ACC-AHA-AF-2023", title: "2023 ACC/AHA/ACCP/HRS Guideline for Atrial Fibrillation", year: 2023, evidenceLevel: "A" },
  { organization: "ACC/AHA", documentId: "ACC-AHA-HF-2022", title: "2022 AHA/ACC/HFSA Guideline for Heart Failure", year: 2022, evidenceLevel: "A" },
  { organization: "UDMI", documentId: "UDMI-4TH-2018", title: "Fourth Universal Definition of Myocardial Infarction (ESC/AHA/ACC/WHF)", year: 2018, evidenceLevel: "A" },
  { organization: "IEC", documentId: "IEC-60601-2-25", title: "IEC 60601-2-25:2011 — Particular Requirements for ECG Equipment", year: 2011, evidenceLevel: "A" },
  { organization: "WHF", documentId: "WHF-UDMI-2018", title: "WHF Contribution to Universal Definition of MI", year: 2018, evidenceLevel: "A" },
  { organization: "HRS", documentId: "HRS-PACE-2018", title: "2018 ACC/AHA/HRS Guideline on Evaluation and Management of Bradycardia and Cardiac Conduction Delay", year: 2018, evidenceLevel: "A" },
];

export const GUIDELINE_DIAGNOSIS_MAP: Record<string, string[]> = {
  "ESC-ACS-2023": ["STEMI", "NSTEMI", "ANT_MI", "INF_MI", "LAT_MI", "POST_MI", "PERICARDITIS"],
  "UDMI-4TH-2018": ["STEMI", "NSTEMI", "ANT_MI", "INF_MI", "LAT_MI", "POST_MI", "AIVR"],
  "ACC-AHA-AF-2023": ["AF", "AFL", "PAC"],
  "AHA-ECG-2009": ["NORMAL_ECG", "NSR", "RBBB", "LBBB", "LVH", "RVH", "WPW", "LONG_QT"],
  "ESC-SYNC-2018": ["VT", "VF", "AVB3", "AVB2II", "SVT", "AVNRT", "AVRT", "BRUGADA"],
  "IEC-60601-2-25": ["NORMAL_ECG", "PACEMAKER"],
  "HRS-PACE-2018": ["AVB1", "AVB2I", "AVB2II", "AVB3", "BBB_ESCAPE", "PACEMAKER"],
};

export function getGuidelinesForDiagnosis(code: string): EmkpGuidelineReference[] {
  const docIds = Object.entries(GUIDELINE_DIAGNOSIS_MAP)
    .filter(([, codes]) => codes.includes(code))
    .map(([docId]) => docId);
  return EMKP_GUIDELINE_REGISTRY.filter((g) => docIds.includes(g.documentId));
}
