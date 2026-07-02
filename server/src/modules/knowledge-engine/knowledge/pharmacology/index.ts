import { defineTopic } from "../topic-factory";

export const betaBlockerTopic = defineTopic({
  domain: "pharmacology",
  slug: "beta-blockers",
  title: "Beta Blockers",
  searchTags: ["beta-blocker", "metoprolol", "bisoprolol", "bradycardia", "drug"],
  references: [{ label: "ACC/AHA pharmacotherapy guidance", source: "ACC/AHA" }],
  sections: {
    definition: "Beta blockers antagonize beta-adrenergic receptors, reducing heart rate, contractility, and renin release.",
    pathophysiology: "Blockade of beta-1 receptors decreases automaticity and AV conduction; beta-2 blockade may affect bronchial tone.",
    classification: "Cardioselective vs non-selective; intrinsic sympathomimetic activity; alpha-blocking properties (e.g., carvedilol).",
    clinicalFeatures: "Therapeutic effects include rate control and afterload reduction; adverse effects include fatigue, bradycardia, and bronchospasm.",
    diagnosis: "Clinical indication and toxicity are supported by symptoms, vitals, ECG, and medication history.",
    differentialDiagnosis: "Other causes of bradycardia or hypotension when toxicity suspected.",
    investigations: "ECG for bradycardia/AV block, glucose in hypoglycemia-prone patients, renal/hepatic function for dosing.",
    management: "Continue GDMT in stable HF/ACS when indicated; hold or reduce dose with symptomatic bradycardia or bronchospasm.",
    complications: "Severe bradycardia, heart block, hypotension, bronchospasm, and masked hypoglycemia symptoms.",
    redFlags: ["Syncope with bradycardia", "High-grade AV block", "Severe bronchospasm"],
    keyPoints: ["Do not stop abruptly in ischemic heart disease without plan", "ECG-relevant bradycardia and AV block are key monitoring targets"],
    patientExplanation: "These medicines slow the heart and reduce its workload. They help after heart attacks and in heart failure, but can cause tiredness or slow pulse.",
    teachingNotes: "Connect ECG bradycardia/AV block findings to drug effect during case discussions.",
    clinicalPearls: ["Carvedilol adds alpha blockade", "Selective agents may be preferred in mild reactive airway disease with monitoring"],
  },
});

export const pharmacologyTopics = [betaBlockerTopic];
