import type { EcgEducationNode } from "../../types";

/** Sprint 5 ECG Tutor curriculum — 13 progressive lessons. */
export const ECG_TUTOR_CURRICULUM = [
  "Cardiac Anatomy",
  "Electrical Conduction",
  "ECG Paper",
  "Leads",
  "Waves",
  "Intervals",
  "Axis",
  "Hypertrophy",
  "Bundle Branch Block",
  "Arrhythmias",
  "STEMI",
  "NSTEMI",
  "Clinical Interpretation",
] as const;

export const ECG_EDUCATION_TREE: EcgEducationNode[] = [
  { id: "ecg-root", order: 0, parentId: null, slug: "ecg", teachingFocus: "Overview of systematic ECG interpretation", title: "ECG" },
  { id: "ecg-anatomy", order: 1, parentId: "ecg-root", slug: "cardiac-anatomy", teachingFocus: "Chambers, valves, coronary supply, and how anatomy maps to leads", title: "Cardiac Anatomy", topicSlug: "cardiac-anatomy" },
  { id: "ecg-conduction", order: 2, parentId: "ecg-anatomy", slug: "conduction-system", teachingFocus: "SA node, AV node, bundle branches, and depolarization sequence", title: "Electrical Conduction", topicSlug: "conduction-system" },
  { id: "ecg-paper", order: 3, parentId: "ecg-conduction", slug: "ecg-paper", teachingFocus: "Paper speed, time calibration, grid squares, and standard gain", title: "ECG Paper", topicSlug: "ecg-paper" },
  { id: "ecg-leads", order: 4, parentId: "ecg-paper", slug: "lead-placement", teachingFocus: "Limb and precordial lead positions and the views they represent", title: "Leads", topicSlug: "lead-placement" },
  { id: "ecg-waves", order: 5, parentId: "ecg-leads", slug: "ecg-waves", teachingFocus: "P wave, QRS complex, ST segment, and T wave — formation and normal morphology", title: "Waves", topicSlug: "ecg-waves" },
  { id: "ecg-intervals", order: 6, parentId: "ecg-waves", slug: "ecg-intervals", teachingFocus: "PR, QRS, and QT/QTc intervals — measurement and clinical meaning", title: "Intervals", topicSlug: "ecg-intervals" },
  { id: "ecg-axis", order: 7, parentId: "ecg-intervals", slug: "axis", teachingFocus: "Frontal plane axis using leads I and aVF", title: "Axis", topicSlug: "axis" },
  { id: "ecg-hypertrophy", order: 8, parentId: "ecg-axis", slug: "ventricular-hypertrophy", teachingFocus: "LVH and RVH voltage criteria and clinical correlation", title: "Hypertrophy", topicSlug: "ventricular-hypertrophy" },
  { id: "ecg-bbb", order: 9, parentId: "ecg-hypertrophy", slug: "bundle-branch-block", teachingFocus: "Left and right bundle branch block patterns and wide QRS morphology", title: "Bundle Branch Block", topicSlug: "bundle-branch-block" },
  { id: "ecg-arrhythmias", order: 10, parentId: "ecg-bbb", slug: "arrhythmias", teachingFocus: "Sinus rhythm, AF, flutter, SVT, and ventricular arrhythmias on ECG", title: "Arrhythmias", topicSlug: "rhythm" },
  { id: "ecg-stemi", order: 11, parentId: "ecg-arrhythmias", slug: "stemi", teachingFocus: "ST elevation patterns, territorial localization, and reperfusion urgency", title: "STEMI", topicSlug: "st-segment" },
  { id: "ecg-nstemi", order: 12, parentId: "ecg-stemi", slug: "nstemi", teachingFocus: "NSTEMI vs unstable angina, troponin kinetics, and invasive strategy", title: "NSTEMI", topicSlug: "acute-coronary-syndrome" },
  { id: "ecg-clinical", order: 13, parentId: "ecg-nstemi", slug: "clinical-interpretation", teachingFocus: "Rate, rhythm, axis, intervals, ST-T, compare priors, and integrate clinical context", title: "Clinical Interpretation", topicSlug: "systematic-ecg-interpretation" },
];

export const ECG_FOUNDATION_STEP_LABELS = ECG_TUTOR_CURRICULUM;

export function ecgEducationNodeByStep(step: number): EcgEducationNode | null {
  if (step <= 0) return ECG_EDUCATION_TREE.find((node) => node.order === 1) ?? null;
  return ECG_EDUCATION_TREE.find((node) => node.order === step) ?? ECG_EDUCATION_TREE.at(-1) ?? null;
}

export function ecgEducationNodeBySlug(slug: string): EcgEducationNode | null {
  return ECG_EDUCATION_TREE.find((node) => node.slug === slug) ?? null;
}

export function ecgEducationNextStepLabel(step: number): string | null {
  const next = ecgEducationNodeByStep(step + 1);
  return next?.title ?? null;
}
