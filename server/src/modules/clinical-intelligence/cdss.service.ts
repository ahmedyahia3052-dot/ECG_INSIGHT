import type {
  AISeverity,
  CDSSFindingType,
  CDSSOccupationalDecision,
  CDSSRecommendationPriority,
  CDSSRiskCategory,
  CDSSRuleCategory,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { createNotification } from "../../utils/notifications";

type Rule = {
  category: CDSSRuleCategory;
  description: string;
  name: string;
  ruleId: string;
  thresholdJson?: Record<string, unknown>;
};

type FindingDraft = {
  findingType: CDSSFindingType;
  ruleId: string;
  title: string;
  message: string;
  severity: AISeverity;
  confidenceScore: number;
  evidence: Prisma.InputJsonObject;
  recommendation?: string;
  priority?: CDSSRecommendationPriority;
};

const defaultRules: Rule[] = [
  { category: "RHYTHM", ruleId: "CDSS-RHY-001", name: "Severe bradycardia", description: "Heart rate below 40 bpm requires urgent review.", thresholdJson: { heartRateBelow: 40 } },
  { category: "RHYTHM", ruleId: "CDSS-RHY-002", name: "Tachycardia", description: "Heart rate above 120 bpm increases arrhythmia and ischemia risk.", thresholdJson: { heartRateAbove: 120 } },
  { category: "QT_INTERVAL", ruleId: "CDSS-QT-001", name: "QT prolongation", description: "QTc above 480 ms suggests increased ventricular arrhythmia risk.", thresholdJson: { qtcAbove: 480 } },
  { category: "QT_INTERVAL", ruleId: "CDSS-QT-002", name: "Extreme QT prolongation", description: "QTc at or above 500 ms is a red flag.", thresholdJson: { qtcAbove: 500 } },
  { category: "CONDUCTION", ruleId: "CDSS-COND-001", name: "Conduction abnormality", description: "Wide QRS or AV block language triggers conduction evaluation.", thresholdJson: { qrsAbove: 120 } },
  { category: "ISCHEMIA", ruleId: "CDSS-ISC-001", name: "STEMI detection", description: "STEMI diagnosis or ST elevation language triggers emergency referral." },
  { category: "ISCHEMIA", ruleId: "CDSS-ISC-002", name: "Ischemia suspicion", description: "Ischemia language triggers cardiology workup." },
  { category: "ARRHYTHMIA", ruleId: "CDSS-ARR-001", name: "Critical arrhythmia", description: "VT or AF with rapid ventricular response triggers urgent action." },
  { category: "RISK", ruleId: "CDSS-RISK-001", name: "Cardiovascular risk stratification", description: "Combines demographics, history, ECG findings, symptoms, and occupational exposure." },
  { category: "OCCUPATIONAL_FITNESS", ruleId: "CDSS-OCC-001", name: "Safety-sensitive fitness", description: "Determines work fitness for driving, heights, confined spaces, and heavy equipment." },
  { category: "RECOMMENDATION", ruleId: "CDSS-REC-001", name: "Clinical recommendations", description: "Generates referral, echo, stress ECG, Holter, repeat ECG, and follow-up recommendations." },
  { category: "TREND", ruleId: "CDSS-TREND-001", name: "Longitudinal ECG trend", description: "Compares recent ECGs for worsening, improvement, or new abnormality." },
];

const safetySensitiveProfiles = ["driver", "crane operator", "heavy equipment operator", "working at heights", "confined spaces"];

const runInclude = {
  findings: { orderBy: [{ findingType: "asc" }, { severity: "desc" }, { createdAt: "desc" }] },
} satisfies Prisma.ClinicalDecisionSupportRunInclude;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function riskCategory(score: number): CDSSRiskCategory {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH_RISK";
  if (score >= 35) return "MODERATE_RISK";
  return "LOW_RISK";
}

function severityForRisk(category: CDSSRiskCategory): AISeverity {
  if (category === "CRITICAL") return "CRITICAL";
  if (category === "HIGH_RISK") return "SEVERE";
  if (category === "MODERATE_RISK") return "MODERATE";
  return "MILD";
}

function age(dateOfBirth: Date) {
  const now = new Date();
  let years = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) years -= 1;
  return years;
}

function normalize(text?: string | null) {
  return String(text ?? "").toLowerCase();
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function patientOccupation(patient: Awaited<ReturnType<typeof loadContext>>["patient"]) {
  return normalize(patient.jobTitle ?? patient.occupation ?? patient.employeeProfile?.jobTitle ?? patient.employeeProfile?.workCategory ?? "office worker");
}

async function ensureDefaultRules(userId?: string) {
  await Promise.all(
    defaultRules.map((rule) =>
      prisma.clinicalDecisionRule.upsert({
        create: {
          category: rule.category,
          createdById: userId,
          description: rule.description,
          name: rule.name,
          ruleId: rule.ruleId,
          thresholdJson: rule.thresholdJson as Prisma.InputJsonObject | undefined,
        },
        update: {
          category: rule.category,
          description: rule.description,
          enabled: true,
          name: rule.name,
          thresholdJson: rule.thresholdJson as Prisma.InputJsonObject | undefined,
        },
        where: { ruleId: rule.ruleId },
      }),
    ),
  );
  return prisma.clinicalDecisionRule.findMany({ orderBy: { ruleId: "asc" }, where: { enabled: true } });
}

async function loadContext(caseId: string) {
  const ecgCase = await prisma.eCGCase.findFirst({
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      measurements: { orderBy: { createdAt: "desc" }, take: 1 },
      patient: {
        include: {
          cardiacHistory: true,
          employeeProfile: { include: { occupationalRiskProfile: true } },
          fitnessAssessments: { orderBy: { createdAt: "desc" }, take: 3 },
          cases: {
            include: {
              analyses: { orderBy: { createdAt: "desc" }, take: 1 },
              measurements: { orderBy: { createdAt: "desc" }, take: 1 },
            },
            orderBy: { uploadDate: "desc" },
            take: 6,
          },
        },
      },
    },
    where: { OR: [{ id: caseId }, { caseId }, { caseNumber: caseId }] },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return { ecgCase, patient: ecgCase.patient };
}

function buildRuleFindings(context: Awaited<ReturnType<typeof loadContext>>) {
  const { ecgCase, patient } = context;
  const measurement = ecgCase.measurements[0];
  const analysis = ecgCase.analyses[0];
  const text = normalize(`${analysis?.diagnosis} ${analysis?.interpretation} ${ecgCase.aiDiagnosis} ${ecgCase.doctorDiagnosis} ${ecgCase.finalDiagnosis} ${ecgCase.rhythm}`);
  const findings: FindingDraft[] = [];

  if (measurement?.heartRate !== undefined && measurement.heartRate < 40) {
    findings.push({
      confidenceScore: 0.92,
      evidence: { heartRate: measurement.heartRate },
      findingType: "RED_FLAG",
      message: `Heart rate ${measurement.heartRate} bpm is below the severe bradycardia threshold.`,
      priority: "URGENT",
      recommendation: "Urgent physician assessment and correlation with symptoms/medications.",
      ruleId: "CDSS-RHY-001",
      severity: "CRITICAL",
      title: "Severe bradycardia",
    });
  }
  if (measurement?.heartRate !== undefined && measurement.heartRate > 120) {
    findings.push({
      confidenceScore: 0.86,
      evidence: { heartRate: measurement.heartRate },
      findingType: "RULE_TRIGGER",
      message: `Heart rate ${measurement.heartRate} bpm exceeds tachycardia threshold.`,
      priority: "SOON",
      recommendation: "Assess rhythm, fever, anemia, ischemia, dehydration, and medication drivers.",
      ruleId: "CDSS-RHY-002",
      severity: "MODERATE",
      title: "Tachycardia threshold triggered",
    });
  }
  if (measurement?.qtcInterval !== undefined && measurement.qtcInterval > 480) {
    findings.push({
      confidenceScore: measurement.qtcInterval >= 500 ? 0.93 : 0.86,
      evidence: { qtcInterval: measurement.qtcInterval },
      findingType: measurement.qtcInterval >= 500 ? "RED_FLAG" : "RULE_TRIGGER",
      message: `QTc ${measurement.qtcInterval} ms exceeds the QT prolongation threshold.`,
      priority: measurement.qtcInterval >= 500 ? "URGENT" : "SOON",
      recommendation: "Review QT-prolonging drugs, electrolytes, syncope history, and consider cardiology referral.",
      ruleId: measurement.qtcInterval >= 500 ? "CDSS-QT-002" : "CDSS-QT-001",
      severity: measurement.qtcInterval >= 500 ? "CRITICAL" : "SEVERE",
      title: measurement.qtcInterval >= 500 ? "Extreme QT prolongation" : "QT prolongation",
    });
  }
  if (measurement?.qrsDuration !== undefined && measurement.qrsDuration > 120 || containsAny(text, ["av block", "bundle branch", "conduction"])) {
    findings.push({
      confidenceScore: 0.82,
      evidence: { qrsDuration: measurement?.qrsDuration, textMatched: containsAny(text, ["av block", "bundle branch", "conduction"]) },
      findingType: "RULE_TRIGGER",
      message: "Conduction abnormality evidence detected from QRS duration or interpretation text.",
      priority: "SOON",
      recommendation: "Assess for AV block severity, bundle branch pattern, symptoms, and need for pacing evaluation.",
      ruleId: "CDSS-COND-001",
      severity: containsAny(text, ["complete heart block", "third degree"]) ? "CRITICAL" : "MODERATE",
      title: "Conduction abnormality",
    });
  }
  if (containsAny(text, ["stemi", "st elevation myocardial infarction"])) {
    findings.push({
      confidenceScore: analysis?.confidenceScore ?? 0.91,
      evidence: { diagnosis: analysis?.diagnosis ?? ecgCase.aiDiagnosis, interpretation: analysis?.interpretation },
      findingType: "RED_FLAG",
      message: "STEMI language detected in ECG interpretation.",
      priority: "EMERGENCY",
      recommendation: "Activate emergency referral pathway and correlate with symptoms/troponin.",
      ruleId: "CDSS-ISC-001",
      severity: "CRITICAL",
      title: "STEMI red flag",
    });
  } else if (containsAny(text, ["ischemia", "ischemic", "st depression"])) {
    findings.push({
      confidenceScore: analysis?.confidenceScore ?? 0.78,
      evidence: { diagnosis: analysis?.diagnosis ?? ecgCase.aiDiagnosis },
      findingType: "RULE_TRIGGER",
      message: "Ischemia suspicion language detected.",
      priority: "URGENT",
      recommendation: "Cardiology referral and ischemia workup with stress testing or coronary evaluation as clinically appropriate.",
      ruleId: "CDSS-ISC-002",
      severity: "SEVERE",
      title: "Ischemia suspicion",
    });
  }
  if (containsAny(text, ["ventricular tachycardia", " vt ", "af rvr", "atrial fibrillation with rapid", "complete heart block"])) {
    findings.push({
      confidenceScore: analysis?.confidenceScore ?? 0.88,
      evidence: { diagnosis: analysis?.diagnosis ?? ecgCase.aiDiagnosis, heartRate: measurement?.heartRate },
      findingType: "RED_FLAG",
      message: "Critical arrhythmia or complete heart block pattern detected.",
      priority: "EMERGENCY",
      recommendation: "Immediate clinical escalation and continuous monitoring.",
      ruleId: "CDSS-ARR-001",
      severity: "CRITICAL",
      title: "Critical rhythm red flag",
    });
  }
  if (patient.cardiacHistory?.arrhythmiaHistory || patient.arrhythmiaHistoryFlag) {
    findings.push({
      confidenceScore: 0.78,
      evidence: { arrhythmiaHistory: true },
      findingType: "RISK_FACTOR",
      message: "Prior arrhythmia history increases cardiovascular event and fitness risk.",
      ruleId: "CDSS-RISK-001",
      severity: "MODERATE",
      title: "Arrhythmia history risk factor",
    });
  }

  return findings;
}

function calculateRisk(context: Awaited<ReturnType<typeof loadContext>>, findings: FindingDraft[]) {
  const { ecgCase, patient } = context;
  const measurement = ecgCase.measurements[0];
  const analysis = ecgCase.analyses[0];
  const patientAge = age(patient.dateOfBirth);
  const history = patient.cardiacHistory;
  const riskProfile = patient.employeeProfile?.occupationalRiskProfile;
  const score = clamp(
    (patientAge >= 65 ? 16 : patientAge >= 50 ? 8 : 0) +
      (patient.gender === "MALE" ? 3 : 0) +
      (patient.hypertension || history?.hypertension ? 9 : 0) +
      (patient.diabetes || history?.diabetesMellitus ? 10 : 0) +
      (patient.smokingStatus === "CURRENT" ? 8 : patient.smokingStatus === "FORMER" ? 4 : 0) +
      (patient.obesity || (patient.bmi ?? 0) >= 30 ? 7 : 0) +
      (history?.coronaryArteryDisease || patient.ischemicHeartDisease ? 15 : 0) +
      (history?.heartFailure || patient.heartFailure ? 16 : 0) +
      (history?.arrhythmiaHistory || patient.arrhythmiaHistoryFlag ? 12 : 0) +
      (riskProfile?.highRisk || patient.employeeProfile?.criticalJob ? 9 : 0) +
      (measurement?.qtcInterval && measurement.qtcInterval > 480 ? 12 : 0) +
      (analysis?.severity === "CRITICAL" || ecgCase.priority === "CRITICAL" ? 20 : analysis?.severity === "SEVERE" ? 14 : 0) +
      findings.filter((finding) => finding.findingType === "RED_FLAG").length * 15,
  );
  return { category: riskCategory(score), score };
}

function occupationalDecision(context: Awaited<ReturnType<typeof loadContext>>, risk: { category: CDSSRiskCategory; score: number }, findings: FindingDraft[]) {
  const { patient } = context;
  const occupation = patientOccupation(patient);
  const safetySensitive = safetySensitiveProfiles.some((profile) => occupation.includes(profile));
  const hasEmergencyRedFlag = findings.some((finding) => finding.priority === "EMERGENCY");
  const hasCritical = findings.some((finding) => finding.severity === "CRITICAL");
  let decision: CDSSOccupationalDecision = "FIT";
  const restrictions: string[] = [];

  if (hasEmergencyRedFlag || (risk.category === "CRITICAL" && safetySensitive)) {
    decision = "TEMPORARILY_UNFIT";
    restrictions.push("Remove from safety-sensitive duties pending cardiology clearance.");
  } else if (risk.category === "HIGH_RISK" || hasCritical) {
    decision = safetySensitive ? "TEMPORARILY_UNFIT" : "FIT_WITH_RESTRICTIONS";
    restrictions.push("Avoid driving, working at heights, confined spaces, and heavy equipment until reviewed.");
  } else if (risk.category === "MODERATE_RISK" && safetySensitive) {
    decision = "FIT_WITH_RESTRICTIONS";
    restrictions.push("No lone safety-critical tasks until follow-up ECG and physician sign-off.");
  }

  if (risk.score >= 90 && hasCritical) {
    decision = "PERMANENTLY_UNFIT";
    restrictions.push("Consider permanent restriction from high-risk safety-sensitive role if confirmed by specialist.");
  }

  return { decision, occupation, restrictions, safetySensitive };
}

function recommendations(context: Awaited<ReturnType<typeof loadContext>>, risk: { category: CDSSRiskCategory; score: number }, findings: FindingDraft[]) {
  const result: FindingDraft[] = [];
  const has = (ruleId: string) => findings.some((finding) => finding.ruleId === ruleId);
  const priority: CDSSRecommendationPriority = risk.category === "CRITICAL" ? "EMERGENCY" : risk.category === "HIGH_RISK" ? "URGENT" : risk.category === "MODERATE_RISK" ? "SOON" : "ROUTINE";
  if (risk.category !== "LOW_RISK") {
    result.push({
      confidenceScore: 0.86,
      evidence: { riskCategory: risk.category, riskScore: risk.score },
      findingType: "RECOMMENDATION",
      message: "Risk score exceeds low-risk category.",
      priority,
      recommendation: priority === "EMERGENCY" ? "Emergency referral." : "Cardiology referral.",
      ruleId: "CDSS-REC-001",
      severity: severityForRisk(risk.category),
      title: priority === "EMERGENCY" ? "Emergency referral recommended" : "Cardiology referral recommended",
    });
  }
  if (has("CDSS-QT-001") || has("CDSS-QT-002")) {
    result.push({ confidenceScore: 0.84, evidence: { triggeringRules: ["CDSS-QT-001", "CDSS-QT-002"] }, findingType: "RECOMMENDATION", message: "QT prolongation requires reversible cause review.", priority: "SOON", recommendation: "Repeat ECG, electrolytes, medication review, and Holter if symptomatic.", ruleId: "CDSS-REC-001", severity: "MODERATE", title: "QT follow-up recommended" });
  }
  if (has("CDSS-ISC-002")) {
    result.push({ confidenceScore: 0.82, evidence: { triggeringRule: "CDSS-ISC-002" }, findingType: "RECOMMENDATION", message: "Ischemia suspicion should be investigated.", priority: "URGENT", recommendation: "Stress ECG or coronary evaluation based on symptoms and contraindications.", ruleId: "CDSS-REC-001", severity: "SEVERE", title: "Ischemia workup recommended" });
  }
  if (containsAny(normalize(context.ecgCase.rhythm ?? context.ecgCase.aiDiagnosis), ["atrial", "ectopy", "tachy"])) {
    result.push({ confidenceScore: 0.8, evidence: { rhythm: context.ecgCase.rhythm, diagnosis: context.ecgCase.aiDiagnosis }, findingType: "RECOMMENDATION", message: "Rhythm abnormality may be intermittent or persistent.", priority: "SOON", recommendation: "Holter monitoring recommended if palpitations, syncope, or recurrent symptoms.", ruleId: "CDSS-REC-001", severity: "MODERATE", title: "Holter consideration" });
  }
  return result;
}

function trendInterpretation(context: Awaited<ReturnType<typeof loadContext>>) {
  const cases = context.patient.cases;
  const latest = cases[0];
  const previous = cases[1];
  const latestMeasurement = latest?.measurements[0];
  const previousMeasurement = previous?.measurements[0];
  const latestAnalysis = latest?.analyses[0];
  const previousAnalysis = previous?.analyses[0];
  const findings: FindingDraft[] = [];
  if (!latest || !previous || !latestMeasurement || !previousMeasurement) {
    return { findings, summary: "Insufficient prior ECG data for longitudinal comparison." };
  }
  const qtcDelta = latestMeasurement.qtcInterval - previousMeasurement.qtcInterval;
  const heartRateDelta = latestMeasurement.heartRate - previousMeasurement.heartRate;
  const newAbnormality = latestAnalysis?.severity !== "NORMAL" && previousAnalysis?.severity === "NORMAL";
  const worsening = qtcDelta >= 30 || heartRateDelta >= 30 || newAbnormality;
  const improvement = qtcDelta <= -30 || (latestAnalysis?.severity === "NORMAL" && previousAnalysis && previousAnalysis.severity !== "NORMAL");
  const summary = worsening
    ? "Longitudinal review suggests worsening ECG risk compared with previous tracing."
    : improvement
      ? "Longitudinal review suggests improvement compared with previous tracing."
      : "No major deterioration detected compared with previous ECG.";
  findings.push({
    confidenceScore: 0.78,
    evidence: { heartRateDelta, latestCaseId: latest.id, previousCaseId: previous.id, qtcDelta },
    findingType: "TREND",
    message: summary,
    priority: worsening ? "SOON" : "ROUTINE",
    recommendation: worsening ? "Compare original tracings and consider expedited clinical review." : "Continue routine longitudinal surveillance.",
    ruleId: "CDSS-TREND-001",
    severity: worsening ? "MODERATE" : improvement ? "MILD" : "MILD",
    title: worsening ? "Worsening ECG trend" : improvement ? "Improving ECG trend" : "Stable ECG trend",
  });
  return { findings, summary };
}

export async function evaluateCDSS(caseId: string, evaluatedById: string) {
  const [context] = await Promise.all([loadContext(caseId), ensureDefaultRules(evaluatedById)]);
  const ruleFindings = buildRuleFindings(context);
  const risk = calculateRisk(context, ruleFindings);
  const riskFinding: FindingDraft = {
    confidenceScore: context.ecgCase.measurements[0] || context.ecgCase.analyses[0] ? 0.88 : 0.68,
    evidence: {
      age: age(context.patient.dateOfBirth),
      caseId: context.ecgCase.id,
      patientId: context.patient.id,
      riskCategory: risk.category,
      riskScore: risk.score,
    },
    findingType: "RISK_FACTOR",
    message: `Automatic cardiovascular risk score is ${risk.score}/100 (${risk.category.replace(/_/g, " ")}).`,
    ruleId: "CDSS-RISK-001",
    severity: severityForRisk(risk.category),
    title: "Cardiovascular risk stratification",
  };
  const occupational = occupationalDecision(context, risk, ruleFindings);
  const occupationalFinding: FindingDraft = {
    confidenceScore: 0.84,
    evidence: { occupation: occupational.occupation, restrictions: occupational.restrictions, safetySensitive: occupational.safetySensitive },
    findingType: "OCCUPATIONAL_DECISION",
    message: `Occupational CDSS decision: ${occupational.decision.replace(/_/g, " ")}.`,
    priority: occupational.decision === "FIT" ? "ROUTINE" : "URGENT",
    recommendation: occupational.restrictions.join(" ") || "Fit for work with routine surveillance.",
    ruleId: "CDSS-OCC-001",
    severity: occupational.decision === "FIT" ? "MILD" : occupational.decision === "FIT_WITH_RESTRICTIONS" ? "MODERATE" : "SEVERE",
    title: "Occupational fitness decision",
  };
  const trend = trendInterpretation(context);
  const allFindings = [...ruleFindings, riskFinding, occupationalFinding, ...recommendations(context, risk, ruleFindings), ...trend.findings];
  const redFlags = allFindings.filter((finding) => finding.findingType === "RED_FLAG");
  const summary = redFlags.length
    ? `${redFlags.length} red flag(s) detected. Highest priority: ${redFlags[0].title}.`
    : `No emergency red flags detected. Overall risk: ${risk.category.replace(/_/g, " ")}.`;
  const explainability = {
    confidence: allFindings.length ? Number((allFindings.reduce((sum, finding) => sum + finding.confidenceScore, 0) / allFindings.length).toFixed(2)) : 0.7,
    ruleIdentifiers: Array.from(new Set(allFindings.map((finding) => finding.ruleId))),
    supportingEvidence: allFindings.map((finding) => ({ evidence: finding.evidence, ruleId: finding.ruleId, title: finding.title })),
    triggeringFindings: allFindings.map((finding) => finding.title),
    why: summary,
  } satisfies Prisma.InputJsonObject;
  const inputSnapshot = {
    analysis: context.ecgCase.analyses[0],
    case: { id: context.ecgCase.id, priority: context.ecgCase.priority, status: context.ecgCase.status },
    measurement: context.ecgCase.measurements[0],
    patient: {
      age: age(context.patient.dateOfBirth),
      bmi: context.patient.bmi,
      diabetes: context.patient.diabetes,
      hypertension: context.patient.hypertension,
      occupation: occupational.occupation,
      smokingStatus: context.patient.smokingStatus,
    },
  } as Prisma.InputJsonObject;
  const run = await prisma.clinicalDecisionSupportRun.create({
    data: {
      caseId: context.ecgCase.id,
      evaluatedById,
      explainabilityJson: explainability,
      findings: {
        create: allFindings.map((finding) => ({
          confidenceScore: finding.confidenceScore,
          evidence: finding.evidence,
          findingType: finding.findingType,
          message: finding.message,
          priority: finding.priority,
          recommendation: finding.recommendation,
          ruleId: finding.ruleId,
          severity: finding.severity,
          title: finding.title,
        })),
      },
      inputSnapshot,
      occupationalDecision: occupational.decision,
      occupationalProfile: occupational.occupation,
      patientId: context.patient.id,
      riskCategory: risk.category,
      riskScore: risk.score,
      summary,
      trendSummary: trend.summary,
    },
    include: runInclude,
  });
  await prisma.auditLog.create({
    data: {
      action: "CDSS_DECISION_GENERATED",
      actorId: evaluatedById,
      caseId: context.ecgCase.id,
      entityId: run.id,
      entityType: "ClinicalDecisionSupportRun",
      message: `CDSS decision generated: ${risk.category}.`,
      metadata: { redFlags: redFlags.length, ruleIdentifiers: explainability.ruleIdentifiers },
      patientId: context.patient.id,
    },
  });
  await prisma.timelineEvent.create({
    data: {
      caseId: context.ecgCase.id,
      metadata: { cdssRunId: run.id, riskCategory: risk.category, riskScore: risk.score },
      patientId: context.patient.id,
      title: `CDSS decision support completed: ${risk.category.replace(/_/g, " ")}`,
      type: "RISK_ASSESSMENT_COMPLETED",
    },
  });
  if (redFlags.length > 0 || risk.category === "CRITICAL") {
    await createNotification({
      caseId: context.ecgCase.id,
      message: summary,
      patientId: context.patient.id,
      targetRole: "DOCTOR",
      title: "CDSS Red Flag Alert",
      type: "CRITICAL",
    });
  }
  return run;
}

export async function listCDSSRuns(caseId: string) {
  return prisma.clinicalDecisionSupportRun.findMany({
    include: runInclude,
    orderBy: { createdAt: "desc" },
    take: 20,
    where: { caseId },
  });
}

export async function listCDSSRules() {
  await ensureDefaultRules();
  return prisma.clinicalDecisionRule.findMany({ orderBy: { ruleId: "asc" } });
}

export async function upsertCDSSRule(input: Rule & { enabled?: boolean; evidenceLevel?: string; version?: string }, userId: string) {
  return prisma.clinicalDecisionRule.upsert({
    create: {
      category: input.category,
      createdById: userId,
      description: input.description,
      enabled: input.enabled ?? true,
      evidenceLevel: input.evidenceLevel,
      name: input.name,
      ruleId: input.ruleId,
      thresholdJson: input.thresholdJson as Prisma.InputJsonObject | undefined,
      version: input.version,
    },
    update: {
      category: input.category,
      description: input.description,
      enabled: input.enabled,
      evidenceLevel: input.evidenceLevel,
      name: input.name,
      thresholdJson: input.thresholdJson as Prisma.InputJsonObject | undefined,
      version: input.version,
    },
    where: { ruleId: input.ruleId },
  });
}
