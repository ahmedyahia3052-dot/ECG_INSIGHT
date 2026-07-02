import { defineTopic } from "../topic-factory";

export const afAnticoagulationGuidelineTopic = defineTopic({
  domain: "guidelines",
  slug: "af-anticoagulation",
  title: "Atrial Fibrillation Anticoagulation Guidelines",
  searchTags: ["guidelines", "af", "anticoagulation", "cha2ds2-vasc", "has-bled", "esc", "aha"],
  references: [
    { label: "2023 ACC/AHA/HRS AF guideline", source: "ACC/AHA/HRS" },
    { label: "ESC AF guideline", source: "ESC" },
  ],
  sections: {
    definition: "Guidelines recommend stroke risk stratification and anticoagulation for eligible patients with atrial fibrillation.",
    pathophysiology: "Atrial stasis promotes left atrial appendage thrombus formation; anticoagulation reduces embolic stroke risk.",
    classification: "CHA2DS2-VASc for stroke risk; HAS-BLED for bleeding risk; valvular vs non-valvular AF pathways.",
    clinicalFeatures: "Guideline application requires confirmed AF and assessment of bleeding and fall risk.",
    diagnosis: "Document AF type and duration; exclude reversible causes before long-term strategy.",
    differentialDiagnosis: "Low stroke risk rhythm variants still require individualized assessment.",
    investigations: "Renal function, liver disease assessment, medication review, and baseline CBC when starting OAC.",
    management: "DOAC preferred in eligible non-valvular AF; warfarin when indicated; reassess annually.",
    complications: "Stroke if undertreated; major bleeding if overtreated without monitoring.",
    redFlags: ["Active major bleeding", "Mechanical valve on inappropriate agent", "New neurologic deficit"],
    keyPoints: ["Stroke prevention benefit usually outweighs bleeding risk in moderate-high CHA2DS2-VASc", "Shared decision-making is recommended"],
    patientExplanation: "Guidelines help doctors balance stroke prevention with bleeding risk when choosing blood thinners for atrial fibrillation.",
    teachingNotes: "Teach CHA2DS2-VASc components only after AF diagnosis is understood.",
    clinicalPearls: ["Age and sex contribute to CHA2DS2-VASc even without other comorbidities", "DOAC dose adjust for renal function"],
  },
});

export const guidelineTopics = [afAnticoagulationGuidelineTopic];
