import type {
  Employee,
  FitnessAssessment,
  OccupationalFitnessDecision,
  OccupationalRiskProfile,
  Patient,
  Prisma,
  RestrictionType,
  WorkRestriction,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";

export const restrictionMap = {
  no_confined_space: "NO_CONFINED_SPACE",
  no_driving: "NO_DRIVING",
  no_emergency_response: "NO_EMERGENCY_RESPONSE",
  no_heavy_equipment: "NO_HEAVY_EQUIPMENT",
  no_night_shifts: "NO_NIGHT_SHIFTS",
  no_offshore_duty: "NO_OFFSHORE_DUTY",
  no_work_at_height: "NO_WORK_AT_HEIGHT",
  sedentary_work_only: "SEDENTARY_WORK_ONLY",
} as const;

export const decisionMap = {
  fit_for_work: "FIT_FOR_WORK",
  fit_with_restrictions: "FIT_WITH_RESTRICTIONS",
  permanently_unfit: "PERMANENTLY_UNFIT",
  specialist_review_required: "SPECIALIST_REVIEW_REQUIRED",
  temporarily_unfit: "TEMPORARILY_UNFIT",
} as const;

export type RestrictionInput = keyof typeof restrictionMap;
export type DecisionInput = keyof typeof decisionMap;

function recommendationText(decision: OccupationalFitnessDecision) {
  return decision
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (value) => value.toUpperCase());
}

function defaultRestrictionDescription(type: RestrictionType) {
  const text: Record<RestrictionType, string> = {
    NO_CONFINED_SPACE: "No confined space work.",
    NO_DRIVING: "No commercial or safety-sensitive driving.",
    NO_EMERGENCY_RESPONSE: "No emergency response duties.",
    NO_HEAVY_EQUIPMENT: "No heavy equipment operation.",
    NO_NIGHT_SHIFTS: "No night shifts or extended rotating shifts.",
    NO_OFFSHORE_DUTY: "No offshore duty until medically cleared.",
    NO_WORK_AT_HEIGHT: "No work at height.",
    SEDENTARY_WORK_ONLY: "Sedentary work only.",
  };
  return text[type];
}

function uniqueRestrictions(restrictions: RestrictionType[]) {
  return Array.from(new Set(restrictions));
}

export function calculateRiskScore(profile: {
  diabetes?: boolean;
  dyslipidemia?: boolean;
  familyHistory?: boolean;
  hypertension?: boolean;
  obesity?: boolean;
  previousMI?: boolean;
  previousStroke?: boolean;
  smoking?: boolean;
}) {
  return [
    profile.smoking,
    profile.diabetes,
    profile.hypertension,
    profile.dyslipidemia,
    profile.obesity,
    profile.familyHistory,
    profile.previousMI,
    profile.previousStroke,
  ].reduce((score, value, index) => score + (value ? (index >= 6 ? 3 : 1) : 0), 0);
}

export async function getAssessmentInputs(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    include: {
      occupationalRiskProfile: true,
      patient: {
        include: {
          cardiacHistory: true,
          cardiacImaging: true,
          cases: {
            include: {
              analyses: { orderBy: { createdAt: "desc" }, take: 1 },
              measurements: { orderBy: { createdAt: "desc" }, take: 1 },
            },
            orderBy: { uploadDate: "desc" },
          },
          medicationHistories: { where: { active: true } },
        },
      },
    },
    where: { id: employeeId },
  });
  if (!employee) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
  return employee;
}

export function recommendFitness(input: Awaited<ReturnType<typeof getAssessmentInputs>>) {
  const patient = input.patient;
  const profile = input.occupationalRiskProfile;
  const latestCase = patient?.cases[0];
  const latestAnalysis = latestCase?.analyses[0];
  const latestMeasurement = latestCase?.measurements[0];
  const cardiacHistory = patient?.cardiacHistory;
  const medications = patient?.medicationHistories ?? [];
  const hasCriticalFinding = latestAnalysis?.severity === "CRITICAL" || latestCase?.priority === "CRITICAL";
  const hasSevereFinding = latestAnalysis?.severity === "SEVERE";
  const hasAbnormalStressOrEcho = patient?.cardiacImaging.some((study) =>
    /abnormal|ischemia|reduced|severe|positive/i.test(`${study.findings ?? ""} ${study.notes ?? ""}`),
  );
  const highRiskHistory = Boolean(
    cardiacHistory?.myocardialInfarctionHistory ||
      cardiacHistory?.previousStroke ||
      cardiacHistory?.heartFailure ||
      cardiacHistory?.coronaryArteryDisease,
  );
  const riskScore = calculateRiskScore({
    diabetes: profile?.diabetes ?? cardiacHistory?.diabetesMellitus,
    dyslipidemia: profile?.dyslipidemia ?? cardiacHistory?.dyslipidemia,
    familyHistory: profile?.familyHistory ?? cardiacHistory?.familyHistoryHeartDisease,
    hypertension: profile?.hypertension ?? cardiacHistory?.hypertension,
    obesity: profile?.obesity ?? cardiacHistory?.obesity,
    previousMI: profile?.previousMI ?? cardiacHistory?.myocardialInfarctionHistory,
    previousStroke: profile?.previousStroke ?? cardiacHistory?.previousStroke,
    smoking: profile?.smoking ?? cardiacHistory?.smokingStatus === "CURRENT",
  });
  const safetySensitive =
    input.criticalJob ||
    input.drivingDuty ||
    input.workAtHeight ||
    input.confinedSpace ||
    input.heavyEquipmentOperator ||
    input.offshoreWorker ||
    input.firefighter ||
    input.emergencyResponder;

  const restrictions: RestrictionType[] = [];
  if (input.workAtHeight) restrictions.push("NO_WORK_AT_HEIGHT");
  if (input.drivingDuty) restrictions.push("NO_DRIVING");
  if (input.confinedSpace) restrictions.push("NO_CONFINED_SPACE");
  if (input.shiftWorker) restrictions.push("NO_NIGHT_SHIFTS");
  if (input.offshoreWorker) restrictions.push("NO_OFFSHORE_DUTY");
  if (input.heavyEquipmentOperator) restrictions.push("NO_HEAVY_EQUIPMENT");
  if (input.firefighter || input.emergencyResponder) restrictions.push("NO_EMERGENCY_RESPONSE");

  let decision: OccupationalFitnessDecision = "FIT_FOR_WORK";
  if (hasCriticalFinding || (highRiskHistory && safetySensitive)) {
    decision = "TEMPORARILY_UNFIT";
    restrictions.push("SEDENTARY_WORK_ONLY");
  } else if (hasSevereFinding || hasAbnormalStressOrEcho || (riskScore >= 5 && safetySensitive)) {
    decision = "SPECIALIST_REVIEW_REQUIRED";
    restrictions.push("SEDENTARY_WORK_ONLY");
  } else if (riskScore >= 3 || restrictions.length > 0 || latestMeasurement?.qtcInterval && latestMeasurement.qtcInterval > 480) {
    decision = "FIT_WITH_RESTRICTIONS";
  }
  if (cardiacHistory?.heartFailure && cardiacHistory?.myocardialInfarctionHistory && safetySensitive) {
    decision = "PERMANENTLY_UNFIT";
    restrictions.push("SEDENTARY_WORK_ONLY");
  }

  const outputRestrictions = uniqueRestrictions(restrictions);
  const reasons = [
    latestAnalysis ? `Latest AI ECG finding: ${latestAnalysis.diagnosis} (${latestAnalysis.severity}).` : "No completed AI ECG finding available.",
    latestMeasurement ? `Latest ECG measurements: HR ${latestMeasurement.heartRate}, QTc ${latestMeasurement.qtcInterval}ms.` : "No ECG measurements available.",
    highRiskHistory ? "High-risk cardiac history is present." : "No high-risk cardiac history flagged.",
    `Occupational risk score: ${riskScore}.`,
    safetySensitive ? "Safety-sensitive work exposure is present." : "No safety-sensitive exposure flagged.",
    medications.length ? `Active cardiac medications: ${medications.map((medication) => medication.drugName).join(", ")}.` : "No active medications recorded.",
  ];

  return {
    decision,
    inputSummary: {
      cardiacHistory,
      employeeExposure: {
        confinedSpace: input.confinedSpace,
        criticalJob: input.criticalJob,
        drivingDuty: input.drivingDuty,
        emergencyResponder: input.emergencyResponder,
        firefighter: input.firefighter,
        heavyEquipmentOperator: input.heavyEquipmentOperator,
        offshoreWorker: input.offshoreWorker,
        shiftWorker: input.shiftWorker,
        workAtHeight: input.workAtHeight,
        workCategory: input.workCategory,
      },
      latestAnalysis,
      latestMeasurement,
      medications,
      occupationalRiskProfile: profile,
      riskScore,
    },
    occupationalReportSection: {
      finalFitnessDecision: recommendationText(decision),
      physicianJustification: reasons.join(" "),
      restrictions: outputRestrictions.map(defaultRestrictionDescription),
      reviewDate: decision === "FIT_FOR_WORK" ? null : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    reasons,
    restrictions: outputRestrictions,
    riskScore,
  };
}

export async function createPatientTimelineEvent(input: {
  metadata?: Record<string, unknown>;
  patientId?: string | null;
  title: string;
  type: "FITNESS_ASSESSMENT_COMPLETED" | "RETURN_TO_WORK_DECISION_ADDED" | "WORK_RESTRICTION_ADDED";
}) {
  if (!input.patientId) return null;
  return prisma.timelineEvent.create({
    data: {
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
      patientId: input.patientId,
      title: input.title,
      type: input.type,
    },
  });
}

export function serializeAssessment(assessment: FitnessAssessment & { restrictions?: WorkRestriction[] }) {
  return {
    assessedById: assessment.assessedById,
    createdAt: assessment.createdAt.toISOString(),
    employeeId: assessment.employeeId,
    finalDecision: assessment.finalDecision.toLowerCase(),
    id: assessment.id,
    inputSummary: assessment.inputSummary,
    occupationalReportSection: assessment.occupationalReportSection,
    patientId: assessment.patientId ?? undefined,
    physicianJustification: assessment.physicianJustification,
    recommendation: assessment.recommendation.toLowerCase(),
    restrictions: assessment.restrictions?.map((restriction) => ({
      active: restriction.active,
      description: restriction.description,
      id: restriction.id,
      type: restriction.type.toLowerCase(),
    })),
    reviewDate: assessment.reviewDate?.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
  };
}

export function serializeRiskProfile(profile: OccupationalRiskProfile) {
  return {
    createdAt: profile.createdAt.toISOString(),
    diabetes: profile.diabetes,
    dyslipidemia: profile.dyslipidemia,
    employeeId: profile.employeeId,
    familyHistory: profile.familyHistory,
    highRisk: profile.highRisk,
    hypertension: profile.hypertension,
    id: profile.id,
    obesity: profile.obesity,
    occupationalExposure: profile.occupationalExposure,
    previousMI: profile.previousMI,
    previousStroke: profile.previousStroke,
    riskScore: profile.riskScore,
    smoking: profile.smoking,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function patientIdForEmployee(employee: Employee & { patient?: Patient | null }) {
  return employee.patient?.id ?? null;
}
