import type {
  AISeverity,
  LongitudinalChangeType,
  LongitudinalComparisonScope,
  LongitudinalFindingCategory,
  OccupationalSurveillanceType,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";

type CaseWithSignals = Prisma.ECGCaseGetPayload<{
  include: {
    analyses: true;
    measurements: true;
  };
}>;

type FindingDraft = {
  category: LongitudinalFindingCategory;
  changeType: LongitudinalChangeType;
  evidence: Prisma.InputJsonObject;
  severity: AISeverity;
  statement: string;
  title: string;
};

const clinicalDisclaimer =
  "Longitudinal ECG intelligence supports clinician review and must be interpreted with the original ECG tracings, clinical symptoms, medications, and examination findings.";

function latestMeasurement(ecgCase: CaseWithSignals) {
  return ecgCase.measurements[0];
}

function latestAnalysis(ecgCase: CaseWithSignals) {
  return ecgCase.analyses[0];
}

function text(ecgCase: CaseWithSignals) {
  const analysis = latestAnalysis(ecgCase);
  return `${analysis?.diagnosis ?? ""} ${analysis?.interpretation ?? ""} ${ecgCase.aiDiagnosis ?? ""} ${ecgCase.doctorDiagnosis ?? ""} ${ecgCase.finalDiagnosis ?? ""} ${ecgCase.rhythm ?? ""}`.toLowerCase();
}

function changeFromDelta(delta: number, threshold: number): LongitudinalChangeType {
  if (delta >= threshold) return "WORSENING";
  if (delta <= -threshold) return "IMPROVEMENT";
  return "NO_SIGNIFICANT_CHANGE";
}

function severityForChange(changeType: LongitudinalChangeType): AISeverity {
  if (changeType === "WORSENING" || changeType === "NEW_ABNORMALITY") return "MODERATE";
  if (changeType === "PERSISTENT_ABNORMALITY") return "SEVERE";
  return "MILD";
}

function containsAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

async function resolveCurrentCase(caseId: string) {
  const ecgCase = await prisma.eCGCase.findFirst({
    include: {
      analyses: { orderBy: { createdAt: "desc" } },
      measurements: { orderBy: { createdAt: "desc" } },
    },
    where: { OR: [{ id: caseId }, { caseId }, { caseNumber: caseId }] },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return ecgCase;
}

async function patientCases(patientId: string) {
  return prisma.eCGCase.findMany({
    include: {
      analyses: { orderBy: { createdAt: "desc" } },
      measurements: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { acquisitionDate: "desc" },
    take: 25,
    where: { patientId },
  });
}

function compareMetric(
  category: LongitudinalFindingCategory,
  label: string,
  unit: string,
  currentValue: number | null | undefined,
  previousValue: number | null | undefined,
  threshold: number,
) {
  if (currentValue === null || currentValue === undefined || previousValue === null || previousValue === undefined) return null;
  const delta = currentValue - previousValue;
  const changeType = changeFromDelta(delta, threshold);
  return {
    category,
    changeType,
    evidence: { currentValue, delta, previousValue, threshold, unit },
    severity: severityForChange(changeType),
    statement:
      changeType === "NO_SIGNIFICANT_CHANGE"
        ? `${label} shows no significant interval change (${previousValue}${unit} to ${currentValue}${unit}).`
        : `${label} ${changeType === "WORSENING" ? "increased" : "improved"} by ${Math.abs(delta)}${unit} (${previousValue}${unit} to ${currentValue}${unit}).`,
    title: `${label} trend`,
  } satisfies FindingDraft;
}

function rhythmFinding(current: CaseWithSignals, previous: CaseWithSignals) {
  const currentText = text(current);
  const previousText = text(previous);
  const currentRhythm = latestAnalysis(current)?.rhythm ?? current.rhythm ?? current.ecgType;
  const previousRhythm = latestAnalysis(previous)?.rhythm ?? previous.rhythm ?? previous.ecgType;
  const afNow = containsAny(currentText, ["atrial fibrillation", " af "]);
  const afBefore = containsAny(previousText, ["atrial fibrillation", " af "]);
  const arrhythmiaNow = containsAny(currentText, ["arrhythmia", "tachycardia", "ectopy", "fibrillation", "flutter"]);
  const arrhythmiaBefore = containsAny(previousText, ["arrhythmia", "tachycardia", "ectopy", "fibrillation", "flutter"]);
  let changeType: LongitudinalChangeType = "NO_SIGNIFICANT_CHANGE";
  if (arrhythmiaNow && !arrhythmiaBefore) changeType = "NEW_ABNORMALITY";
  else if (!arrhythmiaNow && arrhythmiaBefore) changeType = "RESOLVED_ABNORMALITY";
  else if (arrhythmiaNow && arrhythmiaBefore) changeType = afNow && afBefore ? "PERSISTENT_ABNORMALITY" : "PERSISTENT_ABNORMALITY";
  return {
    category: afNow && afBefore ? "PERSISTENT_AF" : "RHYTHM_TREND",
    changeType,
    evidence: { currentRhythm, previousRhythm },
    severity: changeType === "NEW_ABNORMALITY" ? "SEVERE" : changeType === "PERSISTENT_ABNORMALITY" ? "MODERATE" : "MILD",
    statement:
      changeType === "NO_SIGNIFICANT_CHANGE"
        ? `Rhythm remains stable (${currentRhythm}).`
        : changeType === "NEW_ABNORMALITY"
          ? `New rhythm abnormality detected compared to previous ECG (${currentRhythm}).`
          : changeType === "RESOLVED_ABNORMALITY"
            ? `Previously noted rhythm abnormality appears resolved (${currentRhythm}).`
            : `Rhythm abnormality persists across serial ECGs (${currentRhythm}).`,
    title: afNow && afBefore ? "Persistent atrial fibrillation surveillance" : "Rhythm trend",
  } satisfies FindingDraft;
}

function diseaseProgressionFindings(current: CaseWithSignals, previousCases: CaseWithSignals[]) {
  const currentText = text(current);
  const historicalText = previousCases.map(text).join(" ");
  const findings: FindingDraft[] = [];
  if (containsAny(currentText, ["av block", "complete heart block"]) && containsAny(historicalText, ["first degree", "second degree", "av block"])) {
    findings.push({
      category: "AV_BLOCK_PROGRESSION",
      changeType: "WORSENING",
      evidence: { current: currentText.slice(0, 240), historicalMatches: true },
      severity: "SEVERE",
      statement: "Possible progressive AV block compared with previous ECG interpretations.",
      title: "Progressive AV block signal",
    });
  }
  if (containsAny(currentText, ["ischemia", "st depression", "stemi"]) && containsAny(historicalText, ["ischemia", "st depression"])) {
    findings.push({
      category: "ISCHEMIA_PROGRESSION",
      changeType: currentText.includes("stemi") ? "WORSENING" : "PERSISTENT_ABNORMALITY",
      evidence: { current: currentText.slice(0, 240), historicalMatches: true },
      severity: currentText.includes("stemi") ? "CRITICAL" : "SEVERE",
      statement: currentText.includes("stemi") ? "Ischemic pattern appears worsened with STEMI language." : "Ischemia suspicion persists across serial ECGs.",
      title: "Ischemia progression signal",
    });
  }
  if (containsAny(currentText, ["bundle branch", "wide qrs", "conduction"]) && containsAny(historicalText, ["bundle branch", "wide qrs", "conduction"])) {
    findings.push({
      category: "CONDUCTION_DISEASE",
      changeType: "PERSISTENT_ABNORMALITY",
      evidence: { current: currentText.slice(0, 240), historicalMatches: true },
      severity: "MODERATE",
      statement: "Conduction disease appears persistent across historical ECG interpretations.",
      title: "Persistent conduction disease",
    });
  }
  if (containsAny(currentText, ["tachycardia", "arrhythmia", "ectopy"]) && containsAny(historicalText, ["tachycardia", "arrhythmia", "ectopy"])) {
    findings.push({
      category: "RECURRENT_ARRHYTHMIA",
      changeType: "PERSISTENT_ABNORMALITY",
      evidence: { current: currentText.slice(0, 240), historicalMatches: true },
      severity: "MODERATE",
      statement: "Recurrent arrhythmia pattern detected across historical ECGs.",
      title: "Recurrent arrhythmia",
    });
  }
  return findings;
}

function overallChange(findings: FindingDraft[]): LongitudinalChangeType {
  if (findings.some((finding) => finding.changeType === "WORSENING" || finding.changeType === "NEW_ABNORMALITY")) return "WORSENING";
  if (findings.some((finding) => finding.changeType === "RESOLVED_ABNORMALITY" || finding.changeType === "IMPROVEMENT")) return "IMPROVEMENT";
  if (findings.some((finding) => finding.changeType === "PERSISTENT_ABNORMALITY")) return "PERSISTENT_ABNORMALITY";
  return "NO_SIGNIFICANT_CHANGE";
}

function trendMetrics(cases: CaseWithSignals[]) {
  return cases
    .map((ecgCase) => {
      const measurement = latestMeasurement(ecgCase);
      const analysis = latestAnalysis(ecgCase);
      return {
        axis: measurement?.electricalAxis ?? null,
        caseId: ecgCase.id,
        date: ecgCase.acquisitionDate.toISOString(),
        heartRate: measurement?.heartRate ?? ecgCase.heartRate ?? null,
        prInterval: measurement?.prInterval ?? ecgCase.prInterval ?? null,
        qrsDuration: measurement?.qrsDuration ?? ecgCase.qrsDuration ?? null,
        qtInterval: measurement?.qtInterval ?? ecgCase.qtInterval ?? null,
        qtcInterval: measurement?.qtcInterval ?? ecgCase.qtcInterval ?? null,
        rhythm: analysis?.rhythm ?? ecgCase.rhythm ?? ecgCase.ecgType,
        risk: ecgCase.priority,
      };
    })
    .reverse();
}

function abnormalityTimeline(cases: CaseWithSignals[]) {
  return cases
    .map((ecgCase) => ({
      abnormalities: [latestAnalysis(ecgCase)?.diagnosis, ecgCase.aiDiagnosis, ecgCase.doctorDiagnosis, ecgCase.finalDiagnosis].filter(Boolean),
      caseId: ecgCase.id,
      date: ecgCase.acquisitionDate.toISOString(),
      severity: latestAnalysis(ecgCase)?.severity ?? ecgCase.severity,
    }))
    .reverse();
}

function riskProgression(cases: CaseWithSignals[]) {
  const priorityScore: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return cases
    .map((ecgCase) => ({
      caseId: ecgCase.id,
      date: ecgCase.acquisitionDate.toISOString(),
      priority: ecgCase.priority,
      score: priorityScore[ecgCase.priority] ?? 1,
      severity: latestAnalysis(ecgCase)?.severity ?? ecgCase.severity,
    }))
    .reverse();
}

function statementFor(changeType: LongitudinalChangeType, findings: FindingDraft[]) {
  if (changeType === "NO_SIGNIFICANT_CHANGE") return "No significant interval change.";
  const first = findings.find((finding) => finding.changeType === "WORSENING" || finding.changeType === "NEW_ABNORMALITY") ?? findings[0];
  if (first.category === "QT_TREND" && first.changeType === "WORSENING") return "QT interval progressively prolonged.";
  if (first.changeType === "NEW_ABNORMALITY") return `${first.title}: new abnormality compared to previous ECG.`;
  if (changeType === "IMPROVEMENT") return "Interval ECG features show improvement compared to prior tracing.";
  return first.statement;
}

export async function compareLongitudinalECG(input: {
  caseId: string;
  evaluatedById: string;
  scope: LongitudinalComparisonScope;
  baselineCaseId?: string;
  surveillanceType?: OccupationalSurveillanceType;
}) {
  const current = await resolveCurrentCase(input.caseId);
  const allCases = await patientCases(current.patientId);
  const previousCases = allCases.filter((ecgCase) => ecgCase.id !== current.id);
  const baseline = input.baselineCaseId
    ? allCases.find((ecgCase) => ecgCase.id === input.baselineCaseId || ecgCase.caseId === input.baselineCaseId || ecgCase.caseNumber === input.baselineCaseId)
    : input.scope === "BASELINE"
      ? previousCases[previousCases.length - 1]
      : previousCases[0];
  if (!baseline && previousCases.length === 0) {
    throw new AppError(409, "At least one previous ECG is required for longitudinal comparison.", "LONGITUDINAL_HISTORY_REQUIRED");
  }
  const comparator = baseline ?? previousCases[0];
  const currentMeasurement = latestMeasurement(current);
  const previousMeasurement = latestMeasurement(comparator);
  const findings = [
    compareMetric("HEART_RATE_TREND", "Heart rate", " bpm", currentMeasurement?.heartRate ?? current.heartRate, previousMeasurement?.heartRate ?? comparator.heartRate, 20),
    compareMetric("QT_TREND", "QTc interval", " ms", currentMeasurement?.qtcInterval ?? current.qtcInterval, previousMeasurement?.qtcInterval ?? comparator.qtcInterval, 30),
    compareMetric("PR_TREND", "PR interval", " ms", currentMeasurement?.prInterval ?? current.prInterval, previousMeasurement?.prInterval ?? comparator.prInterval, 40),
    compareMetric("QRS_TREND", "QRS duration", " ms", currentMeasurement?.qrsDuration ?? current.qrsDuration, previousMeasurement?.qrsDuration ?? comparator.qrsDuration, 20),
    compareMetric("AXIS_TREND", "Electrical axis", "°", currentMeasurement?.electricalAxis, previousMeasurement?.electricalAxis, 30),
    rhythmFinding(current, comparator),
    ...diseaseProgressionFindings(current, previousCases),
  ].filter((finding): finding is FindingDraft => Boolean(finding));

  const occupationalSummary = input.surveillanceType
    ? {
        recommendation:
          overallChange(findings) === "WORSENING"
            ? "Escalate occupational clearance review before safety-sensitive duty."
            : "Continue scheduled workforce surveillance with physician sign-off.",
        surveillanceType: input.surveillanceType,
      }
    : undefined;
  if (input.surveillanceType) {
    findings.push({
      category: "OCCUPATIONAL_SURVEILLANCE",
      changeType: overallChange(findings),
      evidence: { surveillanceType: input.surveillanceType },
      severity: overallChange(findings) === "WORSENING" ? "MODERATE" : "MILD",
      statement: occupationalSummary!.recommendation,
      title: "Occupational surveillance summary",
    });
  }

  const changeType = overallChange(findings);
  const metricsCases = [current, ...previousCases].slice(0, input.scope === "HISTORICAL" ? 10 : 5);
  const comparison = await prisma.longitudinalECGComparison.create({
    data: {
      abnormalityTimeline: abnormalityTimeline(metricsCases) as Prisma.InputJsonArray,
      aiTrendStatement: statementFor(changeType, findings),
      baselineCaseId: comparator.id,
      clinicalDisclaimer,
      comparedCaseIds: previousCases.map((ecgCase) => ecgCase.id),
      currentCaseId: current.id,
      evaluatedById: input.evaluatedById,
      findings: {
        create: findings.map((finding) => ({
          category: finding.category,
          changeType: finding.changeType,
          evidence: finding.evidence,
          severity: finding.severity,
          statement: finding.statement,
          title: finding.title,
        })),
      },
      occupationalSummary: occupationalSummary as Prisma.InputJsonObject | undefined,
      overallChange: changeType,
      patientId: current.patientId,
      riskProgression: riskProgression(metricsCases) as Prisma.InputJsonArray,
      scope: input.scope,
      surveillanceType: input.surveillanceType,
      trendMetrics: trendMetrics(metricsCases) as Prisma.InputJsonArray,
    },
    include: { findings: { orderBy: { createdAt: "asc" } } },
  });

  await prisma.auditLog.create({
    data: {
      action: "LONGITUDINAL_ECG_COMPARISON_COMPLETED",
      actorId: input.evaluatedById,
      caseId: current.id,
      entityId: comparison.id,
      entityType: "LongitudinalECGComparison",
      message: `Longitudinal ECG comparison completed: ${comparison.overallChange}.`,
      metadata: { comparedCaseIds: comparison.comparedCaseIds, scope: comparison.scope, surveillanceType: comparison.surveillanceType },
      patientId: current.patientId,
    },
  });
  await prisma.timelineEvent.create({
    data: {
      caseId: current.id,
      metadata: { comparisonId: comparison.id, overallChange: comparison.overallChange, scope: comparison.scope },
      patientId: current.patientId,
      title: `Longitudinal ECG comparison: ${comparison.overallChange.replace(/_/g, " ")}`,
      type: "ECG_COMPARISON_COMPLETED",
    },
  });
  return comparison;
}

export async function listLongitudinalComparisons(caseId: string) {
  return prisma.longitudinalECGComparison.findMany({
    include: { findings: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    where: { currentCaseId: caseId },
  });
}

export async function patientLongitudinalDashboard(patientId: string) {
  const cases = await patientCases(patientId);
  const comparisons = await prisma.longitudinalECGComparison.findMany({
    include: { findings: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    where: { patientId },
  });
  return {
    abnormalityTimeline: abnormalityTimeline(cases),
    comparisons,
    riskProgression: riskProgression(cases),
    trendMetrics: trendMetrics(cases),
  };
}
