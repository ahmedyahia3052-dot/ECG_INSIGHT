import type { AttachmentForAnalysis, ConversationMemory } from "./copilot-types";
import type { ExtractedEntities } from "./smart-intent-types";

const DISEASE_TERMS = [
  "atrial fibrillation", "af", "stemi", "nstemi", "hypertension", "heart failure", "long qt", "brugada",
  "hyperkalemia", "syncope", "mi", "myocardial infarction", "pe", "pulmonary embolism", "vt", "vf",
];
const DRUG_TERMS = [
  "amiodarone", "metoprolol", "bisoprolol", "warfarin", "apixaban", "rivaroxaban", "dabigatran",
  "aspirin", "clopidogrel", "statin", "atorvastatin", "digoxin", "furosemide", "spironolactone",
];
const ECG_FINDINGS = [
  "st elevation", "st depression", "t wave inversion", "prolonged qt", "qtc", "bundle branch block",
  "av block", "left axis deviation", "right axis deviation", "brugada", "hyperkalemia",
];
const RHYTHMS = ["sinus rhythm", "atrial fibrillation", "atrial flutter", "sinus bradycardia", "sinus tachycardia", "ventricular tachycardia"];
const RISK_FACTORS = ["diabetes", "smoking", "hypertension", "dyslipidemia", "obesity", "family history", "ckd", "renal failure"];
const REPORT_TYPES = ["ecg report", "clinical report", "referral letter", "fitness certificate", "occupational report"];

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function collectMatches(text: string, terms: string[]) {
  return unique(terms.filter((term) => text.includes(term)));
}

function extractPatientNames(text: string) {
  const names: string[] = [];
  for (const match of text.matchAll(/\bopen\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+patient|\s+record|\s+chart)?/gi)) {
    names.push(match[1].trim());
  }
  for (const match of text.matchAll(/\bpatient\s+(?:named\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g)) {
    names.push(match[1].trim());
  }
  return unique(names);
}

export function normalizeUserInput(question: string) {
  return question.replace(/\s+/g, " ").trim();
}

export function extractEntities(question: string, memory: ConversationMemory, attachments: AttachmentForAnalysis[]): ExtractedEntities {
  const text = `${question} ${memory.turns.map((turn) => turn.content).join(" ")} ${attachments.map((item) => `${item.originalName} ${item.documentType ?? ""} ${item.analysisSummary ?? ""}`).join(" ")}`.toLowerCase();
  const ages = [...text.matchAll(/\b(\d{1,3})\s*(?:years?\s*old|year-old|y\/o|yo\b)/gi)].map((match) => Number(match[1])).filter((value) => value > 0 && value < 120);
  const heartRates = [...text.matchAll(/\b(?:hr|heart rate)\s*[:=]?\s*(\d{2,3})\b|\b(\d{2,3})\s*bpm\b/gi)]
    .map((match) => Number(match[1] ?? match[2]))
    .filter((value) => value >= 20 && value <= 250);
  const genders = collectMatches(text, ["male", "female", "man", "woman"]);
  const qtValues = [...text.matchAll(/\b(?:qt|qtc)\s*[:=]?\s*(\d{2,3})\s*(?:ms|msec)?/gi)].map((match) => match[0]);
  const prIntervals = [...text.matchAll(/\bpr\s*[:=]?\s*(\d{2,3})\s*(?:ms|msec)?/gi)].map((match) => match[0]);
  const qrsDurations = [...text.matchAll(/\bqrs\s*[:=]?\s*(\d{2,3})\s*(?:ms|msec)?/gi)].map((match) => match[0]);
  const dates = [...text.matchAll(/\b(?:today|yesterday|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/gi)].map((match) => match[0]);
  const occupations = collectMatches(text, ["offshore", "driver", "pilot", "nurse", "engineer", "construction", "safety-sensitive"]);
  return {
    ages: Array.from(new Set(ages)),
    dates: unique(dates),
    diseases: collectMatches(text, DISEASE_TERMS),
    drugs: collectMatches(text, DRUG_TERMS),
    ecgFindings: collectMatches(text, ECG_FINDINGS),
    genders: unique(genders),
    heartRates: Array.from(new Set(heartRates)),
    occupations: unique(occupations),
    patientNames: extractPatientNames(question),
    prIntervals: unique(prIntervals),
    qrsDurations: unique(qrsDurations),
    qtValues: unique(qtValues),
    reportTypes: collectMatches(text, REPORT_TYPES),
    rhythms: collectMatches(text, RHYTHMS),
    riskFactors: collectMatches(text, RISK_FACTORS),
  };
}
