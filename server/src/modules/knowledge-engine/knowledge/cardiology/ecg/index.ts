import { defineTopic } from "../../topic-factory";
import type { MedicalTopicSections } from "../../../types";

function ecgBasicsTopic(slug: string, title: string, tags: string[], sections: Partial<MedicalTopicSections> & Pick<MedicalTopicSections, "definition" | "teachingNotes" | "keyPoints">) {
  return defineTopic({
    domain: "cardiology/ecg",
    slug,
    title,
    searchTags: tags,
    references: [{ label: "AHA/ACCF/HRS ECG standardization recommendations", source: "AHA/ACCF/HRS" }],
    sections: {
      pathophysiology: sections.pathophysiology ?? "See teaching notes for physiological basis.",
      classification: sections.classification ?? "Normal vs abnormal patterns for this ECG element.",
      clinicalFeatures: sections.clinicalFeatures ?? "Clinical correlation depends on the underlying rhythm or structural disease.",
      diagnosis: sections.diagnosis ?? "Assess on standard 12-lead ECG with correct calibration and clinical context.",
      differentialDiagnosis: sections.differentialDiagnosis ?? "Consider artifact, lead misplacement, and baseline abnormality.",
      investigations: sections.investigations ?? "Repeat ECG, compare prior tracings, and add echocardiography or labs when indicated.",
      management: sections.management ?? "Treat the underlying cause; ECG finding alone rarely dictates therapy without clinical correlation.",
      complications: sections.complications ?? "Progression of untreated arrhythmia, ischemia, or conduction disease when relevant.",
      redFlags: sections.redFlags ?? ["Hemodynamic instability", "Syncope", "Ischemic symptoms with ECG changes"],
      patientExplanation: sections.patientExplanation ?? "This part of the heart tracing helps doctors understand rhythm and blood flow to the heart muscle.",
      clinicalPearls: sections.clinicalPearls ?? ["Always confirm technical quality before interpretation"],
      ...sections,
    },
  });
}

export const ecgTopics = [
  ecgBasicsTopic("cardiac-anatomy", "Cardiac Anatomy", ["anatomy", "chambers", "coronary", "ecg-foundation"], {
    definition: "The heart has four chambers and a coordinated electrical system; ECG leads view depolarization from different anatomical angles.",
    teachingNotes: "Relate RA/LA/RV/LV to waves on the tracing before morphology.",
    keyPoints: ["Anatomy explains why leads see different vectors", "Coronary territories map to ST changes"],
    clinicalPearls: ["Think chamber location before interpreting ST changes in a territory"],
  }),
  ecgBasicsTopic("conduction-system", "Electrical Conduction System", ["conduction", "sa-node", "av-node", "bundle"], {
    definition: "Impulse origin at the SA node travels through atria, AV node, His-Purkinje system, and ventricular myocardium.",
    teachingNotes: "Each anatomic segment corresponds to a portion of the waveform.",
    keyPoints: ["AV node provides physiologic delay", "Bundle branch disease widens QRS"],
  }),
  ecgBasicsTopic("ecg-paper", "ECG Paper", ["ecg-paper", "grid", "calibration", "paper-speed"], {
    definition: "Standard ECG paper runs at 25 mm/s with 10 mm/mV gain; each small square is 0.04 s horizontally and 0.1 mV vertically.",
    teachingNotes: "Teach grid reading before rate and interval measurement.",
    keyPoints: ["25 mm/s paper speed", "10 mm/mV standard gain", "Each large square = 0.2 s and 0.5 mV"],
    clinicalPearls: ["Always check calibration mark before measuring intervals"],
  }),
  ecgBasicsTopic("lead-placement", "Lead Placement", ["leads", "limb", "precordial", "v1-v6"], {
    definition: "Limb leads (I, II, III, aVR, aVL, aVF) and precordial leads (V1–V6) sample electrical activity from different spatial vectors.",
    teachingNotes: "Connect lead views to territory before ischemia localization.",
    keyPoints: ["V1–V2 view septum and RV", "V5–V6 view lateral LV", "aVR is opposite to general direction"],
  }),
  ecgBasicsTopic("ecg-waves", "ECG Waves", ["waves", "p-wave", "qrs", "st-segment", "t-wave"], {
    definition: "P wave = atrial depolarization; QRS = ventricular depolarization; ST segment and T wave reflect repolarization.",
    teachingNotes: "Introduce one wave family at a time with normal morphology first.",
    keyPoints: ["P before every QRS in sinus rhythm", "QRS width reflects conduction pathway", "ST-T changes need clinical context"],
  }),
  ecgBasicsTopic("ecg-intervals", "ECG Intervals", ["intervals", "pr", "qrs", "qt", "qtc"], {
    definition: "PR reflects AV conduction; QRS reflects ventricular depolarization width; QT reflects repolarization duration.",
    teachingNotes: "Measure intervals only after confirming rate and rhythm.",
    keyPoints: ["Normal PR roughly 120–200 ms", "Wide QRS suggests ventricular or BBB conduction", "Correct QT for heart rate (QTc)"],
    clinicalPearls: ["QTc prolongation increases torsades risk"],
  }),
  ecgBasicsTopic("axis", "Electrical Axis", ["axis", "frontal-plane", "lead-i", "avf"], {
    definition: "Frontal plane axis is estimated from net QRS direction in limb leads, typically using leads I and aVF.",
    teachingNotes: "Use quadrant method before advanced vector concepts.",
    keyPoints: ["Normal axis roughly −30° to +90°", "LAD may suggest LVH or conduction disease", "RAD may suggest RV strain"],
  }),
  ecgBasicsTopic("ventricular-hypertrophy", "Ventricular Hypertrophy", ["hypertrophy", "lvh", "rvh", "voltage"], {
    definition: "Ventricular hypertrophy produces increased QRS voltage and repolarization strain patterns on ECG.",
    teachingNotes: "Link LVH to chronic pressure/volume overload before criteria memorization.",
    keyPoints: ["Voltage criteria suggest but do not confirm hypertrophy", "Echo confirms structural hypertrophy", "Strain pattern supports LVH"],
    clinicalPearls: ["LVH on ECG warrants BP control and echo correlation"],
  }),
  ecgBasicsTopic("bundle-branch-block", "Bundle Branch Block", ["bbb", "lbbb", "rbbb", "wide-qrs"], {
    definition: "Bundle branch block delays ventricular depolarization on one side, producing wide QRS with characteristic morphology.",
    teachingNotes: "Compare LBBB vs RBBB patterns in V1 and V6.",
    keyPoints: ["QRS ≥120 ms defines BBB", "LBBB may mask ischemia — know Sgarbossa criteria", "New LBBB with ischemia is concerning"],
  }),
  ecgBasicsTopic("rhythm", "Rhythm Assessment", ["rhythm", "sinus", "regularity", "af", "arrhythmia"], {
    definition: "Rhythm analysis determines whether P waves precede each QRS in a regular pattern and whether rate is physiologic.",
    teachingNotes: "Teach regularity before naming arrhythmias.",
    keyPoints: ["Irregularly irregular suggests AF", "Regular wide-complex tachycardia is VT until proven otherwise"],
    pathophysiology: "Abnormal impulse formation or conduction produces arrhythmias with distinct ECG signatures.",
  }),
  ecgBasicsTopic("st-segment", "ST Segment", ["st-segment", "stemi", "ischemia", "pericarditis"], {
    definition: "The ST segment represents early ventricular repolarization; deviation may indicate ischemia, injury, pericarditis, or repolarization variants.",
    teachingNotes: "Cover normal ST morphology before STEMI patterns in advanced modules.",
    keyPoints: ["ST elevation location maps to territory", "Reciprocal change supports ischemia"],
    redFlags: ["Persistent ST elevation with ischemic symptoms", "Diffuse ST elevation with PR depression"],
    clinicalPearls: ["STEMI is a clinical and ECG diagnosis — activate reperfusion pathways promptly"],
  }),
  ecgBasicsTopic("systematic-ecg-interpretation", "Systematic ECG Interpretation", ["systematic", "interpretation", "ecg-approach"], {
    definition: "A structured approach: rate, rhythm, axis, intervals, conduction, ST-T changes, compare prior ECGs, and integrate clinical context.",
    teachingNotes: "Use the same order every time to avoid missing critical findings.",
    keyPoints: ["Rate and rhythm first", "Compare with prior tracings", "Never interpret in clinical isolation"],
    clinicalPearls: ["Write down the rate calculation", "Check lead placement when axis or morphology seems impossible"],
  }),
];
