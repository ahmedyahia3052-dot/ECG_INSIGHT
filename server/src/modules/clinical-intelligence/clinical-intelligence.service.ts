import { Prisma, type AISeverity, type ClinicalDecisionAlertType, type RiskAssessmentType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { createNotification } from "../../utils/notifications";

const references = [
  "ACC/AHA clinical decision support principles",
  "ESC cardiology guideline framework",
  "Occupational cardiology fitness policy",
];

const patientContextInclude = Prisma.validator<Prisma.PatientInclude>()({
  cardiacHistory: true,
  cardiacImaging: { orderBy: { createdAt: "desc" }, take: 5 },
  cardiacProcedures: { orderBy: { procedureDate: "desc" }, take: 5 },
  cases: {
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      measurements: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { uploadDate: "desc" },
    take: 5,
  },
  fitnessAssessments: { orderBy: { createdAt: "desc" }, take: 3 },
  medicationHistories: { orderBy: { startDate: "desc" }, take: 10 },
  procedureHistories: { orderBy: { procedureDate: "desc" }, take: 5 },
});

type PatientClinicalContext = Prisma.PatientGetPayload<{ include: typeof patientContextInclude }>;

function riskLevel(score: number): AISeverity {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "SEVERE";
  if (score >= 40) return "MODERATE";
  if (score >= 20) return "MILD";
  return "NORMAL";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

async function patientContext(patientId: string): Promise<PatientClinicalContext> {
  const patient = await prisma.patient.findUnique({
    include: patientContextInclude,
    where: { id: patientId },
  });
  if (!patient) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
  return patient;
}

function patientName(patient: PatientClinicalContext) {
  return `${patient.firstName} ${patient.lastName}`;
}

export class ClinicalAssistantService {
  async answer(patientId: string, userId: string, question: string) {
    const patient = await patientContext(patientId);
    const latestCase = patient.cases[0];
    const latestMeasurement = latestCase?.measurements[0];
    const latestAnalysis = latestCase?.analyses[0];
    const latestFitness = patient.fitnessAssessments[0];
    const lower = question.toLowerCase();
    const facts = [
      `${patientName(patient)} is ${patient.gender.toLowerCase()} with MRN ${patient.medicalRecordNumber}.`,
      patient.cardiacHistory
        ? `Cardiac history includes hypertension=${patient.cardiacHistory.hypertension}, CAD=${patient.cardiacHistory.coronaryArteryDisease}, HF=${patient.cardiacHistory.heartFailure}, arrhythmia=${patient.cardiacHistory.arrhythmiaHistory}.`
        : "No structured cardiac history is recorded.",
      latestMeasurement
        ? `Latest ECG measurements: HR ${latestMeasurement.heartRate}, PR ${latestMeasurement.prInterval}ms, QRS ${latestMeasurement.qrsDuration}ms, QTc ${latestMeasurement.qtcInterval}ms.`
        : "No ECG measurement is available.",
      latestAnalysis ? `Latest AI ECG interpretation: ${latestAnalysis.diagnosis} (${latestAnalysis.severity}).` : "No completed AI ECG interpretation is available.",
      patient.medicationHistories.length
        ? `Medications: ${patient.medicationHistories.map((medication) => medication.drugName).join(", ")}.`
        : "No medication history is recorded.",
      patient.cardiacProcedures.length
        ? `Procedures: ${patient.cardiacProcedures.map((procedure) => procedure.procedureType).join(", ")}.`
        : "No cardiac procedure history is recorded.",
      latestFitness ? `Latest occupational decision: ${latestFitness.finalDecision}.` : "No occupational fitness assessment is recorded.",
    ];
    const answer = lower.includes("fitness")
      ? `${facts[6]} Reasoning: fitness depends on ECG severity, cardiac history, and safety-sensitive exposure. Evidence: ${facts.slice(1, 4).join(" ")}`
      : lower.includes("medication")
      ? facts[4]
      : lower.includes("procedure")
      ? facts[5]
      : lower.includes("compare")
      ? `Serial ECG comparison should review rate, rhythm, ST deviation, and QTc changes. Current evidence: ${facts[2]} ${facts[3]}`
      : lower.includes("history")
      ? facts[1]
      : facts.join(" ");

    const conversation = await prisma.clinicalConversation.create({
      data: {
        answer,
        confidenceScore: latestMeasurement || latestAnalysis ? 0.86 : 0.68,
        patientId,
        question,
        userId,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "CLINICAL_CONVERSATION_CREATED",
        actorId: userId,
        message: "AI clinical assistant conversation created.",
        metadata: { conversationId: conversation.id, references },
        patientId,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        metadata: { conversationId: conversation.id },
        patientId,
        title: "AI clinical assistant answered a question",
        type: "CLINICAL_CONVERSATION_CREATED",
      },
    });
    return conversation;
  }
}

export async function calculatePatientTrends(patientId: string) {
  const patient = await patientContext(patientId);
  const measurements = patient.cases.flatMap((ecgCase) =>
    ecgCase.measurements.map((measurement) => ({ measuredAt: ecgCase.uploadDate, measurement })),
  );
  const trends = [
    ...measurements.map(({ measuredAt, measurement }) => ({
      evidence: { caseMeasurementId: measurement.id },
      measuredAt,
      metric: "HEART_RATE" as const,
      source: "ECGMeasurement",
      unit: "bpm",
      value: measurement.heartRate,
    })),
    ...measurements.map(({ measuredAt, measurement }) => ({
      evidence: { caseMeasurementId: measurement.id },
      measuredAt,
      metric: "QTC" as const,
      source: "ECGMeasurement",
      unit: "ms",
      value: measurement.qtcInterval,
    })),
    ...patient.cardiacImaging
      .map((study) => {
        const ef = Number(`${study.findings ?? ""} ${study.notes ?? ""}`.match(/(?:ef|ejection fraction)[:\s-]*(\d{2})/i)?.[1]);
        return Number.isFinite(ef)
          ? {
              evidence: { imagingId: study.id },
              measuredAt: study.performedAt ?? study.createdAt,
              metric: "EF" as const,
              source: "CardiacImaging",
              unit: "%",
              value: ef,
            }
          : null;
      })
      .filter((trend): trend is NonNullable<typeof trend> => Boolean(trend)),
  ];
  for (const trend of trends.slice(0, 30)) {
    await prisma.patientTrend.create({
      data: {
        evidence: trend.evidence as Prisma.InputJsonObject,
        measuredAt: trend.measuredAt,
        metric: trend.metric,
        patientId,
        source: trend.source,
        unit: trend.unit,
        value: trend.value,
      },
    });
  }
  return trends;
}

export async function calculateRiskAssessments(patientId: string, userId: string) {
  const patient = await patientContext(patientId);
  const latestMeasurement = patient.cases[0]?.measurements[0];
  const latestAnalysis = patient.cases[0]?.analyses[0];
  const history = patient.cardiacHistory;
  const base =
    (history?.heartFailure ? 22 : 0) +
    (history?.coronaryArteryDisease ? 18 : 0) +
    (history?.arrhythmiaHistory ? 16 : 0) +
    (history?.hypertension ? 10 : 0) +
    (history?.diabetesMellitus ? 10 : 0) +
    (latestMeasurement && latestMeasurement.qtcInterval > 480 ? 16 : 0) +
    (latestAnalysis?.severity === "CRITICAL" ? 25 : 0);
  const riskInputs: Array<{ riskType: RiskAssessmentType; score: number; reasoning: string }> = [
    { reasoning: "Combines heart failure, ischemic history, QTc, and critical ECG evidence.", riskType: "SUDDEN_CARDIAC_DEATH", score: base + 8 },
    { reasoning: "Combines CAD, diabetes, hypertension, and recent ECG severity.", riskType: "MAJOR_CARDIAC_EVENT", score: base + 12 },
    { reasoning: "Combines occupational decision history with arrhythmia and ECG severity.", riskType: "OCCUPATIONAL_UNFITNESS", score: base + (patient.fitnessAssessments[0]?.finalDecision === "TEMPORARILY_UNFIT" ? 25 : 0) },
    { reasoning: "Combines arrhythmia history, QTc, heart rate, and AI ECG findings.", riskType: "ARRHYTHMIA", score: base + (latestMeasurement && latestMeasurement.heartRate > 120 ? 16 : 0) },
  ];
  const evidence = {
    cardiacHistory: history,
    latestAnalysis,
    latestMeasurement,
    references,
  } as Prisma.InputJsonObject;
  const assessments = await Promise.all(
    riskInputs.map((input) =>
      prisma.riskAssessment.create({
        data: {
          confidenceScore: latestMeasurement || latestAnalysis ? 0.84 : 0.66,
          evidence,
          patientId,
          reasoning: input.reasoning,
          references,
          riskLevel: riskLevel(clampScore(input.score)),
          riskType: input.riskType,
          score: clampScore(input.score),
          userId,
        },
      }),
    ),
  );
  await prisma.auditLog.create({
    data: {
      action: "RISK_ASSESSMENT_COMPLETED",
      actorId: userId,
      message: "Predictive clinical risk assessment completed.",
      metadata: { assessmentIds: assessments.map((assessment) => assessment.id) },
      patientId,
    },
  });
  return assessments;
}

export async function generateClinicalAlerts(userId: string, patientId?: string) {
  const patients = await prisma.patient.findMany({
    include: {
      cardiacImaging: { orderBy: { createdAt: "desc" }, take: 3 },
      cases: { include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 }, measurements: { orderBy: { createdAt: "desc" }, take: 1 } }, take: 3 },
      fitnessAssessments: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    take: 100,
    where: { archivedAt: null, ...(patientId ? { id: patientId } : {}) },
  });
  const created = [];
  for (const patient of patients) {
    const latestMeasurement = patient.cases[0]?.measurements[0];
    const latestAnalysis = patient.cases[0]?.analyses[0];
    const latestEf = patient.cardiacImaging
      .map((study) => Number(`${study.findings ?? ""} ${study.notes ?? ""}`.match(/(?:ef|ejection fraction)[:\s-]*(\d{2})/i)?.[1]))
      .find(Number.isFinite);
    const candidates: Array<{ alertType: ClinicalDecisionAlertType; message: string; severity: AISeverity; title: string; confidenceScore: number; evidence: Prisma.InputJsonObject }> = [];
    if (latestEf !== undefined && latestEf < 35) {
      candidates.push({ alertType: "EF_BELOW_35", confidenceScore: 0.88, evidence: { ef: latestEf }, message: `EF is ${latestEf}%, below the 35% critical threshold.`, severity: "CRITICAL", title: "EF below 35%" });
    }
    if (latestAnalysis?.diagnosis.toLowerCase().includes("stemi")) {
      candidates.push({ alertType: "NEW_STEMI", confidenceScore: latestAnalysis.confidenceScore, evidence: { analysisId: latestAnalysis.id }, message: "Latest ECG AI diagnosis indicates STEMI.", severity: "CRITICAL", title: "New STEMI alert" });
    }
    if (latestMeasurement && latestMeasurement.qtcInterval > 500) {
      candidates.push({ alertType: "LONG_QT", confidenceScore: 0.86, evidence: { measurementId: latestMeasurement.id, qtc: latestMeasurement.qtcInterval }, message: `QTc is ${latestMeasurement.qtcInterval}ms.`, severity: "SEVERE", title: "Long QT alert" });
    }
    if (latestAnalysis?.severity === "CRITICAL" && /af|vt|arrhythmia/i.test(latestAnalysis.diagnosis)) {
      candidates.push({ alertType: "CRITICAL_ARRHYTHMIA", confidenceScore: latestAnalysis.confidenceScore, evidence: { analysisId: latestAnalysis.id }, message: `Critical arrhythmia evidence: ${latestAnalysis.diagnosis}.`, severity: "CRITICAL", title: "Critical arrhythmia alert" });
    }
    for (const assessment of patient.fitnessAssessments) {
      if (assessment.reviewDate && assessment.reviewDate.getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000) {
        candidates.push({ alertType: "EXPIRING_CERTIFICATE", confidenceScore: 0.9, evidence: { assessmentId: assessment.id, reviewDate: assessment.reviewDate.toISOString() }, message: "Occupational fitness review date expires within 30 days.", severity: "MODERATE", title: "Expiring fitness certificate" });
      }
    }
    for (const candidate of candidates) {
      const alert = await prisma.clinicalAlert.create({
        data: {
          alertType: candidate.alertType,
          confidenceScore: candidate.confidenceScore,
          contractorCompanyId: patient.contractorCompanyId,
          createdById: userId,
          departmentId: patient.departmentId,
          evidence: candidate.evidence,
          message: candidate.message,
          organizationId: patient.organizationId,
          patientId: patient.id,
          reasoning: "Generated by clinical alert engine using structured ECG, imaging, occupational, and AI evidence.",
          references,
          severity: candidate.severity,
          title: candidate.title,
        },
      });
      created.push(alert);
      await createNotification({
        message: candidate.message,
        targetRole: "DOCTOR",
        title: candidate.title,
        type: candidate.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
      });
    }
  }
  return created;
}

export async function populationAnalytics() {
  const [patients, employees] = await Promise.all([
    prisma.patient.findMany({ include: { cardiacHistory: true, contractorCompany: true, department: true, organization: true }, where: { archivedAt: null } }),
    prisma.employee.findMany({ include: { contractorCompany: true, department: true, organization: true } }),
  ]);
  const by = (key: "organization" | "department" | "contractorCompany") => {
    const map = new Map<string, { arrhythmia: number; count: number; hypertension: number; name: string; unfit: number }>();
    for (const patient of patients) {
      const entity = patient[key];
      const id = entity?.id ?? "unassigned";
      const name = entity?.name ?? "Unassigned";
      const row = map.get(id) ?? { arrhythmia: 0, count: 0, hypertension: 0, name, unfit: 0 };
      row.count += 1;
      row.hypertension += patient.hypertension || patient.cardiacHistory?.hypertension ? 1 : 0;
      row.arrhythmia += patient.cardiacHistory?.arrhythmiaHistory ? 1 : 0;
      map.set(id, row);
    }
    for (const employee of employees) {
      const entity = employee[key];
      const id = entity?.id ?? "unassigned";
      const row = map.get(id) ?? { arrhythmia: 0, count: 0, hypertension: 0, name: entity?.name ?? "Unassigned", unfit: 0 };
      row.unfit += ["TEMPORARILY_UNFIT", "PERMANENTLY_UNFIT", "REFER_TO_CARDIOLOGIST"].includes(employee.medicalFitnessStatus) ? 1 : 0;
      map.set(id, row);
    }
    return Array.from(map.values());
  };
  return {
    byContractor: by("contractorCompany"),
    byDepartment: by("department"),
    byOrganization: by("organization"),
    totals: {
      arrhythmiaPrevalence: patients.filter((patient) => patient.cardiacHistory?.arrhythmiaHistory).length,
      hypertensionPrevalence: patients.filter((patient) => patient.hypertension || patient.cardiacHistory?.hypertension).length,
      patients: patients.length,
      unfitWorkers: employees.filter((employee) => ["TEMPORARILY_UNFIT", "PERMANENTLY_UNFIT", "REFER_TO_CARDIOLOGIST"].includes(employee.medicalFitnessStatus)).length,
    },
  };
}
