import { defineTopic } from "../topic-factory";

export const cxrTopic = defineTopic({
  domain: "radiology",
  slug: "chest-xray-basics",
  title: "Chest X-ray Basics",
  searchTags: ["cxr", "radiology", "consolidation", "pleural-effusion", "cardiomegaly"],
  references: [{ label: "Fleischner Society chest imaging principles", source: "Radiology reference" }],
  sections: {
    definition: "Chest radiography provides a two-dimensional projection of lungs, pleura, mediastinum, and cardiac silhouette.",
    pathophysiology: "Air, soft tissue, fluid, and bone attenuate X-rays differently, producing recognizable patterns of disease.",
    classification: "PA vs AP views; portable vs standard; patterns include consolidation, interstitial change, effusion, pneumothorax.",
    clinicalFeatures: "Imaging complements dyspnea, cough, chest pain, and hypoxia assessment.",
    diagnosis: "Systematic review: quality, airway, breathing, circulation, bones, extras.",
    differentialDiagnosis: "Pneumonia vs atelectasis vs pulmonary edema vs mass depending on pattern.",
    investigations: "CT chest when CXR indeterminate or high clinical suspicion persists.",
    management: "Treat underlying pulmonary or cardiac cause identified on imaging.",
    complications: "Missed pneumothorax on supine films; delayed diagnosis if clinical correlation omitted.",
    redFlags: ["Tension pneumothorax signs", "Massive effusion with respiratory compromise"],
    keyPoints: ["Check rotation and inspiration", "Compare with prior films"],
    patientExplanation: "A chest X-ray is a quick picture of the lungs and heart that helps doctors look for infection, fluid, or heart enlargement.",
    teachingNotes: "Use CXR after learners understand basic cardiopulmonary exam findings.",
    clinicalPearls: ["AP films exaggerate cardiac size", "Silhouette sign localizes pathology"],
  },
});

export const radiologyTopics = [cxrTopic];
