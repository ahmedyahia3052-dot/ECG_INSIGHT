import type { EmkpTerminologyEntry } from "../model/knowledge-model";

export const EMKP_TERMINOLOGY: EmkpTerminologyEntry[] = [
  { term: "P wave", category: "wave", definition: "Atrial depolarization waveform.", synonyms: ["Atrial wave"], abbreviations: ["P"], relatedTerms: ["PR interval", "Sinus rhythm"] },
  { term: "QRS complex", category: "wave", definition: "Ventricular depolarization.", synonyms: ["QRS"], abbreviations: ["QRS"], relatedTerms: ["QRS duration", "Bundle branch block"] },
  { term: "T wave", category: "wave", definition: "Ventricular repolarization.", synonyms: ["Repolarization wave"], abbreviations: ["T"], relatedTerms: ["QT interval", "T wave inversion"] },
  { term: "U wave", category: "wave", definition: "Late repolarization wave, prominent in hypokalemia.", synonyms: [], abbreviations: ["U"], relatedTerms: ["Hypokalemia", "QT interval"] },
  { term: "Delta wave", category: "morphology", definition: "Slurred QRS upstroke from ventricular pre-excitation.", synonyms: ["Pre-excitation wave"], abbreviations: [], relatedTerms: ["WPW", "PR interval"] },
  { term: "PR interval", category: "interval", definition: "Time from onset of P to start of QRS — AV conduction.", synonyms: [], abbreviations: ["PR"], relatedTerms: ["AV block", "WPW"] },
  { term: "QRS duration", category: "interval", definition: "Ventricular depolarization width; normal <120 ms.", synonyms: ["QRS width"], abbreviations: ["QRSd"], relatedTerms: ["RBBB", "LBBB", "VT"] },
  { term: "QT interval", category: "interval", definition: "Start of QRS to end of T — repolarization duration.", synonyms: [], abbreviations: ["QT"], relatedTerms: ["QTc", "Long QT", "Torsades"] },
  { term: "QTc", category: "interval", definition: "Rate-corrected QT interval (Bazett, Fridericia).", synonyms: ["Corrected QT"], abbreviations: ["QTc"], relatedTerms: ["Long QT", "Short QT"] },
  { term: "RR interval", category: "interval", definition: "Time between consecutive R waves; determines heart rate.", synonyms: [], abbreviations: ["RR"], relatedTerms: ["Heart rate", "Rhythm regularity"] },
  { term: "ST segment", category: "segment", definition: "Period between QRS end and T wave onset.", synonyms: [], abbreviations: ["ST"], relatedTerms: ["STEMI", "NSTEMI", "ST elevation"] },
  { term: "J point", category: "segment", definition: "Junction between QRS end and ST segment.", synonyms: ["QRS-T junction"], abbreviations: [], relatedTerms: ["Early repolarization", "J-point elevation"] },
  { term: "Electrical axis", category: "axis", definition: "Mean direction of ventricular depolarization in frontal plane.", synonyms: ["QRS axis", "Frontal plane axis"], abbreviations: [], relatedTerms: ["LAD", "RAD", "LAFB"] },
  { term: "Left axis deviation", category: "axis", definition: "QRS axis −30° to −90°.", synonyms: ["LAD"], abbreviations: ["LAD"], relatedTerms: ["LAFB", "LVH", "Inferior MI"] },
  { term: "Right axis deviation", category: "axis", definition: "QRS axis +90° to +180°.", synonyms: ["RAD"], abbreviations: ["RAD"], relatedTerms: ["RVH", "LPFB", "PE"] },
  { term: "Normal sinus rhythm", category: "rhythm", definition: "SA node rhythm 60–100 bpm with normal conduction.", synonyms: ["NSR", "Sinus rhythm"], abbreviations: ["NSR"], relatedTerms: ["P wave", "Sinus bradycardia"] },
  { term: "Atrial fibrillation", category: "rhythm", definition: "Chaotic atrial activity with irregular ventricular response.", synonyms: ["AF", "AFib"], abbreviations: ["AF", "AFib"], relatedTerms: ["Irregularly irregular", "Stroke risk"] },
  { term: "STEMI", category: "clinical", definition: "ST-elevation myocardial infarction per UDMI criteria.", synonyms: ["ST elevation MI", "Transmural MI"], abbreviations: ["STEMI"], relatedTerms: ["ST elevation", "Troponin", "Cath lab"] },
  { term: "NSTEMI", category: "clinical", definition: "Non-ST-elevation myocardial infarction.", synonyms: ["Non-ST elevation MI"], abbreviations: ["NSTEMI"], relatedTerms: ["ST depression", "Troponin"] },
  { term: "Bundle branch block", category: "morphology", definition: "Delay in right or left bundle branch conduction.", synonyms: ["BBB"], abbreviations: ["BBB"], relatedTerms: ["RBBB", "LBBB", "Wide QRS"] },
  { term: "RBBB", category: "abbreviation", definition: "Right bundle branch block.", synonyms: ["Right bundle branch block"], abbreviations: ["RBBB"], relatedTerms: ["rsR' V1", "Wide QRS"] },
  { term: "LBBB", category: "abbreviation", definition: "Left bundle branch block.", synonyms: ["Left bundle branch block"], abbreviations: ["LBBB"], relatedTerms: ["Sgarbossa criteria", "Wide QRS"] },
  { term: "LVH", category: "abbreviation", definition: "Left ventricular hypertrophy.", synonyms: ["Left ventricular hypertrophy"], abbreviations: ["LVH"], relatedTerms: ["Sokolow-Lyon", "Strain pattern"] },
  { term: "RVH", category: "abbreviation", definition: "Right ventricular hypertrophy.", synonyms: ["Right ventricular hypertrophy"], abbreviations: ["RVH"], relatedTerms: ["RAD", "P pulmonale"] },
  { term: "WPW", category: "abbreviation", definition: "Wolff-Parkinson-White — ventricular pre-excitation.", synonyms: ["Wolff-Parkinson-White syndrome"], abbreviations: ["WPW"], relatedTerms: ["Delta wave", "AVRT", "Short PR"] },
  { term: "SVT", category: "abbreviation", definition: "Supraventricular tachycardia.", synonyms: ["PSVT"], abbreviations: ["SVT", "PSVT"], relatedTerms: ["AVNRT", "AVRT", "Adenosine"] },
  { term: "VT", category: "abbreviation", definition: "Ventricular tachycardia.", synonyms: ["Ventricular tachycardia"], abbreviations: ["VT", "V tach"], relatedTerms: ["Wide QRS tachycardia", "AV dissociation"] },
  { term: "VF", category: "abbreviation", definition: "Ventricular fibrillation.", synonyms: ["Ventricular fibrillation"], abbreviations: ["VF", "V fib"], relatedTerms: ["Defibrillation", "Cardiac arrest"] },
  { term: "PEA", category: "abbreviation", definition: "Pulseless electrical activity.", synonyms: ["Pulseless electrical activity"], abbreviations: ["PEA"], relatedTerms: ["Cardiac arrest", "Asystole"] },
  { term: "T wave inversion", category: "morphology", definition: "Negative T wave suggesting ischemia, strain, or evolution.", synonyms: ["T inversion", "Inverted T"], abbreviations: ["TWI"], relatedTerms: ["NSTEMI", "LVH strain", "Wellens"] },
  { term: "Pathological Q wave", category: "morphology", definition: "Q wave >40 ms or >25% R amplitude — prior MI.", synonyms: ["Q wave MI"], abbreviations: [], relatedTerms: ["Myocardial infarction", "Q wave"] },
  { term: "Sgarbossa criteria", category: "clinical", definition: "Modified criteria for STEMI in LBBB.", synonyms: ["Sgarbossa rule"], abbreviations: [], relatedTerms: ["LBBB", "STEMI"] },
  { term: "Wellens syndrome", category: "clinical", definition: "Biphasic/deeply inverted T V2–V3 suggesting critical LAD stenosis.", synonyms: ["Wellens sign"], abbreviations: [], relatedTerms: ["NSTEMI", "LAD", "V2", "V3"] },
  { term: "Torsades de pointes", category: "rhythm", definition: "Polymorphic VT in setting of prolonged QT.", synonyms: ["TdP"], abbreviations: ["TdP"], relatedTerms: ["Long QT", "Hypokalemia", "Drug effect"] },
  { term: "Brugada syndrome", category: "clinical", definition: "Channelopathy with coved ST V1–V3 and VF risk.", synonyms: ["Brugada pattern"], abbreviations: [], relatedTerms: ["RBBB pattern", "Sudden death"] },
  { term: "ARVC", category: "abbreviation", definition: "Arrhythmogenic right ventricular cardiomyopathy.", synonyms: ["ARVD"], abbreviations: ["ARVC", "ARVD"], relatedTerms: ["Epsilon wave", "T inversion V1–V3"] },
  { term: "AVNRT", category: "abbreviation", definition: "AV nodal reentrant tachycardia.", synonyms: [], abbreviations: ["AVNRT"], relatedTerms: ["SVT", "Adenosine"] },
  { term: "AVRT", category: "abbreviation", definition: "AV reentrant tachycardia using accessory pathway.", synonyms: [], abbreviations: ["AVRT"], relatedTerms: ["WPW", "SVT"] },
  { term: "PAC", category: "abbreviation", definition: "Premature atrial contraction.", synonyms: ["Atrial premature beat", "APB"], abbreviations: ["PAC", "APB"], relatedTerms: ["Premature beat", "Aberrancy"] },
  { term: "PVC", category: "abbreviation", definition: "Premature ventricular contraction.", synonyms: ["Ventricular premature beat", "VPB"], abbreviations: ["PVC", "VPB"], relatedTerms: ["Wide QRS beat", "Compensatory pause"] },
  { term: "AIVR", category: "abbreviation", definition: "Accelerated idioventricular rhythm 60–100 bpm.", synonyms: ["Slow VT"], abbreviations: ["AIVR"], relatedTerms: ["Reperfusion arrhythmia", "Wide QRS"] },
  { term: "Heart rate", category: "clinical", definition: "Beats per minute derived from RR interval.", synonyms: ["HR", "Pulse rate"], abbreviations: ["HR", "bpm"], relatedTerms: ["RR interval", "Bradycardia", "Tachycardia"] },
  { term: "Calibration", category: "clinical", definition: "Standard 10 mm/mV amplitude and 25 mm/s paper speed.", synonyms: ["ECG standardization"], abbreviations: [], relatedTerms: ["ECG paper", "Voltage criteria"] },
];

export function searchTerminology(query: string): EmkpTerminologyEntry[] {
  const q = query.toLowerCase();
  return EMKP_TERMINOLOGY.filter(
    (t) => t.term.toLowerCase().includes(q) || t.synonyms.some((s) => s.toLowerCase().includes(q)) || t.abbreviations.some((a) => a.toLowerCase() === q),
  );
}
