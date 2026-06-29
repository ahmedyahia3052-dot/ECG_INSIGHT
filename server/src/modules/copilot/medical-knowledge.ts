import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type MedicalKnowledgeDomain = "CARDIOLOGY" | "DRUGS" | "ECG" | "EMERGENCY_MEDICINE" | "INTERNAL_MEDICINE" | "MEDICAL" | "SAFETY";

export type EnterpriseKnowledgeHit = {
  content: string;
  domain: MedicalKnowledgeDomain;
  id: string;
  references: string[];
  relevanceScore: number;
  sourceName: string;
  sourceUrl?: string;
  tags: string[];
  title: string;
};

type SeedDocument = {
  content: string;
  domain: MedicalKnowledgeDomain;
  references: string[];
  sourceName: string;
  sourceUrl?: string;
  tags: string[];
  title: string;
};

const VECTOR_SIZE = 64;

export const enterpriseKnowledgeSeed: SeedDocument[] = [
  {
    content: "ST-elevation myocardial infarction is suggested by regional ST elevation in contiguous leads with reciprocal changes and compatible symptoms. Immediate ECG review, serial ECGs, aspirin when not contraindicated, and emergency reperfusion pathway activation are required.",
    domain: "EMERGENCY_MEDICINE",
    references: ["AHA/ACC chest pain and STEMI guidance", "ESC acute coronary syndrome guidance"],
    sourceName: "AHA/ACC/ESC",
    sourceUrl: "https://www.heart.org/",
    tags: ["stemi", "acs", "chest-pain", "reperfusion", "emergency"],
    title: "STEMI emergency recognition and escalation",
  },
  {
    content: "NSTEMI and unstable angina require risk stratification, serial high-sensitivity troponin testing, repeat ECGs, antiplatelet and anticoagulation decisions, and early invasive evaluation for high-risk features.",
    domain: "CARDIOLOGY",
    references: ["ACC/AHA ACS guidance", "ESC NSTE-ACS guidance"],
    sourceName: "ACC/AHA/ESC",
    sourceUrl: "https://www.acc.org/",
    tags: ["nstemi", "unstable-angina", "troponin", "ischemia", "acs"],
    title: "NSTEMI risk stratification",
  },
  {
    content: "Atrial fibrillation ECG shows irregularly irregular RR intervals without consistent P waves. Evaluate hemodynamic stability, reversible triggers, stroke risk, bleeding risk, rate control, rhythm control, and anticoagulation eligibility.",
    domain: "CARDIOLOGY",
    references: ["2023 ACC/AHA/HRS atrial fibrillation guideline", "ESC atrial fibrillation guideline"],
    sourceName: "ACC/AHA/HRS",
    sourceUrl: "https://www.acc.org/",
    tags: ["atrial-fibrillation", "af", "irregular", "anticoagulation", "rate-control"],
    title: "Atrial fibrillation ECG and management framework",
  },
  {
    content: "Wide-complex tachycardia should be treated as ventricular tachycardia until proven otherwise, especially with structural heart disease, AV dissociation, capture beats, fusion beats, or instability.",
    domain: "EMERGENCY_MEDICINE",
    references: ["AHA ACLS tachycardia algorithm", "ESC ventricular arrhythmia guidance"],
    sourceName: "AHA ACLS",
    sourceUrl: "https://cpr.heart.org/",
    tags: ["ventricular-tachycardia", "wide-complex", "tachycardia", "acls", "emergency"],
    title: "Wide-complex tachycardia safety rule",
  },
  {
    content: "Long QT is assessed with QTc and clinical context. QTc prolongation increases torsades risk, especially with hypokalemia, hypomagnesemia, bradycardia, congenital long QT, and QT-prolonging medications.",
    domain: "ECG",
    references: ["AHA/ACCF/HRS ECG standardization recommendations", "CredibleMeds QT drug safety reference"],
    sourceName: "AHA/ACCF/HRS",
    sourceUrl: "https://www.crediblemeds.org/",
    tags: ["qt", "qtc", "torsades", "hypokalemia", "drug-safety"],
    title: "QTc prolongation and torsades risk",
  },
  {
    content: "Hyperkalemia can cause peaked T waves, PR prolongation, QRS widening, sine-wave morphology, bradyarrhythmias, and ventricular arrhythmia. Severe ECG changes require urgent treatment and laboratory confirmation.",
    domain: "INTERNAL_MEDICINE",
    references: ["NIH StatPearls hyperkalemia review", "AHA ACLS electrolyte guidance"],
    sourceName: "NIH",
    sourceUrl: "https://www.ncbi.nlm.nih.gov/books/",
    tags: ["hyperkalemia", "electrolyte", "peaked-t", "qrs-widening", "emergency"],
    title: "Hyperkalemia ECG manifestations",
  },
  {
    content: "Hypokalemia may cause ST depression, flattened T waves, prominent U waves, apparent QT prolongation, and ventricular ectopy. Evaluate potassium, magnesium, medications, renal status, and arrhythmia risk.",
    domain: "INTERNAL_MEDICINE",
    references: ["NIH StatPearls hypokalemia review"],
    sourceName: "NIH",
    sourceUrl: "https://www.ncbi.nlm.nih.gov/books/",
    tags: ["hypokalemia", "u-wave", "electrolyte", "arrhythmia", "internal-medicine"],
    title: "Hypokalemia ECG manifestations",
  },
  {
    content: "Left bundle branch block has QRS duration at least 120 ms with broad/notched R waves in lateral leads and deep S waves in V1. New LBBB with ischemic symptoms requires urgent clinical correlation and Sgarbossa/modified Sgarbossa assessment.",
    domain: "ECG",
    references: ["AHA/ACCF/HRS ECG standardization recommendations", "ESC ACS guidance"],
    sourceName: "AHA/ESC",
    tags: ["lbbb", "bundle-branch", "sgarbossa", "ischemia", "qrs"],
    title: "Left bundle branch block interpretation",
  },
  {
    content: "Right bundle branch block has QRS duration at least 120 ms with rsR' pattern in V1-V2 and broad terminal S waves in lateral leads. Consider pulmonary embolism, ischemia, structural disease, or chronic conduction disease when clinically appropriate.",
    domain: "ECG",
    references: ["AHA/ACCF/HRS ECG standardization recommendations"],
    sourceName: "AHA/ACCF/HRS",
    tags: ["rbbb", "bundle-branch", "qrs", "pulmonary-embolism", "conduction"],
    title: "Right bundle branch block interpretation",
  },
  {
    content: "AV block assessment requires PR interval, dropped beats, QRS width, symptoms, escape rhythm, and reversible causes. Mobitz II, high-grade AV block, and complete heart block require urgent evaluation.",
    domain: "CARDIOLOGY",
    references: ["ACC/AHA/HRS bradycardia and conduction delay guideline"],
    sourceName: "ACC/AHA/HRS",
    sourceUrl: "https://www.acc.org/",
    tags: ["av-block", "bradycardia", "complete-heart-block", "conduction", "pacemaker"],
    title: "AV block risk assessment",
  },
  {
    content: "Acute pericarditis classically has diffuse concave ST elevation and PR depression, often without reciprocal ST depression except aVR/V1. Correlate with pleuritic chest pain, friction rub, inflammatory markers, and echocardiography.",
    domain: "CARDIOLOGY",
    references: ["ESC pericardial disease guideline"],
    sourceName: "ESC",
    sourceUrl: "https://www.escardio.org/",
    tags: ["pericarditis", "st-elevation", "pr-depression", "chest-pain", "differential"],
    title: "Pericarditis ECG pattern",
  },
  {
    content: "Pulmonary embolism ECG can be normal or show sinus tachycardia, right heart strain, T-wave inversion V1-V4, right axis deviation, RBBB, or S1Q3T3. ECG cannot exclude PE.",
    domain: "EMERGENCY_MEDICINE",
    references: ["ESC pulmonary embolism guidance", "CDC VTE clinical resources"],
    sourceName: "ESC/CDC",
    sourceUrl: "https://www.cdc.gov/",
    tags: ["pulmonary-embolism", "sinus-tachycardia", "right-heart-strain", "s1q3t3", "emergency"],
    title: "Pulmonary embolism ECG clues",
  },
  {
    content: "Beta blockers may cause bradycardia, AV block, hypotension, fatigue, bronchospasm in susceptible patients, and can mask hypoglycemia symptoms. Do not start, stop, or titrate without clinician review.",
    domain: "DRUGS",
    references: ["FDA prescribing information", "ACC/AHA pharmacotherapy guidance"],
    sourceName: "FDA/ACC/AHA",
    sourceUrl: "https://www.fda.gov/",
    tags: ["beta-blocker", "bradycardia", "av-block", "drug-safety", "hypotension"],
    title: "Beta blocker ECG-relevant safety considerations",
  },
  {
    content: "Digoxin effect can cause downsloping ST depression and shortened QT; toxicity may cause AV block, atrial tachycardia with block, ventricular ectopy, and bidirectional VT. Check renal function, potassium, magnesium, and drug level when suspected.",
    domain: "DRUGS",
    references: ["FDA digoxin label", "NIH digoxin toxicity review"],
    sourceName: "FDA/NIH",
    tags: ["digoxin", "toxicity", "av-block", "ventricular-ectopy", "drug-safety"],
    title: "Digoxin ECG effects and toxicity",
  },
  {
    content: "QT-prolonging drugs include many antiarrhythmics, macrolides, fluoroquinolones, antipsychotics, antidepressants, antiemetics, and methadone. Risk rises with multiple QT drugs, electrolyte disturbance, renal disease, and baseline QTc prolongation.",
    domain: "DRUGS",
    references: ["CredibleMeds QT drug lists", "FDA medication safety communications"],
    sourceName: "CredibleMeds/FDA",
    sourceUrl: "https://www.crediblemeds.org/",
    tags: ["qt-drugs", "torsades", "macrolide", "fluoroquinolone", "drug-interaction"],
    title: "QT-prolonging medication risk",
  },
  {
    content: "Statin therapy reduces atherosclerotic cardiovascular risk when indicated. Evaluate ASCVD risk, LDL-C, diabetes, clinical ASCVD, drug interactions, liver disease, myopathy symptoms, and pregnancy status.",
    domain: "DRUGS",
    references: ["ACC/AHA cholesterol guideline", "FDA statin safety information"],
    sourceName: "ACC/AHA/FDA",
    tags: ["statin", "ascvd", "ldl", "primary-prevention", "drug-safety"],
    title: "Statin cardiovascular prevention framework",
  },
  {
    content: "Heart failure assessment integrates symptoms, volume status, blood pressure, renal function, natriuretic peptides, echocardiography, EF, ischemia evaluation, and guideline-directed medical therapy when clinically appropriate.",
    domain: "CARDIOLOGY",
    references: ["AHA/ACC/HFSA heart failure guideline", "ESC heart failure guideline"],
    sourceName: "AHA/ACC/HFSA/ESC",
    tags: ["heart-failure", "ef", "dyspnea", "gdmt", "cardiology"],
    title: "Heart failure clinical assessment",
  },
  {
    content: "Hypertensive emergency is severe BP elevation with acute target-organ damage such as neurologic deficit, pulmonary edema, ACS, aortic dissection, renal injury, or retinopathy. It requires urgent supervised treatment.",
    domain: "INTERNAL_MEDICINE",
    references: ["AHA hypertension scientific statement", "WHO hypertension resources"],
    sourceName: "AHA/WHO",
    sourceUrl: "https://www.who.int/",
    tags: ["hypertension", "emergency", "target-organ-damage", "internal-medicine", "blood-pressure"],
    title: "Hypertensive emergency recognition",
  },
  {
    content: "Syncope risk assessment includes exertional syncope, structural heart disease, abnormal ECG, family history of sudden death, hypotension, anemia, arrhythmia, and neurologic red flags. High-risk features need urgent evaluation.",
    domain: "EMERGENCY_MEDICINE",
    references: ["ACC/AHA/HRS syncope guideline", "ESC syncope guideline"],
    sourceName: "ACC/AHA/HRS/ESC",
    tags: ["syncope", "risk", "abnormal-ecg", "sudden-death", "emergency"],
    title: "Syncope high-risk features",
  },
  {
    content: "Sepsis can cause sinus tachycardia, myocardial injury, QT changes, atrial arrhythmias, and shock. ECG findings must be interpreted with vitals, lactate, infection source, organ dysfunction, and resuscitation status.",
    domain: "INTERNAL_MEDICINE",
    references: ["Surviving Sepsis Campaign", "CDC sepsis resources"],
    sourceName: "CDC/Surviving Sepsis Campaign",
    sourceUrl: "https://www.cdc.gov/sepsis/",
    tags: ["sepsis", "tachycardia", "shock", "infection", "internal-medicine"],
    title: "Sepsis cardiovascular and ECG context",
  },
  {
    content: "Diabetes increases cardiovascular risk and can contribute to silent ischemia, autonomic dysfunction, kidney disease, electrolyte abnormalities, and medication interactions. ECG interpretation should include risk-factor context.",
    domain: "INTERNAL_MEDICINE",
    references: ["ADA Standards of Care", "CDC diabetes resources"],
    sourceName: "ADA/CDC",
    tags: ["diabetes", "silent-ischemia", "cardiovascular-risk", "kidney-disease", "internal-medicine"],
    title: "Diabetes and cardiovascular risk context",
  },
  {
    content: "Stroke/TIA evaluation with atrial fibrillation requires anticoagulation consideration based on thromboembolic and bleeding risk, brain imaging timing, contraindications, and specialist guidance.",
    domain: "CARDIOLOGY",
    references: ["AHA/ASA stroke prevention guidance", "ACC/AHA/HRS atrial fibrillation guideline"],
    sourceName: "AHA/ASA/ACC",
    tags: ["stroke", "tia", "atrial-fibrillation", "anticoagulation", "risk"],
    title: "AF and stroke prevention context",
  },
  {
    content: "Occupational fitness decisions for safety-sensitive roles should consider active ischemia, unstable arrhythmia, syncope, heart failure decompensation, uncontrolled hypertension, medication impairment, and emergency access at the worksite.",
    domain: "MEDICAL",
    references: ["Internal occupational cardiology protocol", "WHO occupational health principles"],
    sourceName: "WHO/Internal Protocol",
    sourceUrl: "https://www.who.int/",
    tags: ["occupational-fitness", "safety-sensitive", "ischemia", "arrhythmia", "work-restriction"],
    title: "Safety-sensitive cardiac fitness framework",
  },
  {
    content: "Medical AI responses must not replace clinician judgment. High-risk symptoms, unstable vitals, acute neurologic deficit, chest pain with ischemic ECG changes, severe dyspnea, or syncope require urgent clinician assessment.",
    domain: "SAFETY",
    references: ["WHO digital health ethics guidance", "FDA clinical decision support software guidance"],
    sourceName: "WHO/FDA",
    sourceUrl: "https://www.who.int/",
    tags: ["guardrail", "clinical-judgment", "urgent-care", "medical-ai", "safety"],
    title: "Medical AI clinical safety guardrail",
  },
];

function hashToken(token: string) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function tokenize(text: string) {
  const aliases: Record<string, string[]> = {
    afib: ["atrial", "fibrillation"],
    mi: ["myocardial", "infarction"],
    nstemi: ["non", "st", "elevation", "myocardial", "infarction"],
    pe: ["pulmonary", "embolism"],
    qtc: ["qt", "corrected", "torsades"],
    stemi: ["st", "elevation", "myocardial", "infarction"],
    vt: ["ventricular", "tachycardia"],
  };
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1)
    .flatMap((token) => aliases[token] ?? [token]);
}

export function knowledgeEmbedding(text: string) {
  const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
  for (const token of tokenize(text)) {
    const hash = hashToken(token);
    vector[hash % VECTOR_SIZE] += hash % 2 === 0 ? 1 : -1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

function cosine(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  for (let index = 0; index < length; index += 1) dot += a[index] * b[index];
  return dot;
}

function embeddingFromJson(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

function lexicalScore(query: string, text: string) {
  const queryTokens = new Set(tokenize(query));
  if (!queryTokens.size) return 0;
  const textTokens = new Set(tokenize(text));
  let matches = 0;
  queryTokens.forEach((token) => {
    if (textTokens.has(token)) matches += 1;
  });
  return matches / queryTokens.size;
}

export async function ensureEnterpriseKnowledgeSeeded() {
  await Promise.all(enterpriseKnowledgeSeed.map((document) => {
    const searchText = `${document.title} ${document.domain} ${document.sourceName} ${document.tags.join(" ")} ${document.content} ${document.references.join(" ")}`;
    return prisma.medicalKnowledgeDocument.upsert({
      create: {
        ...document,
        embedding: knowledgeEmbedding(searchText) as Prisma.InputJsonValue,
        searchText,
      },
      update: {
        content: document.content,
        embedding: knowledgeEmbedding(searchText) as Prisma.InputJsonValue,
        references: document.references,
        searchText,
        sourceName: document.sourceName,
        sourceUrl: document.sourceUrl,
        tags: document.tags,
      },
      where: { domain_title: { domain: document.domain, title: document.title } },
    });
  }));
}

export async function semanticSearchKnowledge(question: string, options: { contextTerms?: string[]; domains?: MedicalKnowledgeDomain[]; take?: number } = {}): Promise<EnterpriseKnowledgeHit[]> {
  await ensureEnterpriseKnowledgeSeeded();
  const queryText = `${question} ${(options.contextTerms ?? []).join(" ")}`;
  const queryVector = knowledgeEmbedding(queryText);
  const documents = await prisma.medicalKnowledgeDocument.findMany({
    where: options.domains?.length ? { domain: { in: options.domains } } : undefined,
  });
  return documents
    .map((document) => {
      const combined = `${document.title} ${document.domain} ${document.sourceName} ${document.tags.join(" ")} ${document.content} ${document.references.join(" ")}`;
      const semantic = cosine(queryVector, embeddingFromJson(document.embedding));
      const lexical = lexicalScore(queryText, combined);
      const relevanceScore = Number((semantic * 0.65 + lexical * 0.35).toFixed(4));
      return {
        content: document.content,
        domain: document.domain as MedicalKnowledgeDomain,
        id: document.id,
        references: document.references,
        relevanceScore,
        sourceName: document.sourceName,
        sourceUrl: document.sourceUrl ?? undefined,
        tags: document.tags,
        title: document.title,
      };
    })
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, options.take ?? 8);
}
