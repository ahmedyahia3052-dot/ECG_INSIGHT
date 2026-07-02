import { defineTopic } from "../topic-factory";

export const occupationalFitnessTopic = defineTopic({
  domain: "occupational",
  slug: "cardiac-occupational-fitness",
  title: "Cardiac Occupational Fitness",
  searchTags: ["occupational", "fitness-for-work", "safety-sensitive", "cardiac-clearance"],
  references: [{ label: "WHO occupational health principles", source: "WHO" }],
  sections: {
    definition: "Occupational fitness assessment determines whether a worker can safely perform duties without undue risk to self or others.",
    pathophysiology: "Cardiac conditions may impair exertional capacity, cause syncope, or precipitate arrhythmia under workplace stressors.",
    classification: "Safety-sensitive vs non-safety-sensitive roles; sedentary vs heavy exertion job categories.",
    clinicalFeatures: "Symptoms with exertion, syncope, palpitations, or recent cardiac events drive restriction decisions.",
    diagnosis: "Clinical evaluation, ECG, functional capacity testing, and specialist opinion when needed.",
    differentialDiagnosis: "Deconditioning vs true cardiac limitation; non-cardiac causes of exertional symptoms.",
    investigations: "ECG, echocardiography, stress testing, Holter monitoring based on role and findings.",
    management: "Temporary restriction, modified duties, treatment optimization, and reassessment after recovery or therapy.",
    complications: "Sudden incapacitation in safety-critical environments if unfit worker remains on duty.",
    redFlags: ["Recent ACS or decompensated HF", "Unexplained syncope", "Uncontrolled arrhythmia"],
    keyPoints: ["Job demands define fitness criteria", "Document reasoning and follow-up plan"],
    patientExplanation: "Work fitness checks make sure your heart condition is safe for the physical and safety demands of your job.",
    teachingNotes: "Separate medical diagnosis from occupational risk assessment.",
    clinicalPearls: ["Remote site jobs need higher stability margin", "Medication side effects affect alertness and heat tolerance"],
  },
});

export const occupationalTopics = [occupationalFitnessTopic];
