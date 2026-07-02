import { defineTopic } from "../topic-factory";

export const diabetesTopic = defineTopic({
  domain: "internal-medicine",
  slug: "type-2-diabetes",
  title: "Type 2 Diabetes",
  searchTags: ["diabetes", "hyperglycemia", "hba1c", "cardiovascular-risk"],
  references: [{ label: "ADA Standards of Care", source: "ADA" }],
  sections: {
    definition: "Type 2 diabetes is a metabolic disorder of insulin resistance and relative insulin deficiency leading to chronic hyperglycemia.",
    pathophysiology: "Progressive beta-cell dysfunction and peripheral insulin resistance increase glucose and cardiovascular risk.",
    classification: "Prediabetes, type 2 diabetes, and diabetes with complications (microvascular and macrovascular).",
    clinicalFeatures: "Polyuria, polydipsia, weight change, fatigue, or asymptomatic detection on screening.",
    diagnosis: "HbA1c ≥6.5%, fasting glucose criteria, or OGTT; confirm unless acute hyperglycemia with symptoms.",
    differentialDiagnosis: "Type 1 diabetes, MODY, medication-induced hyperglycemia, and stress hyperglycemia.",
    investigations: "HbA1c, renal function, lipids, urine albumin, foot and retinal screening.",
    management: "Lifestyle therapy, metformin first-line when appropriate, cardiovascular and renal risk-based add-on therapy.",
    complications: "Nephropathy, retinopathy, neuropathy, ASCVD, and foot ulceration.",
    redFlags: ["DKA/HHS features", "Hypoglycemia with altered consciousness", "Foot infection with systemic signs"],
    keyPoints: ["Cardiovascular risk reduction is central", "Screen for complications annually"],
    patientExplanation: "Diabetes means blood sugar stays too high over time, which can affect kidneys, eyes, nerves, and the heart if not managed.",
    teachingNotes: "Link glucose control to silent ischemia and ECG risk context when relevant.",
    clinicalPearls: ["SGLT2 inhibitors and GLP-1 agents have organ-protective roles beyond glucose"],
  },
});

export const internalMedicineTopics = [diabetesTopic];
