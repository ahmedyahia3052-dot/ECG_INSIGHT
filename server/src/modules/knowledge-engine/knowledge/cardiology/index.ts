import { defineTopic } from "../topic-factory";

export const hypertensionTopic = defineTopic({
  domain: "cardiology/hypertension",
  slug: "hypertension",
  title: "Hypertension",
  searchTags: ["hypertension", "blood-pressure", "htn", "lvh", "essential-hypertension"],
  references: [
    { label: "AHA hypertension scientific statement", source: "AHA", url: "https://www.heart.org/" },
    { label: "ESC/ESH hypertension guideline", source: "ESC", url: "https://www.escardio.org/" },
  ],
  sections: {
    definition: "Hypertension is persistently elevated arterial blood pressure above guideline thresholds, typically office readings ≥140/90 mmHg or equivalent out-of-office criteria.",
    pathophysiology: "Chronic pressure overload increases afterload, promoting left ventricular hypertrophy, endothelial dysfunction, arterial stiffening, and end-organ microvascular injury in brain, heart, kidney, and retina.",
    classification: "Stages include elevated BP, stage 1, and stage 2 hypertension; secondary causes include renal artery stenosis, primary aldosteronism, pheochromocytoma, obstructive sleep apnea, and medication effects.",
    clinicalFeatures: "Often asymptomatic; symptoms may include headache, exertional dyspnea, or signs of end-organ damage such as LVH, proteinuria, or retinopathy.",
    diagnosis: "Confirm with repeated office measurements; use ambulatory or home BP monitoring when white-coat or masked hypertension is suspected; assess cardiovascular risk and end-organ effects.",
    differentialDiagnosis: "White-coat hypertension, masked hypertension, secondary hypertension, anxiety-related elevation, pain, and medication-induced BP rise.",
    investigations: "Basic metabolic panel, creatinine/eGFR, urinalysis, lipid profile, ECG, and targeted workup for secondary causes when clinically indicated.",
    management: "Lifestyle modification plus guideline-directed antihypertensive therapy based on comorbidities, age, ethnicity, and cardiovascular risk; treat to individualized BP targets.",
    complications: "Stroke, myocardial infarction, heart failure, chronic kidney disease, aortic dissection, and hypertensive emergency with target-organ damage.",
    redFlags: ["Neurologic deficit", "Acute pulmonary edema", "Chest pain with ischemia", "Aortic pain", "Acute kidney injury", "Papilledema"],
    keyPoints: ["Confirm before labeling chronic hypertension", "Assess end-organ damage", "Screen for secondary causes when appropriate", "LVH reflects chronic pressure overload"],
    patientExplanation: "High blood pressure means the heart and arteries are working under extra strain over time. Many people feel fine, but untreated hypertension can damage the heart, brain, kidneys, and eyes.",
    teachingNotes: "Start with definition and measurement technique before pharmacology. Link LVH to chronic afterload when learners ask follow-up questions.",
    clinicalPearls: ["Out-of-office BP often clarifies diagnosis", "Resistant hypertension warrants secondary cause review", "Treat the overall cardiovascular risk, not the number alone"],
  },
});

export const atrialFibrillationTopic = defineTopic({
  domain: "cardiology/arrhythmias",
  slug: "atrial-fibrillation",
  title: "Atrial Fibrillation",
  searchTags: ["atrial-fibrillation", "af", "afib", "irregular", "anticoagulation", "cha2ds2-vasc"],
  references: [
    { label: "2023 ACC/AHA/HRS atrial fibrillation guideline", source: "ACC/AHA/HRS" },
    { label: "ESC atrial fibrillation guideline", source: "ESC" },
  ],
  sections: {
    definition: "Atrial fibrillation is a supraventricular tachyarrhythmia characterized by disorganized atrial electrical activity and irregular ventricular response.",
    pathophysiology: "Multiple reentrant wavelets and ectopic drivers in atrial tissue lead to loss of coordinated atrial contraction, stasis in the atrial appendage, and increased thromboembolic risk.",
    classification: "Paroxysmal, persistent, long-standing persistent, and permanent AF; also valvular vs non-valvular contexts for anticoagulation decisions.",
    clinicalFeatures: "Palpitations, fatigue, dyspnea, dizziness, or asymptomatic presentation; irregularly irregular pulse on examination.",
    diagnosis: "ECG showing irregularly irregular RR intervals without consistent P waves; confirm rhythm with longer monitoring when paroxysmal AF is suspected.",
    differentialDiagnosis: "Atrial flutter with variable block, multifocal atrial tachycardia, frequent PACs, sinus arrhythmia, and artifact.",
    investigations: "ECG, thyroid function, echocardiography for structural disease, stroke and bleeding risk scores, and rhythm monitoring as indicated.",
    management: "Address reversible triggers; rate or rhythm control strategy; anticoagulation based on stroke risk; manage comorbidities and heart failure.",
    complications: "Ischemic stroke, heart failure exacerbation, tachycardia-mediated cardiomyopathy, and bleeding from anticoagulation.",
    redFlags: ["Hemodynamic instability", "Acute ischemic stroke symptoms", "Chest pain with ischemia", "Syncope with rapid ventricular response"],
    keyPoints: ["Irregularly irregular rhythm is the ECG hallmark", "Stroke prevention is central", "Rate control vs rhythm control is individualized"],
    patientExplanation: "Atrial fibrillation is an irregular heartbeat rhythm from the upper chambers of the heart. It can feel like palpitations or nothing at all, but it raises stroke risk and needs medical follow-up.",
    teachingNotes: "Teach ECG recognition before anticoagulation nuance. Use CHA2DS2-VASc only after learners understand rhythm diagnosis.",
    clinicalPearls: ["AF begets AF over time", "Always search for triggers such as infection, ischemia, or hyperthyroidism", "New AF with chest pain requires urgent ischemia evaluation"],
  },
});

export const heartFailureTopic = defineTopic({
  domain: "cardiology/heart-failure",
  slug: "heart-failure",
  title: "Heart Failure",
  searchTags: ["heart-failure", "hf", "hfref", "hfpef", "dyspnea", "bnp"],
  references: [
    { label: "AHA/ACC/HFSA heart failure guideline", source: "AHA/ACC/HFSA" },
    { label: "ESC heart failure guideline", source: "ESC" },
  ],
  sections: {
    definition: "Heart failure is a clinical syndrome of symptoms and signs caused by structural or functional cardiac abnormality with elevated natriuretic peptides or objective evidence of congestion.",
    pathophysiology: "Impaired cardiac output and neurohormonal activation lead to sodium retention, pulmonary and systemic congestion, and progressive ventricular remodeling.",
    classification: "HFrEF (reduced EF), HFmrEF, HFpEF (preserved EF), acute decompensated HF, and right vs left predominant failure.",
    clinicalFeatures: "Dyspnea, orthopnea, PND, peripheral edema, fatigue, elevated JVP, crackles, and S3 in decompensated states.",
    diagnosis: "Symptoms/signs plus BNP/NT-proBNP and echocardiography; evaluate ischemia, valvular disease, arrhythmia, and precipitating factors.",
    differentialDiagnosis: "COPD, pneumonia, pulmonary embolism, cirrhosis, nephrotic syndrome, anemia, and deconditioning.",
    investigations: "ECG, chest imaging, echocardiography, labs including renal function and electrolytes, and ischemia evaluation when appropriate.",
    management: "Diuretics for congestion, guideline-directed medical therapy for HFrEF, device therapy when indicated, treat precipitants, and structured follow-up.",
    complications: "Cardiogenic shock, malignant arrhythmias, renal dysfunction, frailty, and recurrent hospitalization.",
    redFlags: ["Hypotension with cold extremities", "Altered mental status", "SpO2 refractory hypoxia", "New ischemic ECG changes"],
    keyPoints: ["EF classification guides therapy", "Always look for reversible precipitants", "Volume status assessment is essential"],
    patientExplanation: "Heart failure means the heart is not pumping as effectively as the body needs, which can cause breathlessness, swelling, and fatigue even when the heart is not stopped.",
    teachingNotes: "Separate pump failure from congestion clinically before discussing GDMT classes.",
    clinicalPearls: ["AF can worsen decompensated HF", "Renal function guides diuretic and ACEi/ARNI tolerance", "Weight and symptom diaries help early detection"],
  },
});

export const acsTopic = defineTopic({
  domain: "cardiology/acs",
  slug: "acute-coronary-syndrome",
  title: "Acute Coronary Syndrome",
  searchTags: ["acs", "stemi", "nstemi", "unstable-angina", "chest-pain", "troponin"],
  references: [
    { label: "AHA/ACC chest pain guideline", source: "AHA/ACC" },
    { label: "ESC acute coronary syndromes guideline", source: "ESC" },
  ],
  sections: {
    definition: "Acute coronary syndrome encompasses unstable angina, NSTEMI, and STEMI due to acute myocardial ischemia usually from coronary plaque disruption and thrombosis.",
    pathophysiology: "Plaque rupture or erosion triggers platelet aggregation and thrombus formation, reducing coronary blood flow and causing myocardial ischemia or necrosis.",
    classification: "Unstable angina (no troponin rise), NSTEMI (troponin elevation without persistent ST elevation), STEMI (persistent ST elevation or equivalent).",
    clinicalFeatures: "Chest pressure, radiation to arm/jaw, diaphoresis, nausea, dyspnea; atypical presentations more common in women, elderly, and diabetics.",
    diagnosis: "Clinical presentation, serial high-sensitivity troponins, ECG changes, and risk stratification scores; immediate ECG within 10 minutes of presentation.",
    differentialDiagnosis: "Aortic dissection, pulmonary embolism, pericarditis, esophageal spasm, musculoskeletal pain, and anxiety.",
    investigations: "ECG, troponin kinetics, chest imaging when alternative diagnoses are considered, echocardiography, and coronary angiography per pathway.",
    management: "Antiplatelet and anticoagulant therapy, anti-ischemic treatment, reperfusion for STEMI, early invasive strategy for high-risk NSTEMI, and secondary prevention.",
    complications: "Ventricular arrhythmias, cardiogenic shock, mechanical complications, heart failure, and death.",
    redFlags: ["Hemodynamic instability", "Persistent ST elevation", "Rising troponin with ongoing pain", "Mechanical complication signs"],
    keyPoints: ["Time-critical ECG and troponin pathway", "STEMI requires emergency reperfusion planning", "Atypical chest pain still warrants ischemia workup in high-risk patients"],
    patientExplanation: "Acute coronary syndrome means the heart muscle is not getting enough blood suddenly. Chest discomfort, breathlessness, or feeling unwell needs urgent medical assessment.",
    teachingNotes: "Link ECG STEMI criteria only after learners understand ischemia symptoms and troponin kinetics.",
    clinicalPearls: ["Right ventricular infarction may need preload preservation", "LBBB may mask STEMI—use Sgarbossa criteria", "Recurrent pain after troponin clearance needs re-evaluation"],
  },
});

export const cardiologyTopics = [hypertensionTopic, atrialFibrillationTopic, heartFailureTopic, acsTopic];
