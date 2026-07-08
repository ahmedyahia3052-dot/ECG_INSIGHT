import type { EmkpDifferentialNode } from "../model/knowledge-model";

export const EMKP_DIFFERENTIAL_TREES: EmkpDifferentialNode[] = [
  {
    nodeId: "ROOT-ST-ELEVATION",
    label: "ST Elevation",
    children: [
      { nodeId: "STE-STEMI", label: "STEMI", diagnosisCode: "STEMI", distinguishingFeatures: ["Territorial distribution", "Reciprocal depression", "Elevated troponin"], children: [
        { nodeId: "STE-ANT", label: "Anterior MI", diagnosisCode: "ANT_MI", children: [] },
        { nodeId: "STE-INF", label: "Inferior MI", diagnosisCode: "INF_MI", children: [] },
        { nodeId: "STE-LAT", label: "Lateral MI", diagnosisCode: "LAT_MI", children: [] },
      ]},
      { nodeId: "STE-PERIC", label: "Pericarditis", diagnosisCode: "PERICARDITIS", distinguishingFeatures: ["Diffuse leads", "PR depression", "Concave ST"], children: [] },
      { nodeId: "STE-ER", label: "Early Repolarization", diagnosisCode: "EARLY_REPOL", distinguishingFeatures: ["J-point notching", "Young male", "Stable pattern"], children: [] },
      { nodeId: "STE-LVH", label: "LVH Strain", diagnosisCode: "LVH", distinguishingFeatures: ["Voltage criteria", "Strain pattern", "Chronic"], children: [] },
      { nodeId: "STE-BBB", label: "Bundle Branch Block", diagnosisCode: "LBBB", distinguishingFeatures: ["Wide QRS", "Discordant ST-T"], children: [] },
      { nodeId: "STE-BRUG", label: "Brugada", diagnosisCode: "BRUGADA", distinguishingFeatures: ["Coved ST V1–V3", "RBBB pattern"], children: [] },
    ],
  },
  {
    nodeId: "ROOT-ST-DEPRESSION",
    label: "ST Depression",
    children: [
      { nodeId: "STD-NSTEMI", label: "NSTEMI", diagnosisCode: "NSTEMI", children: [] },
      { nodeId: "STD-POST", label: "Posterior MI", diagnosisCode: "POST_MI", distinguishingFeatures: ["Tall R V1–V2", "Confirm V7–V9"], children: [] },
      { nodeId: "STD-DEMAND", label: "Demand Ischemia", children: [] },
      { nodeId: "STD-DIG", label: "Digoxin Effect", children: [] },
      { nodeId: "STD-HYPOK", label: "Hypokalemia", diagnosisCode: "HYPOK", children: [] },
    ],
  },
  {
    nodeId: "ROOT-TACHYCARDIA",
    label: "Tachycardia",
    children: [
      { nodeId: "TACH-NARROW", label: "Narrow QRS Tachycardia", children: [
        { nodeId: "TACH-STACH", label: "Sinus Tachycardia", diagnosisCode: "STACH", children: [] },
        { nodeId: "TACH-SVT", label: "SVT", diagnosisCode: "SVT", children: [
          { nodeId: "TACH-AVNRT", label: "AVNRT", diagnosisCode: "AVNRT", children: [] },
          { nodeId: "TACH-AVRT", label: "AVRT", diagnosisCode: "AVRT", children: [] },
        ]},
        { nodeId: "TACH-AF", label: "Atrial Fibrillation", diagnosisCode: "AF", children: [] },
        { nodeId: "TACH-AFL", label: "Atrial Flutter", diagnosisCode: "AFL", children: [] },
      ]},
      { nodeId: "TACH-WIDE", label: "Wide QRS Tachycardia", children: [
        { nodeId: "TACH-VT", label: "Ventricular Tachycardia", diagnosisCode: "VT", children: [] },
        { nodeId: "TACH-SVT-ABERR", label: "SVT with Aberrancy", children: [] },
        { nodeId: "TACH-ANTIDROMIC", label: "Antidromic WPW", diagnosisCode: "AVRT", children: [] },
      ]},
    ],
  },
  {
    nodeId: "ROOT-BRADYCARDIA",
    label: "Bradycardia",
    children: [
      { nodeId: "BRAD-SBRAD", label: "Sinus Bradycardia", diagnosisCode: "SBRAD", children: [] },
      { nodeId: "BRAD-JUNC", label: "Junctional Rhythm", diagnosisCode: "JUNCTIONAL", children: [] },
      { nodeId: "BRAD-AVB", label: "AV Block", children: [
        { nodeId: "BRAD-AVB1", label: "First Degree", diagnosisCode: "AVB1", children: [] },
        { nodeId: "BRAD-AVB2I", label: "Second Degree Type I", diagnosisCode: "AVB2I", children: [] },
        { nodeId: "BRAD-AVB2II", label: "Second Degree Type II", diagnosisCode: "AVB2II", children: [] },
        { nodeId: "BRAD-AVB3", label: "Third Degree", diagnosisCode: "AVB3", children: [] },
      ]},
      { nodeId: "BRAD-IVR", label: "Idioventricular Rhythm", diagnosisCode: "IVR", children: [] },
    ],
  },
  {
    nodeId: "ROOT-WIDE-QRS",
    label: "Wide QRS",
    children: [
      { nodeId: "WIDE-RBBB", label: "RBBB", diagnosisCode: "RBBB", children: [] },
      { nodeId: "WIDE-LBBB", label: "LBBB", diagnosisCode: "LBBB", children: [] },
      { nodeId: "WIDE-WPW", label: "WPW", diagnosisCode: "WPW", children: [] },
      { nodeId: "WIDE-HYPERK", label: "Hyperkalemia", diagnosisCode: "HYPERK", children: [] },
      { nodeId: "WIDE-VT", label: "VT", diagnosisCode: "VT", children: [] },
      { nodeId: "WIDE-PACE", label: "Pacemaker", diagnosisCode: "PACEMAKER", children: [] },
    ],
  },
  {
    nodeId: "ROOT-QT",
    label: "QT Abnormality",
    children: [
      { nodeId: "QT-LONG", label: "Long QT", diagnosisCode: "LONG_QT", children: [] },
      { nodeId: "QT-SHORT", label: "Short QT", diagnosisCode: "SHORT_QT", children: [] },
      { nodeId: "QT-HYPOCAL", label: "Hypocalcemia", diagnosisCode: "HYPOCAL", children: [] },
      { nodeId: "QT-HYPOK", label: "Hypokalemia", diagnosisCode: "HYPOK", children: [] },
      { nodeId: "QT-DRUG", label: "Drug Effect", children: [] },
    ],
  },
];

export function flattenDifferentialTree(node: EmkpDifferentialNode): EmkpDifferentialNode[] {
  return [node, ...node.children.flatMap(flattenDifferentialTree)];
}
