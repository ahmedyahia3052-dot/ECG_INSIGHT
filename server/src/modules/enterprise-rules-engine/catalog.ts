import type { SystemRuleTemplate } from "./types";

function cond(
  field: SystemRuleTemplate["conditions"][number]["field"],
  operator: SystemRuleTemplate["conditions"][number]["operator"],
  threshold?: number,
  stringValue?: string,
  boolValue?: boolean,
) {
  return { boolValue, field, operator, threshold, stringValue };
}

function act(actionType: SystemRuleTemplate["actions"][number]["actionType"], payload?: Record<string, unknown>) {
  return { actionType, payload, sortOrder: 0 };
}

export const ENTERPRISE_SYSTEM_RULE_TEMPLATES: SystemRuleTemplate[] = [
  {
    actions: [act("GENERATE_ALERT", { severity: "HIGH" }), act("NOTIFY_PHYSICIAN")],
    category: "INTERVAL",
    conditions: [cond("QTC_INTERVAL", "GT", 470)],
    description: "Triggers when corrected QT interval exceeds prolonged threshold.",
    name: "QT Prolongation Threshold",
    priority: 10,
    ruleKey: "qt-prolongation-threshold",
    templateId: "QT_THRESHOLD",
  },
  {
    actions: [act("CREATE_RECOMMENDATION"), act("SCHEDULE_FOLLOW_UP", { days: 7 })],
    category: "RATE",
    conditions: [cond("HEART_RATE", "GT", 100)],
    description: "Detects tachycardia above configured heart rate threshold.",
    name: "Heart Rate Above Threshold",
    priority: 20,
    ruleKey: "hr-above-threshold",
    templateId: "HR_GT_THRESHOLD",
  },
  {
    actions: [act("GENERATE_ALERT"), act("REQUIRE_MANUAL_REVIEW")],
    category: "RATE",
    conditions: [cond("HEART_RATE", "LT", 50)],
    description: "Detects bradycardia below configured heart rate threshold.",
    name: "Heart Rate Below Threshold",
    priority: 15,
    ruleKey: "hr-below-threshold",
    templateId: "HR_LT_THRESHOLD",
  },
  {
    actions: [act("CREATE_RECOMMENDATION"), act("NOTIFY_PHYSICIAN")],
    category: "CONDUCTION",
    conditions: [cond("QRS_DURATION", "GT", 120)],
    description: "Wide QRS duration above conduction delay threshold.",
    name: "QRS Duration Above Threshold",
    priority: 30,
    ruleKey: "qrs-above-threshold",
    templateId: "QRS_GT_THRESHOLD",
  },
  {
    actions: [act("GENERATE_ALERT"), act("NOTIFY_PHYSICIAN"), act("ESCALATE_CASE")],
    category: "RHYTHM",
    conditions: [cond("AF_DETECTED", "IS_TRUE", undefined, undefined, true)],
    description: "Atrial fibrillation detected in rhythm analysis.",
    name: "Atrial Fibrillation Detected",
    priority: 5,
    ruleKey: "af-detected",
    templateId: "AF_DETECTED",
  },
  {
    actions: [act("MARK_CRITICAL"), act("NOTIFY_PHYSICIAN"), act("NOTIFY_ADMIN")],
    category: "ISCHEMIA",
    conditions: [cond("ST_ELEVATION", "GT", 1)],
    description: "ST segment elevation above acute ischemia threshold.",
    name: "ST Elevation Threshold",
    priority: 1,
    ruleKey: "st-elevation-threshold",
    templateId: "ST_ELEVATION",
  },
  {
    actions: [act("GENERATE_ALERT"), act("CREATE_RECOMMENDATION")],
    category: "ISCHEMIA",
    conditions: [cond("ST_DEVIATION", "LT", -0.5)],
    description: "ST depression below ischemia threshold.",
    name: "ST Depression Threshold",
    priority: 12,
    ruleKey: "st-depression-threshold",
    templateId: "ST_DEPRESSION",
  },
  {
    actions: [act("CREATE_RECOMMENDATION"), act("NOTIFY_PHYSICIAN")],
    category: "CONDUCTION",
    conditions: [cond("BBB_DETECTED", "IS_TRUE", undefined, undefined, true)],
    description: "Bundle branch block pattern detected.",
    name: "Bundle Branch Block Detected",
    priority: 25,
    ruleKey: "bbb-detected",
    templateId: "BBB_DETECTED",
  },
  {
    actions: [act("GENERATE_ALERT"), act("REQUIRE_MANUAL_REVIEW")],
    category: "RHYTHM",
    conditions: [cond("PVC_COUNT", "GT", 5)],
    description: "High premature ventricular contraction burden.",
    name: "PVC Count Threshold",
    priority: 18,
    ruleKey: "pvc-count-threshold",
    templateId: "PVC_COUNT",
  },
  {
    actions: [act("ESCALATE_CASE"), act("NOTIFY_PHYSICIAN"), act("MARK_CRITICAL")],
    category: "RISK",
    conditions: [cond("RISK_SCORE", "GT", 45)],
    description: "Composite ECG risk score exceeds high-risk threshold.",
    name: "Risk Score Threshold",
    priority: 8,
    ruleKey: "risk-score-threshold",
    templateId: "RISK_SCORE",
  },
  {
    actions: [act("MARK_CRITICAL"), act("NOTIFY_ADMIN"), act("ESCALATE_CASE")],
    category: "RISK",
    conditions: [cond("CLINICAL_PRIORITY", "EQ", undefined, "CRITICAL")],
    description: "Clinical priority classified as critical.",
    name: "Critical Clinical Priority",
    priority: 2,
    ruleKey: "clinical-priority-critical",
    templateId: "CLINICAL_PRIORITY",
  },
];

export function listSystemRuleTemplateIds() {
  return ENTERPRISE_SYSTEM_RULE_TEMPLATES.map((template) => template.templateId);
}
