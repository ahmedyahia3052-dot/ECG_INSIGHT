import type { RecommendationTypeCode } from "./types";

export interface DecisionRuleDefinition {
  criteriaJson: Record<string, unknown>;
  description: string;
  evidenceLevel: string;
  name: string;
  priorityWeight: number;
  recommendationTypes: RecommendationTypeCode[];
  ruleCode: string;
}

export const DEFAULT_DECISION_SUPPORT_RULES: DecisionRuleDefinition[] = [
  {
    criteriaJson: { findingCodes: ["STEMI", "VT", "VF"], minPriorityScore: 95 },
    description: "Acute life-threatening rhythm or ischemia requires emergency evaluation.",
    evidenceLevel: "AHA-ACLS",
    name: "Emergency evaluation for critical findings",
    priorityWeight: 1,
    recommendationTypes: ["EMERGENCY_EVALUATION", "HOSPITAL_ADMISSION"],
    ruleCode: "S65_EMERGENCY_CRITICAL",
  },
  {
    criteriaJson: { findingCodes: ["STEMI", "NSTEMI"], minPriorityScore: 90 },
    description: "Ischemic ECG patterns require troponin and urgent cardiology pathway.",
    evidenceLevel: "ESC-ACS",
    name: "Acute coronary syndrome workup",
    priorityWeight: 0.95,
    recommendationTypes: ["TROPONIN", "CARDIOLOGY_REFERRAL", "REPEAT_ECG"],
    ruleCode: "S65_ACS_WORKUP",
  },
  {
    criteriaJson: { findingCodes: ["AF", "AFL"], minPriorityScore: 75 },
    description: "Atrial arrhythmia warrants rhythm monitoring and cardiology review.",
    evidenceLevel: "AHA-AF",
    name: "Atrial arrhythmia follow-up",
    priorityWeight: 0.8,
    recommendationTypes: ["HOLTER_MONITOR", "CARDIOLOGY_REFERRAL", "ECHOCARDIOGRAPHY"],
    ruleCode: "S65_ATRIAL_ARRHYTHMIA",
  },
  {
    criteriaJson: { qrsDurationMsMin: 120 },
    description: "Wide QRS suggests conduction disease requiring structural evaluation.",
    evidenceLevel: "ACC-HRS",
    name: "Wide QRS conduction evaluation",
    priorityWeight: 0.7,
    recommendationTypes: ["ECHOCARDIOGRAPHY", "CARDIOLOGY_REFERRAL"],
    ruleCode: "S65_WIDE_QRS",
  },
  {
    criteriaJson: { qtcBazettMsMin: 480 },
    description: "Prolonged QTc requires electrolyte review and medication reconciliation.",
    evidenceLevel: "HRS-QT",
    name: "Prolonged QTc evaluation",
    priorityWeight: 0.85,
    recommendationTypes: ["ELECTROLYTES", "OBSERVATION", "REPEAT_ECG"],
    ruleCode: "S65_LONG_QT",
  },
  {
    criteriaJson: { measurementConfidenceMax: 0.55 },
    description: "Low-confidence acquisition requires repeat measurements and manual review.",
    evidenceLevel: "enterprise-qa",
    name: "Low signal quality escalation",
    priorityWeight: 0.65,
    recommendationTypes: ["REPEAT_MEASUREMENTS", "MANUAL_REVIEW_REQUIRED", "REPEAT_ECG"],
    ruleCode: "S65_LOW_QUALITY",
  },
  {
    criteriaJson: { defaultRoutine: true },
    description: "Routine ECG follow-up for stable findings.",
    evidenceLevel: "enterprise-consensus",
    name: "Routine ECG follow-up",
    priorityWeight: 0.4,
    recommendationTypes: ["REPEAT_ECG", "OBSERVATION"],
    ruleCode: "S65_ROUTINE_FOLLOWUP",
  },
];

export const RECOMMENDATION_CATALOG: Record<RecommendationTypeCode, { action: string; title: string }> = {
  CARDIOLOGY_REFERRAL: {
    action: "Refer to cardiology for expert interpretation and management planning",
    title: "Cardiology Referral",
  },
  ECHOCARDIOGRAPHY: {
    action: "Order transthoracic echocardiography to assess cardiac structure and function",
    title: "Echocardiography",
  },
  ELECTROLYTES: {
    action: "Obtain serum electrolytes including potassium, calcium, and magnesium",
    title: "Electrolytes",
  },
  EMERGENCY_EVALUATION: {
    action: "Activate emergency evaluation pathway and continuous monitoring",
    title: "Emergency Evaluation",
  },
  HOLTER_MONITOR: {
    action: "Arrange ambulatory Holter monitoring to characterize arrhythmia burden",
    title: "Holter Monitor",
  },
  HOSPITAL_ADMISSION: {
    action: "Consider hospital admission for monitored acute care management",
    title: "Hospital Admission",
  },
  MANUAL_REVIEW_REQUIRED: {
    action: "Flag case for manual physician review before clinical closure",
    title: "Manual Review Required",
  },
  OBSERVATION: {
    action: "Observe with serial clinical assessment and repeat ECG as indicated",
    title: "Observation",
  },
  REPEAT_ECG: {
    action: "Repeat 12-lead ECG with optimized lead placement and artifact control",
    title: "Repeat ECG",
  },
  REPEAT_MEASUREMENTS: {
    action: "Repeat automated interval and amplitude measurements after signal optimization",
    title: "Repeat Measurements",
  },
  TROPONIN: {
    action: "Obtain serial high-sensitivity troponin per acute chest pain protocol",
    title: "Troponin",
  },
};

export function intervalDaysForPriority(priority: "ROUTINE" | "URGENT" | "EMERGENT" | "CRITICAL") {
  switch (priority) {
    case "CRITICAL":
      return 3;
    case "EMERGENT":
      return 7;
    case "URGENT":
      return 14;
    default:
      return 90;
  }
}
