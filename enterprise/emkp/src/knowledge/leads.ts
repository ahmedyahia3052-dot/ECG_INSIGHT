import type { EmkpLeadKnowledge } from "../model/knowledge-model";

export const EMKP_LEAD_KNOWLEDGE: EmkpLeadKnowledge[] = [
  { lead: "I", territory: "Lateral / High lateral", clinicalImportance: "Lateral ischemia, LAD/LCx territory component", viewVector: "0° (horizontal left)", commonFindings: ["Lateral ST changes", "LAFB axis pattern"], associatedDiseases: ["LAT_MI", "LVH", "LAFB", "Pericarditis"] },
  { lead: "II", territory: "Inferior (with III, aVF)", clinicalImportance: "Primary rhythm lead; inferior ischemia", viewVector: "+60°", commonFindings: ["P wave assessment", "Inferior ST elevation/depression", "Sinus rhythm"], associatedDiseases: ["INF_MI", "SBRAD", "STACH", "Pericarditis"] },
  { lead: "III", territory: "Inferior", clinicalImportance: "Inferior MI, RV involvement context", viewVector: "+120°", commonFindings: ["Inferior Q waves", "Reciprocal changes"], associatedDiseases: ["INF_MI", "PE", "RVH"] },
  { lead: "aVR", territory: "Right upper / Global", clinicalImportance: "STEMI reciprocal changes, global ischemia", viewVector: "-150°", commonFindings: ["ST elevation in global ischemia", "Reciprocal ST depression in STEMI"], associatedDiseases: ["STEMI", "Severe triple-vessel disease", "Pericarditis reciprocal"] },
  { lead: "aVL", territory: "High lateral", clinicalImportance: "Lateral MI, LAFB axis reference", viewVector: "-30°", commonFindings: ["Lateral ST elevation", "qR pattern in LAFB"], associatedDiseases: ["LAT_MI", "LAFB", "LVH", "LCx occlusion"] },
  { lead: "aVF", territory: "Inferior", clinicalImportance: "Inferior MI primary lead", viewVector: "+90°", commonFindings: ["Inferior ST elevation", "Flutter waves"], associatedDiseases: ["INF_MI", "AFL", "AIVR post-reperfusion"] },
  { lead: "V1", territory: "Septal / RV / Right ventricle", clinicalImportance: "RBBB morphology, Brugada, RV MI, Posterior MI reciprocal", viewVector: "Right precordial", commonFindings: ["rsR' RBBB", "Brugada coved ST", "Tall R posterior MI"], associatedDiseases: ["RBBB", "BRUGADA", "RVH", "POST_MI", "ANT_MI reciprocal"] },
  { lead: "V2", territory: "Septal / Anterior", clinicalImportance: "Anterior MI, Wellens syndrome", viewVector: "Anterior septum", commonFindings: ["Anterior ST elevation", "Wellens biphasic T", "U waves hypokalemia"], associatedDiseases: ["ANT_MI", "NSTEMI", "HYPOK", "Brugada"] },
  { lead: "V3", territory: "Anterior", clinicalImportance: "Anterior STEMI core lead", viewVector: "Anterior wall", commonFindings: ["ST elevation anterior", "Q waves"], associatedDiseases: ["ANT_MI", "STEMI", "LVH voltage"] },
  { lead: "V4", territory: "Anterior / Apical", clinicalImportance: "Anterior MI, apical ischemia", viewVector: "Anterior apex", commonFindings: ["Anterior ST-T changes", "T wave inversion"], associatedDiseases: ["ANT_MI", "NSTEMI", "LVH strain"] },
  { lead: "V5", territory: "Lateral", clinicalImportance: "Lateral MI, LVH voltage", viewVector: "Lateral wall", commonFindings: ["Lateral ST elevation", "High R wave LVH"], associatedDiseases: ["LAT_MI", "LVH", "LBBB lateral forces"] },
  { lead: "V6", territory: "Lateral", clinicalImportance: "Lateral MI, LVH", viewVector: "Lateral wall", commonFindings: ["Lateral ST changes", "Strain pattern"], associatedDiseases: ["LAT_MI", "LVH", "LBBB"] },
];

export function getLeadKnowledge(lead: string): EmkpLeadKnowledge | undefined {
  return EMKP_LEAD_KNOWLEDGE.find((l) => l.lead === lead);
}
