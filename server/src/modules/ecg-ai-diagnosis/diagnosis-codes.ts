export const AI_DIAGNOSIS_LABELS = [
  "Normal ECG",
  "Atrial Fibrillation",
  "Atrial Flutter",
  "PAC",
  "PVC",
  "SVT",
  "VT",
  "VF",
  "Sinus Bradycardia",
  "Sinus Tachycardia",
  "RBBB",
  "LBBB",
  "LVH",
  "RVH",
  "Anterior STEMI",
  "Inferior STEMI",
  "Lateral STEMI",
  "Posterior MI",
  "NSTEMI pattern",
  "Hyperkalemia",
  "Hypokalemia",
] as const;

export type AiDiagnosisLabel = (typeof AI_DIAGNOSIS_LABELS)[number];

export const RULE_CODE_TO_LABEL: Record<string, AiDiagnosisLabel> = {
  AF: "Atrial Fibrillation",
  AFL: "Atrial Flutter",
  ANT_MI: "Anterior STEMI",
  AVB2II: "NSTEMI pattern",
  HYPERK: "Hyperkalemia",
  HYPOK: "Hypokalemia",
  INF_MI: "Inferior STEMI",
  LAT_MI: "Lateral STEMI",
  LBBB: "LBBB",
  LVH: "LVH",
  NSR: "Normal ECG",
  NSTEMI: "NSTEMI pattern",
  PAC: "PAC",
  POST_MI: "Posterior MI",
  PVC: "PVC",
  RBBB: "RBBB",
  RVH: "RVH",
  SBRAD: "Sinus Bradycardia",
  STEMI: "Anterior STEMI",
  STACH: "Sinus Tachycardia",
  SVT: "SVT",
  VENTRICULAR: "VT",
};

export const ONNX_LABEL_TO_DIAGNOSIS: Record<string, AiDiagnosisLabel> = {
  atrial_fibrillation: "Atrial Fibrillation",
  left_bundle_branch_block: "LBBB",
  myocardial_infarction: "Anterior STEMI",
  normal_ecg: "Normal ECG",
  right_bundle_branch_block: "RBBB",
};

export function normalizeLabel(label: string): AiDiagnosisLabel | null {
  const direct = AI_DIAGNOSIS_LABELS.find((item) => item.toLowerCase() === label.toLowerCase());
  if (direct) return direct;
  const rule = RULE_CODE_TO_LABEL[label];
  if (rule) return rule;
  if (label === "Myocardial Infarction") return "Anterior STEMI";
  if (label === "STEMI") return "Anterior STEMI";
  if (label === "NSTEMI") return "NSTEMI pattern";
  if (label === "Normal Sinus Rhythm") return "Normal ECG";
  return null;
}
