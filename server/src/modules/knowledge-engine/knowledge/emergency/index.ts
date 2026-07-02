import { defineTopic } from "../topic-factory";

export const chestPainEmergencyTopic = defineTopic({
  domain: "emergency",
  slug: "chest-pain-emergency",
  title: "Chest Pain Emergency Assessment",
  searchTags: ["chest-pain", "emergency", "acs", "dissection", "pe"],
  references: [{ label: "AHA chest pain guideline", source: "AHA" }],
  sections: {
    definition: "Acute chest pain requires rapid assessment for life-threatening causes including ACS, aortic dissection, PE, tension pneumothorax, and esophageal rupture.",
    pathophysiology: "Ischemia, vascular rupture, embolism, or pleural/airway catastrophe produces pain through distinct mechanisms with overlapping presentations.",
    classification: "Cardiac, vascular, pulmonary, gastrointestinal, musculoskeletal, and psychogenic categories by likelihood and acuity.",
    clinicalFeatures: "Pressure, tearing pain, pleuritic pain, dyspnea, syncope, diaphoresis, hemodynamic instability.",
    diagnosis: "Immediate ECG, troponin, vitals, targeted history/exam, and imaging based on pre-test probability.",
    differentialDiagnosis: "ACS, dissection, PE, pericarditis, pneumothorax, GERD, costochondritis.",
    investigations: "ECG, troponin, CXR, D-dimer/CTPA when PE suspected, CT aortography when dissection suspected.",
    management: "Stabilize ABCs, aspirin when ACS suspected without contraindication, anticoagulation only when appropriate, specialty escalation.",
    complications: "Death, shock, arrhythmia, stroke, and respiratory failure depending on cause.",
    redFlags: ["Hypotension", "Tearing pain radiating to back", "Unequal pulses", "New murmur", "Hemodynamic collapse"],
    keyPoints: ["ECG within 10 minutes", "Do not miss dissection or PE in atypical pain"],
    patientExplanation: "Sudden or severe chest pain needs urgent assessment because several serious conditions can cause it, even if it turns out to be less dangerous.",
    teachingNotes: "Use structured red-flag screening before narrowing to ACS alone.",
    clinicalPearls: ["A normal initial troponin does not exclude evolving ACS", "Consider dual pathology in high-risk patients"],
  },
});

export const emergencyTopics = [chestPainEmergencyTopic];
