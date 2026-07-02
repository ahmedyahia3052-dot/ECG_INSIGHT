import { defineTopic } from "../topic-factory";

export const troponinTopic = defineTopic({
  domain: "laboratory",
  slug: "troponin",
  title: "Troponin",
  searchTags: ["troponin", "lab", "myocardial-injury", "acs"],
  references: [{ label: "ESC/NACB high-sensitivity troponin guidance", source: "ESC" }],
  sections: {
    definition: "Cardiac troponins are regulatory proteins released into blood when myocardial injury occurs.",
    pathophysiology: "Membrane injury from ischemia, inflammation, or strain allows troponin leak proportional to myocyte damage.",
    classification: "Normal, detectable below URL, rise/fall pattern suggesting acute injury, chronic elevation in structural heart disease.",
    clinicalFeatures: "Troponin elevation is often asymptomatic; interpret with chest pain, dyspnea, or ECG changes.",
    diagnosis: "Serial high-sensitivity troponin with 0/1h or 0/3h algorithms when ACS is suspected.",
    differentialDiagnosis: "ACS, myocarditis, PE, sepsis, renal failure, tachycardia, and contusion.",
    investigations: "Serial troponin, ECG, echocardiography, and imaging guided by presentation.",
    management: "Treat underlying cause; ACS pathway when ischemic presentation and dynamic rise.",
    complications: "Missed MI if single negative troponin without serial testing; overtreatment if context ignored.",
    redFlags: ["Rising troponin with ongoing ischemic symptoms", "Troponin rise with hemodynamic instability"],
    keyPoints: ["Always interpret with ECG and clinical context", "Serial testing improves sensitivity"],
    patientExplanation: "Troponin is a blood test that shows whether heart muscle may have been injured, often used when someone has chest pain.",
    teachingNotes: "Pair troponin kinetics with ECG timing in ACS teaching.",
    clinicalPearls: ["Chronic kidney disease may have baseline elevation", "Demand ischemia can elevate troponin without plaque rupture"],
  },
});

export const laboratoryTopics = [troponinTopic];
