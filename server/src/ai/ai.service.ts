import type { AIAnalysis, AIAnalysisStatus, AISeverity, ECGCase, ECGMeasurement, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";
import { createNotification } from "../utils/notifications";

const AI_VERSION = "ecg-insight-ai-v1.0.0";
const activeJobs = new Set<string>();

const supportedDiagnoses = [
  "Normal Sinus Rhythm",
  "Sinus Bradycardia",
  "Sinus Tachycardia",
  "Atrial Fibrillation",
  "Atrial Flutter",
  "PVC",
  "PAC",
  "First Degree AV Block",
  "Second Degree AV Block",
  "Third Degree AV Block",
  "ST Elevation",
  "ST Depression",
  "Ventricular Tachycardia",
  "Ventricular Fibrillation",
] as const;

type SupportedDiagnosis = (typeof supportedDiagnoses)[number];

interface AnalysisBlueprint {
  diagnosis: SupportedDiagnosis;
  rhythm: string;
  heartRate: number;
  severity: AISeverity;
  confidenceScore: number;
  interpretation: string;
  recommendations: string[];
  urgentActions: string[];
}

const diagnosisBlueprints: Record<SupportedDiagnosis, AnalysisBlueprint> = {
  "Normal Sinus Rhythm": {
    confidenceScore: 0.97,
    diagnosis: "Normal Sinus Rhythm",
    heartRate: 72,
    interpretation: "Regular sinus rhythm with normal rate and no acute abnormality detected.",
    recommendations: ["Continue routine monitoring.", "Correlate with clinical presentation."],
    rhythm: "Regular sinus",
    severity: "NORMAL",
    urgentActions: [],
  },
  "Sinus Bradycardia": {
    confidenceScore: 0.94,
    diagnosis: "Sinus Bradycardia",
    heartRate: 48,
    interpretation: "Sinus rhythm below 60 bpm. Assess symptoms and medication contributors.",
    recommendations: ["Review beta blocker or rate-limiting medication use.", "Monitor if symptomatic."],
    rhythm: "Regular sinus bradycardia",
    severity: "MILD",
    urgentActions: [],
  },
  "Sinus Tachycardia": {
    confidenceScore: 0.93,
    diagnosis: "Sinus Tachycardia",
    heartRate: 118,
    interpretation: "Sinus rhythm above 100 bpm. Evaluate physiologic or pathologic drivers.",
    recommendations: ["Assess fever, pain, dehydration, anemia, and thyroid status."],
    rhythm: "Regular sinus tachycardia",
    severity: "MILD",
    urgentActions: [],
  },
  "Atrial Fibrillation": {
    confidenceScore: 0.95,
    diagnosis: "Atrial Fibrillation",
    heartRate: 92,
    interpretation: "Irregularly irregular rhythm without consistent P waves.",
    recommendations: ["Assess stroke risk.", "Consider rate/rhythm control strategy."],
    rhythm: "Irregularly irregular",
    severity: "MODERATE",
    urgentActions: [],
  },
  "Atrial Flutter": {
    confidenceScore: 0.91,
    diagnosis: "Atrial Flutter",
    heartRate: 140,
    interpretation: "Flutter wave morphology with rapid atrial activity.",
    recommendations: ["Review anticoagulation need.", "Consider cardiology consultation."],
    rhythm: "Atrial flutter",
    severity: "MODERATE",
    urgentActions: [],
  },
  PVC: {
    confidenceScore: 0.9,
    diagnosis: "PVC",
    heartRate: 76,
    interpretation: "Premature ventricular complexes detected.",
    recommendations: ["Quantify PVC burden.", "Check electrolytes and structural heart disease risk."],
    rhythm: "Sinus rhythm with ventricular ectopy",
    severity: "MILD",
    urgentActions: [],
  },
  PAC: {
    confidenceScore: 0.89,
    diagnosis: "PAC",
    heartRate: 74,
    interpretation: "Premature atrial complexes detected.",
    recommendations: ["Monitor frequency.", "Evaluate triggers if symptomatic."],
    rhythm: "Sinus rhythm with atrial ectopy",
    severity: "MILD",
    urgentActions: [],
  },
  "First Degree AV Block": {
    confidenceScore: 0.94,
    diagnosis: "First Degree AV Block",
    heartRate: 65,
    interpretation: "PR interval prolongation consistent with first degree AV block.",
    recommendations: ["Review AV nodal blocking medications.", "Routine ECG follow-up."],
    rhythm: "Sinus rhythm with prolonged PR",
    severity: "MILD",
    urgentActions: [],
  },
  "Second Degree AV Block": {
    confidenceScore: 0.9,
    diagnosis: "Second Degree AV Block",
    heartRate: 52,
    interpretation: "Intermittent AV conduction block detected.",
    recommendations: ["Identify Mobitz type.", "Cardiology review recommended."],
    rhythm: "Intermittent AV block",
    severity: "SEVERE",
    urgentActions: ["Assess hemodynamic stability.", "Prepare pacing support if unstable."],
  },
  "Third Degree AV Block": {
    confidenceScore: 0.92,
    diagnosis: "Third Degree AV Block",
    heartRate: 34,
    interpretation: "AV dissociation consistent with complete heart block.",
    recommendations: ["Urgent cardiology/electrophysiology evaluation."],
    rhythm: "Complete AV block",
    severity: "CRITICAL",
    urgentActions: ["Immediate clinical assessment.", "Prepare temporary pacing."],
  },
  "ST Elevation": {
    confidenceScore: 0.96,
    diagnosis: "ST Elevation",
    heartRate: 96,
    interpretation: "ST elevation pattern concerning for acute myocardial injury/STEMI.",
    recommendations: ["Activate STEMI protocol if clinically consistent."],
    rhythm: "Sinus rhythm with ST elevation",
    severity: "CRITICAL",
    urgentActions: ["Immediate physician review.", "Activate cath lab/STEMI pathway."],
  },
  "ST Depression": {
    confidenceScore: 0.9,
    diagnosis: "ST Depression",
    heartRate: 88,
    interpretation: "ST depression pattern may suggest ischemia or strain.",
    recommendations: ["Correlate with symptoms and troponin.", "Repeat ECG if dynamic changes suspected."],
    rhythm: "Sinus rhythm with ST depression",
    severity: "SEVERE",
    urgentActions: ["Expedite clinician review if symptomatic."],
  },
  "Ventricular Tachycardia": {
    confidenceScore: 0.98,
    diagnosis: "Ventricular Tachycardia",
    heartRate: 182,
    interpretation: "Wide-complex tachycardia consistent with ventricular tachycardia.",
    recommendations: ["Immediate ACLS-guided management."],
    rhythm: "Ventricular tachycardia",
    severity: "CRITICAL",
    urgentActions: ["Immediate emergency response.", "Assess pulse and prepare cardioversion/defibrillation."],
  },
  "Ventricular Fibrillation": {
    confidenceScore: 0.99,
    diagnosis: "Ventricular Fibrillation",
    heartRate: 0,
    interpretation: "Chaotic ventricular activity consistent with ventricular fibrillation.",
    recommendations: ["Immediate resuscitation required."],
    rhythm: "Ventricular fibrillation",
    severity: "CRITICAL",
    urgentActions: ["Call code/emergency response.", "Immediate defibrillation and CPR."],
  },
};

function selectDiagnosis(ecgCase: ECGCase, measurement?: ECGMeasurement | null): SupportedDiagnosis {
  if (measurement) {
    if (measurement.stDeviation >= 1.5) return "ST Elevation";
    if (measurement.stDeviation <= -1) return "ST Depression";
    if (measurement.heartRate >= 160 && measurement.qrsDuration >= 120) return "Ventricular Tachycardia";
    if (measurement.heartRate < 40 && measurement.prInterval > 220) return "Third Degree AV Block";
    if (measurement.heartRate < 60) return "Sinus Bradycardia";
    if (measurement.heartRate > 100) return "Sinus Tachycardia";
    if (measurement.rhythmRegularity < 0.72) return "Atrial Fibrillation";
    if (measurement.prInterval > 200) return "First Degree AV Block";
    if (measurement.qrsDuration > 110) return "PVC";
  }

  const haystack = `${ecgCase.ecgType} ${ecgCase.finalDiagnosis ?? ""} ${ecgCase.clinicalNotes ?? ""}`.toLowerCase();
  if (haystack.includes("vf") || haystack.includes("ventricular fibrillation")) return "Ventricular Fibrillation";
  if (haystack.includes("vt") || haystack.includes("ventricular tachycardia")) return "Ventricular Tachycardia";
  if (haystack.includes("stemi") || haystack.includes("st elevation")) return "ST Elevation";
  if (haystack.includes("st depression")) return "ST Depression";
  if (haystack.includes("third") || haystack.includes("complete heart block")) return "Third Degree AV Block";
  if (haystack.includes("second")) return "Second Degree AV Block";
  if (haystack.includes("first")) return "First Degree AV Block";
  if (haystack.includes("flutter")) return "Atrial Flutter";
  if (haystack.includes("fib")) return "Atrial Fibrillation";
  if (haystack.includes("pvc")) return "PVC";
  if (haystack.includes("pac")) return "PAC";
  if (haystack.includes("brady")) return "Sinus Bradycardia";
  if (haystack.includes("tachy")) return "Sinus Tachycardia";
  if (ecgCase.priority === "CRITICAL") return "ST Elevation";
  return "Normal Sinus Rhythm";
}

function applyMeasurementOverrides(blueprint: AnalysisBlueprint, measurement?: ECGMeasurement | null): AnalysisBlueprint {
  if (!measurement) return blueprint;
  const severity: AISeverity =
    measurement.signalQuality === "FAIR" && blueprint.severity === "NORMAL" ? "MILD" : blueprint.severity;
  return {
    ...blueprint,
    confidenceScore: Math.max(0.65, blueprint.confidenceScore - (measurement.signalQuality === "FAIR" ? 0.08 : 0)),
    heartRate: measurement.heartRate,
    interpretation:
      `${blueprint.interpretation} Measurements: PR ${measurement.prInterval}ms, QRS ${measurement.qrsDuration}ms, QTc ${measurement.qtcInterval}ms, ST deviation ${measurement.stDeviation}mm.`,
    recommendations: [
      ...blueprint.recommendations,
      `Signal quality: ${measurement.signalQuality.toLowerCase()}. Rhythm regularity: ${Math.round(measurement.rhythmRegularity * 100)}%.`,
    ],
    severity,
  };
}

export function serializeAnalysis(analysis: AIAnalysis) {
  return {
    aiVersion: analysis.aiVersion,
    caseId: analysis.caseId,
    confidenceScore: analysis.confidenceScore,
    createdAt: analysis.createdAt.toISOString(),
    diagnosis: analysis.diagnosis,
    heartRate: analysis.heartRate,
    id: analysis.id,
    interpretation: analysis.interpretation,
    processingTime: analysis.processingTime,
    recommendations: analysis.recommendations,
    rhythm: analysis.rhythm,
    severity: analysis.severity.toLowerCase(),
    status: analysis.status.toLowerCase(),
    urgentActions: analysis.urgentActions,
  };
}

function isCritical(analysis: Pick<AIAnalysis, "diagnosis" | "severity">) {
  return (
    analysis.severity === "CRITICAL" ||
    ["ST Elevation", "Ventricular Tachycardia", "Ventricular Fibrillation", "Third Degree AV Block"].includes(
      analysis.diagnosis,
    )
  );
}

async function completeAnalysis(analysisId: string, actorId: string) {
  const started = Date.now();
  const queued = await prisma.aIAnalysis.findUnique({
    include: { case: true },
    where: { id: analysisId },
  });
  if (!queued || activeJobs.has(analysisId)) return;

  activeJobs.add(analysisId);
  try {
    await prisma.aIAnalysis.update({
      data: { status: "PROCESSING" },
      where: { id: analysisId },
    });
    await prisma.eCGCase.update({
      data: { aiStatus: "PROCESSING", status: "PROCESSING" },
      where: { id: queued.caseId },
    });

    const measurement = await prisma.eCGMeasurement.findFirst({
      orderBy: { createdAt: "desc" },
      where: { caseId: queued.caseId },
    });
    const blueprint = applyMeasurementOverrides(diagnosisBlueprints[selectDiagnosis(queued.case, measurement)], measurement);
    const analysis = await prisma.aIAnalysis.update({
      data: {
        aiVersion: AI_VERSION,
        confidenceScore: blueprint.confidenceScore,
        diagnosis: blueprint.diagnosis,
        heartRate: blueprint.heartRate,
        interpretation: blueprint.interpretation,
        processingTime: Date.now() - started,
        recommendations: blueprint.recommendations,
        rhythm: blueprint.rhythm,
        severity: blueprint.severity,
        status: "COMPLETED",
        urgentActions: blueprint.urgentActions,
      },
      where: { id: analysisId },
    });

    await prisma.eCGCase.update({
      data: {
        aiStatus: "COMPLETED",
        finalDiagnosis: analysis.diagnosis,
        priority: isCritical(analysis) ? "CRITICAL" : queued.case.priority,
        status: "REVIEWED",
      },
      where: { id: queued.caseId },
    });

    await prisma.auditLog.create({
      data: {
        action: "AI_ANALYSIS_COMPLETED",
        actorId,
        caseId: queued.caseId,
        message: `AI analysis completed: ${analysis.diagnosis}.`,
        metadata: { confidenceScore: analysis.confidenceScore, severity: analysis.severity },
        patientId: queued.case.patientId,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        caseId: queued.caseId,
        metadata: {
          analysisId: analysis.id,
          confidenceScore: analysis.confidenceScore,
          diagnosis: analysis.diagnosis,
          severity: analysis.severity,
        },
        patientId: queued.case.patientId,
        title: "AI analysis completed",
        type: "AI_ANALYSIS_COMPLETED",
      },
    });

    await createNotification({
      caseId: queued.caseId,
      message: `AI analysis completed for case ${queued.case.caseId}: ${analysis.diagnosis}.`,
      targetRole: "DOCTOR",
      title: "AI Analysis Complete",
      type: isCritical(analysis) ? "CRITICAL" : "SUCCESS",
    });

    if (isCritical(analysis)) {
      await createNotification({
        caseId: queued.caseId,
        message: `${analysis.diagnosis} detected. Immediate clinical review required.`,
        targetRole: "ADMIN",
        title: "Critical ECG Detected",
        type: "CRITICAL",
      });
    }
  } catch (error) {
    await prisma.aIAnalysis.update({
      data: { status: "FAILED", processingTime: Date.now() - started },
      where: { id: analysisId },
    });
    await prisma.eCGCase.update({
      data: { aiStatus: "FAILED" },
      where: { id: queued.caseId },
    });
    await prisma.auditLog.create({
      data: {
        action: "AI_ANALYSIS_FAILED",
        actorId,
        caseId: queued.caseId,
        message: "AI analysis failed.",
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
        patientId: queued.case.patientId,
      },
    });
  } finally {
    activeJobs.delete(analysisId);
  }
}

export async function queueAnalysis(caseId: string, actorId: string) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

  const analysis = await prisma.aIAnalysis.create({
    data: {
      aiVersion: AI_VERSION,
      caseId,
      confidenceScore: 0,
      diagnosis: "Pending",
      heartRate: 0,
      interpretation: "Queued for AI ECG analysis.",
      processingTime: 0,
      recommendations: [],
      rhythm: "Pending",
      severity: "NORMAL",
      status: "QUEUED",
      urgentActions: [],
    },
  });

  await prisma.eCGCase.update({
    data: { aiStatus: "QUEUED", status: "PROCESSING" },
    where: { id: caseId },
  });
  await prisma.auditLog.create({
    data: {
      action: "AI_ANALYSIS_QUEUED",
      actorId,
      caseId,
      message: `AI analysis queued for case ${ecgCase.caseId}.`,
      patientId: ecgCase.patientId,
    },
  });

  setTimeout(() => void completeAnalysis(analysis.id, actorId), 25);
  return analysis;
}

export async function getLatestAnalysis(caseId: string) {
  return prisma.aIAnalysis.findFirst({
    orderBy: { createdAt: "desc" },
    where: { caseId },
  });
}

export async function getStatistics() {
  const analyses = await prisma.aIAnalysis.findMany({
    where: { status: "COMPLETED" },
  });
  const total = analyses.length;
  const critical = analyses.filter((analysis) => analysis.severity === "CRITICAL").length;
  const abnormal = analyses.filter((analysis) => analysis.severity !== "NORMAL").length;
  const averageConfidence =
    total === 0 ? 0 : analyses.reduce((sum, analysis) => sum + analysis.confidenceScore, 0) / total;
  const diagnosisDistribution = analyses.reduce<Record<string, number>>((acc, analysis) => {
    acc[analysis.diagnosis] = (acc[analysis.diagnosis] ?? 0) + 1;
    return acc;
  }, {});

  return {
    abnormalPercentage: total === 0 ? 0 : Math.round((abnormal / total) * 100),
    averageConfidence: Math.round(averageConfidence * 100),
    criticalPercentage: total === 0 ? 0 : Math.round((critical / total) * 100),
    diagnosisDistribution,
    totalAnalyses: total,
  };
}

export function fromApiAnalysisStatus(status: "queued" | "processing" | "completed" | "failed"): AIAnalysisStatus {
  return status.toUpperCase() as AIAnalysisStatus;
}

export function fromApiSeverity(severity: "normal" | "mild" | "moderate" | "severe" | "critical"): AISeverity {
  return severity.toUpperCase() as AISeverity;
}
