export type ECGStatus = "normal" | "abnormal" | "critical";

export interface ECGFinding {
  label: string;
  value: string;
  severity: "normal" | "mild" | "moderate" | "severe";
}

export interface ECGCase {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: "M" | "F";
  date: string;
  diagnosis: string;
  confidence: number;
  status: ECGStatus;
  rhythm: string;
  heartRate: number;
  prInterval: number;
  qrsDuration: number;
  qtInterval: number;
  findings: ECGFinding[];
  recommendations: string[];
  analyzedBy: string;
  uploadedById: string;
}

export const MOCK_CASES: ECGCase[] = [
  {
    id: "c001",
    patientName: "Robert M.",
    patientAge: 58,
    patientGender: "M",
    date: "2026-06-22",
    diagnosis: "Normal Sinus Rhythm",
    confidence: 97,
    status: "normal",
    rhythm: "Regular sinus",
    heartRate: 72,
    prInterval: 160,
    qrsDuration: 88,
    qtInterval: 400,
    findings: [
      { label: "Heart Rate", value: "72 bpm", severity: "normal" },
      { label: "PR Interval", value: "160 ms", severity: "normal" },
      { label: "QRS Duration", value: "88 ms", severity: "normal" },
      { label: "QT Interval", value: "400 ms", severity: "normal" },
      { label: "ST Segment", value: "Isoelectric", severity: "normal" },
    ],
    recommendations: [
      "Continue routine follow-up in 12 months",
      "Maintain current cardiovascular health management",
      "No immediate intervention required",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u1",
  },
  {
    id: "c002",
    patientName: "Linda K.",
    patientAge: 64,
    patientGender: "F",
    date: "2026-06-21",
    diagnosis: "Atrial Fibrillation",
    confidence: 94,
    status: "abnormal",
    rhythm: "Irregularly irregular",
    heartRate: 88,
    prInterval: 0,
    qrsDuration: 92,
    qtInterval: 380,
    findings: [
      { label: "Heart Rate", value: "88 bpm (ventricular)", severity: "mild" },
      { label: "PR Interval", value: "Absent", severity: "severe" },
      { label: "QRS Duration", value: "92 ms", severity: "normal" },
      { label: "P Waves", value: "Absent / fibrillatory baseline", severity: "severe" },
      { label: "Rhythm", value: "Irregularly irregular", severity: "moderate" },
    ],
    recommendations: [
      "Urgent cardiology referral recommended",
      "Consider anticoagulation therapy (CHA2DS2-VASc score evaluation)",
      "Rate or rhythm control strategy discussion",
      "Echocardiogram to assess cardiac function",
      "24-hour Holter monitor for paroxysmal AF evaluation",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u1",
  },
  {
    id: "c003",
    patientName: "Thomas A.",
    patientAge: 51,
    patientGender: "M",
    date: "2026-06-20",
    diagnosis: "STEMI - Anterior Wall",
    confidence: 99,
    status: "critical",
    rhythm: "Regular sinus",
    heartRate: 96,
    prInterval: 180,
    qrsDuration: 110,
    qtInterval: 460,
    findings: [
      { label: "Heart Rate", value: "96 bpm", severity: "mild" },
      { label: "ST Elevation", value: ">2mm in V1-V4", severity: "severe" },
      { label: "QRS Duration", value: "110 ms (wide)", severity: "moderate" },
      { label: "Q Waves", value: "Pathological Q in V2-V4", severity: "severe" },
      { label: "ST Segment", value: "Significant elevation anterior leads", severity: "severe" },
    ],
    recommendations: [
      "IMMEDIATE: Activate STEMI protocol / call cath lab",
      "Administer dual antiplatelet therapy (aspirin + P2Y12 inhibitor)",
      "Primary PCI within 90 minutes (door-to-balloon)",
      "IV access, oxygen, and continuous ECG monitoring",
      "Troponin, CBC, BMP, coagulation panel STAT",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u1",
  },
  {
    id: "c004",
    patientName: "Grace W.",
    patientAge: 70,
    patientGender: "F",
    date: "2026-06-19",
    diagnosis: "Left Bundle Branch Block",
    confidence: 96,
    status: "abnormal",
    rhythm: "Regular sinus",
    heartRate: 68,
    prInterval: 200,
    qrsDuration: 140,
    qtInterval: 440,
    findings: [
      { label: "Heart Rate", value: "68 bpm", severity: "normal" },
      { label: "QRS Duration", value: "140 ms (broad)", severity: "severe" },
      { label: "QRS Morphology", value: "Broad notched R in I, V5, V6", severity: "severe" },
      { label: "T Wave", value: "Discordant T waves", severity: "moderate" },
      { label: "Axis", value: "Left axis deviation", severity: "moderate" },
    ],
    recommendations: [
      "New LBBB in symptomatic patient: rule out acute coronary syndrome",
      "Cardiology consultation for evaluation",
      "Echocardiogram to assess ventricular function",
      "Consider cardiac MRI if etiology unclear",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u2",
  },
  {
    id: "c005",
    patientName: "Michael R.",
    patientAge: 45,
    patientGender: "M",
    date: "2026-06-18",
    diagnosis: "Premature Ventricular Contractions",
    confidence: 91,
    status: "abnormal",
    rhythm: "Mostly regular with ectopics",
    heartRate: 76,
    prInterval: 160,
    qrsDuration: 130,
    qtInterval: 390,
    findings: [
      { label: "Heart Rate", value: "76 bpm", severity: "normal" },
      { label: "PVC Burden", value: "Frequent (>10/min)", severity: "moderate" },
      { label: "PVC Morphology", value: "Unifocal, LBBB pattern", severity: "moderate" },
      { label: "Compensatory Pause", value: "Present", severity: "mild" },
      { label: "Coupling Interval", value: "Fixed at 520 ms", severity: "mild" },
    ],
    recommendations: [
      "Holter monitor to quantify 24-hour PVC burden",
      "Electrolyte panel (K+, Mg2+)",
      "Thyroid function tests",
      "Evaluate for structural heart disease",
      "Consider electrophysiology referral if PVC burden >10%",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u1",
  },
  {
    id: "c006",
    patientName: "Priya S.",
    patientAge: 32,
    patientGender: "F",
    date: "2026-06-17",
    diagnosis: "Sinus Bradycardia",
    confidence: 98,
    status: "normal",
    rhythm: "Regular sinus",
    heartRate: 48,
    prInterval: 170,
    qrsDuration: 86,
    qtInterval: 440,
    findings: [
      { label: "Heart Rate", value: "48 bpm (bradycardic)", severity: "mild" },
      { label: "PR Interval", value: "170 ms", severity: "normal" },
      { label: "QRS Duration", value: "86 ms", severity: "normal" },
      { label: "QT/QTc", value: "440/394 ms", severity: "normal" },
      { label: "ST-T", value: "Normal", severity: "normal" },
    ],
    recommendations: [
      "Clinical context important — athletes may have physiologic bradycardia",
      "Review medications (beta-blockers, digoxin, etc.)",
      "Holter if symptomatic (syncope, pre-syncope, fatigue)",
      "No immediate intervention if asymptomatic",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u2",
  },
  {
    id: "c007",
    patientName: "David L.",
    patientAge: 42,
    patientGender: "M",
    date: "2026-06-15",
    diagnosis: "First-Degree AV Block",
    confidence: 95,
    status: "normal",
    rhythm: "Regular sinus",
    heartRate: 65,
    prInterval: 240,
    qrsDuration: 90,
    qtInterval: 410,
    findings: [
      { label: "Heart Rate", value: "65 bpm", severity: "normal" },
      { label: "PR Interval", value: "240 ms (prolonged)", severity: "mild" },
      { label: "QRS Duration", value: "90 ms", severity: "normal" },
      { label: "P Wave Morphology", value: "Normal", severity: "normal" },
      { label: "ST-T", value: "Normal", severity: "normal" },
    ],
    recommendations: [
      "Often a benign finding, no treatment required",
      "Medication review (AV nodal blocking agents)",
      "Annual ECG surveillance",
      "Educate on symptoms to watch (syncope, dizziness)",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u2",
  },
  {
    id: "c008",
    patientName: "Amelia T.",
    patientAge: 55,
    patientGender: "F",
    date: "2026-06-12",
    diagnosis: "Right Bundle Branch Block",
    confidence: 93,
    status: "normal",
    rhythm: "Regular sinus",
    heartRate: 74,
    prInterval: 175,
    qrsDuration: 130,
    qtInterval: 405,
    findings: [
      { label: "Heart Rate", value: "74 bpm", severity: "normal" },
      { label: "QRS Duration", value: "130 ms (broad)", severity: "moderate" },
      { label: "RSR' Pattern", value: "Present in V1-V2", severity: "moderate" },
      { label: "S Wave", value: "Wide S in I, V5, V6", severity: "mild" },
      { label: "T Wave", value: "Appropriate discordance V1-V3", severity: "normal" },
    ],
    recommendations: [
      "Isolated RBBB: commonly benign if no structural disease",
      "Echocardiogram recommended to exclude structural cause",
      "Investigate for underlying pulmonary hypertension if suspected",
      "No restriction on activity unless symptomatic",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u1",
  },
  {
    id: "c009",
    patientName: "Carlos B.",
    patientAge: 28,
    patientGender: "M",
    date: "2026-06-10",
    diagnosis: "WPW Pattern",
    confidence: 88,
    status: "abnormal",
    rhythm: "Regular sinus",
    heartRate: 80,
    prInterval: 100,
    qrsDuration: 120,
    qtInterval: 380,
    findings: [
      { label: "Heart Rate", value: "80 bpm", severity: "normal" },
      { label: "PR Interval", value: "100 ms (short)", severity: "moderate" },
      { label: "Delta Wave", value: "Positive in V3-V6, II, aVF", severity: "severe" },
      { label: "QRS Duration", value: "120 ms (slurred onset)", severity: "moderate" },
      { label: "ST-T", value: "Secondary repolarization changes", severity: "mild" },
    ],
    recommendations: [
      "Electrophysiology referral — risk stratification essential",
      "Avoid AV nodal blocking drugs (risk of rapid AF conduction)",
      "Exercise stress test to assess accessory pathway",
      "Discuss catheter ablation if symptomatic or high-risk accessory pathway",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u1",
  },
  {
    id: "c010",
    patientName: "Eleanor N.",
    patientAge: 67,
    patientGender: "F",
    date: "2026-06-08",
    diagnosis: "LVH with Strain Pattern",
    confidence: 90,
    status: "abnormal",
    rhythm: "Regular sinus",
    heartRate: 78,
    prInterval: 185,
    qrsDuration: 96,
    qtInterval: 420,
    findings: [
      { label: "Heart Rate", value: "78 bpm", severity: "normal" },
      { label: "Voltage", value: "Sokolow-Lyon >35mm", severity: "moderate" },
      { label: "ST Depression", value: "Down-sloping in V5-V6", severity: "moderate" },
      { label: "T Wave", value: "Asymmetric inversion lateral leads", severity: "moderate" },
      { label: "R Wave Progression", value: "Slightly delayed", severity: "mild" },
    ],
    recommendations: [
      "Blood pressure optimization — evaluate for hypertensive heart disease",
      "Echocardiogram to assess left ventricular wall thickness and function",
      "Optimize antihypertensive therapy",
      "Lifestyle modifications (salt restriction, weight management)",
    ],
    analyzedBy: "ECG Insight AI v2.3",
    uploadedById: "u1",
  },
];

export function getCasesByUser(userId: string): ECGCase[] {
  return MOCK_CASES.filter((c) => c.uploadedById === userId);
}

export function getCaseById(id: string): ECGCase | undefined {
  return MOCK_CASES.find((c) => c.id === id);
}

export function getStatusColor(
  status: ECGStatus,
  colors: { success: string; warning: string; destructive: string }
): string {
  switch (status) {
    case "normal":
      return colors.success;
    case "abnormal":
      return colors.warning;
    case "critical":
      return colors.destructive;
  }
}

export interface DashboardStats {
  totalCases: number;
  thisWeek: number;
  accuracyRate: number;
  criticalAlerts: number;
}

export function getDashboardStats(userId: string): DashboardStats {
  const userCases = getCasesByUser(userId);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = userCases.filter(
    (c) => new Date(c.date) >= weekAgo
  ).length;
  const criticalAlerts = userCases.filter((c) => c.status === "critical").length;
  return {
    totalCases: userCases.length,
    thisWeek,
    accuracyRate: 95,
    criticalAlerts,
  };
}
