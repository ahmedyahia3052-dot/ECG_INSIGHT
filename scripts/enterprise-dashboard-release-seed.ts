import { PrismaClient, type AIAnalysisStatus, type AISeverity, type ECGCaseSeverity, type ECGCaseStatus, type ECGPriority, type Gender, type NotificationCategory, type NotificationType, type ReportStatus, type Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
});
const prisma = new PrismaClient({ adapter });

const ORG_COUNT = 10;
const DOCTOR_COUNT = 100;
const PATIENT_COUNT = 1_000;
const CASE_COUNT = 10_000;
const REPORT_COUNT = 1_000;
const NOTIFICATION_COUNT = 5_000;
const CONVERSATION_COUNT = 1_000;
const MESSAGE_COUNT = 10_000;

const firstNames = ["Amina", "Omar", "Laila", "Youssef", "Mariam", "Karim", "Nour", "Hassan", "Salma", "Tarek", "Dina", "Mahmoud"];
const lastNames = ["Hassan", "Mansour", "Yehia", "Farouk", "Mostafa", "Naguib", "Saleh", "Fahmy", "Ibrahim", "Kamel", "Adel", "Rashad"];
const organizations = ["Nile Heart Institute", "Delta Occupational Health", "Cairo Petroleum Medical", "Alexandria Cardiology Group", "Suez Industrial Clinic", "Sinai Energy Health", "Red Sea Offshore Medical", "Upper Egypt Heart Center", "Giza Enterprise Hospital", "Mansoura Clinical Network"];
const diagnoses = ["Normal sinus rhythm", "Atrial fibrillation", "Left ventricular hypertrophy", "Inferior STEMI", "Right bundle branch block", "Sinus bradycardia", "Long QT interval", "Nonspecific ST-T changes"];
const rhythms = ["Sinus rhythm", "Atrial fibrillation", "Sinus bradycardia", "Sinus tachycardia", "Junctional rhythm", "Atrial flutter"];
const departments = ["Operations", "Drilling", "Aviation", "Marine", "Cardiology", "Emergency", "Occupational Medicine", "Pipeline", "Refinery", "Corporate Wellness"];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length]!;
}

function padded(value: number, width = 4) {
  return String(value).padStart(width, "0");
}

function severityFor(index: number): { ai: AISeverity; caseSeverity: ECGCaseSeverity; priority: ECGPriority; type: NotificationType } {
  if (index % 37 === 0) return { ai: "CRITICAL", caseSeverity: "CRITICAL", priority: "CRITICAL", type: "CRITICAL" };
  if (index % 9 === 0) return { ai: "SEVERE", caseSeverity: "ABNORMAL", priority: "HIGH", type: "WARNING" };
  if (index % 4 === 0) return { ai: "MODERATE", caseSeverity: "ABNORMAL", priority: "MEDIUM", type: "INFO" };
  return { ai: "NORMAL", caseSeverity: "NORMAL", priority: "LOW", type: "SUCCESS" };
}

async function main() {
  const passwordHash = await bcrypt.hash("Enterprise@2026", 12);

  const orgRows = Array.from({ length: ORG_COUNT }, (_, index) => ({
    city: pick(["Cairo", "Alexandria", "Suez", "Mansoura", "Giza"], index),
    country: "Egypt",
    email: `enterprise-org-${padded(index + 1)}@ecginsight.example`,
    id: `release-org-${padded(index + 1)}`,
    name: organizations[index]!,
    phone: `+202555${padded(index + 1, 4)}`,
    status: "ACTIVE" as const,
    type: index % 3 === 0 ? "HOSPITAL" as const : "COMPANY" as const,
  }));
  await prisma.organization.createMany({ data: orgRows, skipDuplicates: true });

  const departmentRows = orgRows.flatMap((organization, orgIndex) =>
    departments.slice(0, 3).map((name, deptIndex) => ({
      id: `release-dept-${padded(orgIndex + 1)}-${padded(deptIndex + 1)}`,
      name,
      organizationId: organization.id,
    })),
  );
  await prisma.department.createMany({ data: departmentRows, skipDuplicates: true });

  const doctorRows = Array.from({ length: DOCTOR_COUNT }, (_, index) => ({
    accountType: "HOSPITAL",
    avatarInitials: `D${padded(index + 1, 2)}`,
    department: pick(departments, index),
    email: `release.doctor.${padded(index + 1)}@ecginsight.example`,
    emailVerified: true,
    employeeId: `DR-${padded(index + 1)}`,
    id: `release-doctor-${padded(index + 1)}`,
    institution: pick(organizations, index),
    isActive: true,
    name: `Dr. ${pick(firstNames, index)} ${pick(lastNames, index + 3)}`,
    organizationId: pick(orgRows, index).id,
    passwordHash,
    positionTitle: pick(["Consultant Cardiologist", "Occupational Physician", "Electrophysiology Fellow", "Emergency Cardiologist"], index),
    registrationRole: "cardiologist",
    role: "DOCTOR" as Role,
    specialization: pick(["Cardiology", "Electrophysiology", "Occupational Cardiology", "Emergency Cardiology"], index),
    username: `release-doctor-${padded(index + 1)}`,
  }));
  await prisma.user.createMany({ data: doctorRows, skipDuplicates: true });

  const patientRows = Array.from({ length: PATIENT_COUNT }, (_, index) => {
    const org = pick(orgRows, index);
    const department = pick(departmentRows.filter((item) => item.organizationId === org.id), index);
    const firstName = pick(firstNames, index);
    const lastName = pick(lastNames, index * 3);
    const height = 158 + (index % 38);
    const weight = 58 + (index % 45);
    return {
      bmi: Number((weight / ((height / 100) ** 2)).toFixed(1)),
      company: org.name,
      dateOfBirth: new Date(1955 + (index % 44), index % 12, (index % 27) + 1),
      departmentId: department.id,
      departmentName: department.name,
      diabetes: index % 11 === 0,
      dyslipidemia: index % 8 === 0,
      email: `release.patient.${padded(index + 1)}@ecginsight.example`,
      employeeId: `EMP-${padded(index + 1, 5)}`,
      firstName,
      fullName: `${firstName} ${lastName}`,
      gender: (index % 3 === 0 ? "FEMALE" : "MALE") as Gender,
      heightCm: height,
      hypertension: index % 6 === 0,
      id: `release-patient-${padded(index + 1, 5)}`,
      jobTitle: pick(["Control Room Operator", "Pilot", "Rig Supervisor", "Maintenance Engineer", "Driver", "Office Staff"], index),
      knownAllergies: index % 13 === 0 ? "Penicillin" : undefined,
      lastName,
      medicalHistory: index % 6 === 0 ? "Hypertension under treatment. Occupational cardiac surveillance." : "No major documented cardiac disease.",
      medicalRecordNumber: `REL-MRN-${padded(index + 1, 5)}`,
      medications: index % 6 === 0 ? "Amlodipine 5 mg daily" : "None documented",
      nationalId: `REL-NID-${padded(index + 1, 6)}`,
      occupation: "Enterprise employee",
      organizationId: org.id,
      patientCode: `REL-PAT-${padded(index + 1, 5)}`,
      phone: `+2010${padded(index + 1, 8)}`,
      previousMI: index % 71 === 0,
      riskCategory: index % 37 === 0 ? "HIGH" : index % 9 === 0 ? "MODERATE" : "LOW",
      smokingStatus: index % 5 === 0 ? "CURRENT" as const : "UNKNOWN" as const,
      weightKg: weight,
    };
  });
  await prisma.patient.createMany({ data: patientRows, skipDuplicates: true });

  const caseRows = Array.from({ length: CASE_COUNT }, (_, index) => {
    const severity = severityFor(index);
    const diagnosis = severity.caseSeverity === "CRITICAL" ? "Inferior STEMI" : pick(diagnoses, index);
    const doctor = pick(doctorRows, index);
    const patient = pick(patientRows, index);
    return {
      acquisitionDate: daysAgo(index % 730),
      aiDiagnosis: diagnosis,
      aiModelVersion: "release-rag-ecg-1.0",
      aiStatus: index % 19 === 0 ? "FAILED" as const : "COMPLETED" as const,
      assignedDoctorId: doctor.id,
      caseId: `REL-ECG-${padded(index + 1, 6)}`,
      caseNumber: `ECG-${new Date().getFullYear()}-${padded(index + 1, 6)}`,
      clinicalComments: "Enterprise seed ECG case for dashboard trends and search validation.",
      confidenceScore: Number((0.72 + (index % 22) / 100).toFixed(2)),
      doctorDiagnosis: diagnosis,
      ecgType: "12_LEAD_RESTING",
      finalDiagnosis: index % 3 === 0 ? diagnosis : undefined,
      heartRate: 54 + (index % 74),
      id: `release-case-${padded(index + 1, 6)}`,
      patientId: patient.id,
      prInterval: 140 + (index % 45),
      priority: severity.priority,
      qrsDuration: 84 + (index % 38),
      qtInterval: 360 + (index % 80),
      qtcInterval: 390 + (index % 62),
      recommendations: "Clinical correlation and physician review recommended.",
      reviewedById: index % 3 === 0 ? doctor.id : undefined,
      rhythm: pick(rhythms, index),
      severity: severity.caseSeverity,
      status: (index % 4 === 0 ? "FINALIZED" : index % 3 === 0 ? "REVIEWED" : "AI_COMPLETED") as ECGCaseStatus,
      uploadDate: daysAgo(index % 730),
      uploadedById: doctor.id,
    };
  });
  await prisma.eCGCase.createMany({ data: caseRows, skipDuplicates: true });

  const analysisRows = caseRows.map((ecgCase, index) => {
    const severity = severityFor(index);
    return {
      aiVersion: "release-rag-ecg-1.0",
      caseId: ecgCase.id,
      confidenceScore: ecgCase.confidenceScore ?? 0.82,
      diagnosis: ecgCase.aiDiagnosis ?? pick(diagnoses, index),
      heartRate: ecgCase.heartRate ?? 72,
      id: `release-analysis-${padded(index + 1, 6)}`,
      interpretation: `${ecgCase.rhythm}; ${ecgCase.aiDiagnosis}.`,
      processingTime: 420 + (index % 900),
      recommendations: ["Review clinical symptoms", "Compare with prior ECG", "Document physician interpretation"],
      rhythm: ecgCase.rhythm ?? "Sinus rhythm",
      severity: severity.ai,
      status: (ecgCase.aiStatus === "FAILED" ? "FAILED" : "COMPLETED") as AIAnalysisStatus,
      urgentActions: severity.ai === "CRITICAL" ? ["Activate STEMI pathway", "Immediate cardiology review"] : [],
    };
  });
  await prisma.aIAnalysis.createMany({ data: analysisRows, skipDuplicates: true });

  const measurementRows = caseRows.map((ecgCase, index) => ({
    caseId: ecgCase.id,
    electricalAxis: -30 + (index % 120),
    heartRate: ecgCase.heartRate ?? 72,
    id: `release-measurement-${padded(index + 1, 6)}`,
    prInterval: ecgCase.prInterval ?? 160,
    qrsDuration: ecgCase.qrsDuration ?? 96,
    qtInterval: ecgCase.qtInterval ?? 390,
    qtcInterval: ecgCase.qtcInterval ?? 420,
    rhythmRegularity: Number((0.74 + (index % 22) / 100).toFixed(2)),
    signalQuality: index % 8 === 0 ? "FAIR" as const : "GOOD" as const,
    stDeviation: index % 37 === 0 ? 2.4 : Number(((index % 9) / 10).toFixed(1)),
  }));
  await prisma.eCGMeasurement.createMany({ data: measurementRows, skipDuplicates: true });

  const reportRows = Array.from({ length: REPORT_COUNT }, (_, index) => {
    const ecgCase = caseRows[index * 3]!;
    const patient = patientRows.find((item) => item.id === ecgCase.patientId)!;
    const doctor = doctorRows.find((item) => item.id === ecgCase.assignedDoctorId)!;
    const status = (index % 5 === 0 ? "SIGNED" : index % 3 === 0 ? "FINALIZED" : "UNDER_REVIEW") as ReportStatus;
    return {
      acquisitionDate: ecgCase.acquisitionDate,
      aiFindings: ecgCase.aiDiagnosis,
      authorId: doctor.id,
      caseId: ecgCase.id,
      clinicalIndication: "Occupational surveillance and clinical ECG review.",
      differentialDiagnosis: ["Ischemia", "Rate-related repolarization change", "Electrolyte disturbance"],
      finalPhysicianImpression: `${ecgCase.aiDiagnosis}. Correlate clinically.`,
      finalizedAt: status === "FINALIZED" || status === "SIGNED" ? daysAgo(index % 120) : undefined,
      finalizedById: status === "FINALIZED" || status === "SIGNED" ? doctor.id : undefined,
      id: `release-report-${padded(index + 1, 6)}`,
      organizationName: patient.company,
      patientId: patient.id,
      physicianName: doctor.name,
      physicianSpecialty: doctor.specialization,
      recommendations: ["Follow occupational cardiology protocol", "Repeat ECG if symptomatic"],
      reportNumber: `REL-RPT-${padded(index + 1, 6)}`,
      reportingDate: daysAgo(index % 365),
      rhythmInterpretation: ecgCase.rhythm,
      severityClassification: ecgCase.severity,
      signedAt: status === "SIGNED" ? daysAgo(index % 90) : undefined,
      signedById: status === "SIGNED" ? doctor.id : undefined,
      status,
      urgentActions: ecgCase.severity === "CRITICAL" ? ["Immediate escalation"] : [],
    };
  });
  await prisma.clinicalReport.createMany({ data: reportRows, skipDuplicates: true });

  const notificationTitles = ["Critical STEMI detected", "Analysis completed", "New patient assigned", "Report generated", "Subscription expiring", "New organization member", "Failed analysis", "System maintenance"];
  const notificationRows = Array.from({ length: NOTIFICATION_COUNT }, (_, index) => {
    const ecgCase = pick(caseRows, index);
    const patient = pick(patientRows, index);
    const report = pick(reportRows, index);
    const title = pick(notificationTitles, index);
    const category = title.includes("STEMI")
      ? "CRITICAL_ECG_ALERT"
      : title.includes("Report")
        ? "REPORT_GENERATION"
        : title.includes("Subscription")
          ? "SUBSCRIPTION_EVENT"
          : title.includes("System")
            ? "SYSTEM_ALERT"
            : "SYSTEM_ALERT";
    return {
      actionUrl: title.includes("Report") ? `/reports/${report.id}` : `/ecg-cases/${ecgCase.id}`,
      caseId: ecgCase.id,
      category: category as NotificationCategory,
      createdAt: daysAgo(index % 180),
      entityId: title.includes("Report") ? report.id : ecgCase.id,
      entityType: title.includes("Report") ? "ClinicalReport" : "ECGCase",
      id: `release-notification-${padded(index + 1, 6)}`,
      message: `${title} for ${patient.fullName ?? `${patient.firstName} ${patient.lastName}`} (${ecgCase.caseNumber}).`,
      patientId: patient.id,
      priority: index % 37 === 0 ? "CRITICAL" as const : index % 9 === 0 ? "HIGH" as const : "MEDIUM" as const,
      read: index % 4 === 0,
      reportId: title.includes("Report") ? report.id : undefined,
      sentAt: daysAgo(index % 180),
      targetRole: index % 2 === 0 ? "DOCTOR" as Role : "ADMIN" as Role,
      title,
      type: (title.includes("STEMI") || title.includes("Failed") ? "CRITICAL" : title.includes("Subscription") ? "WARNING" : "INFO") as NotificationType,
      updatedAt: daysAgo(index % 180),
    };
  });
  await prisma.notification.createMany({ data: notificationRows, skipDuplicates: true });

  const conversationRows = Array.from({ length: CONVERSATION_COUNT }, (_, index) => {
    const ecgCase = pick(caseRows, index * 7);
    return {
      caseId: ecgCase.id,
      contextType: "case",
      favorite: index % 8 === 0,
      id: `release-copilot-conversation-${padded(index + 1, 4)}`,
      patientId: ecgCase.patientId,
      tag: pick(["ECG Interpretation", "Clinical Summary", "Occupational Fitness", "Differential Diagnosis", "Follow-up"], index),
      title: `Release Copilot Review ${padded(index + 1, 4)}`,
      updatedAt: daysAgo(index % 60),
      userId: pick(doctorRows, index).id,
    };
  });
  await prisma.copilotConversation.createMany({ data: conversationRows, skipDuplicates: true });

  const messageRows = Array.from({ length: MESSAGE_COUNT }, (_, index) => {
    const conversation = pick(conversationRows, index);
    const assistant = index % 2 === 1;
    return {
      citations: assistant ? [{ id: conversation.caseId, label: "Current ECG", source: "ECG Case", type: "case" }] : undefined,
      confidence: assistant ? 0.82 + (index % 12) / 100 : undefined,
      content: assistant
        ? "AI assistance only. Final diagnosis and clinical decisions remain the responsibility of the physician.\n\n## ECG Interpretation\nContext-aware review generated from the seeded ECG case, patient profile, prior reports, and ECG knowledge base.\n\n## Recommendations\n- Review symptoms and occupational role.\n- Compare with prior ECG.\n- Escalate if critical features are present."
        : pick(["Explain this ECG.", "Generate impression.", "Compare with previous ECG.", "Occupational fitness?", "Need referral?"], index),
      conversationId: conversation.id,
      createdAt: daysAgo(index % 60),
      id: `release-copilot-message-${padded(index + 1, 6)}`,
      responseTimeMs: assistant ? 520 + (index % 900) : undefined,
      role: assistant ? "assistant" : "user",
    };
  });
  await prisma.copilotMessage.createMany({ data: messageRows, skipDuplicates: true });

  await prisma.copilotSettings.upsert({
    create: { enabled: true, id: "global", provider: "RuleBasedRAG" },
    update: { enabled: true, provider: "RuleBasedRAG" },
    where: { id: "global" },
  });

  const counts = await Promise.all([
    prisma.organization.count({ where: { id: { startsWith: "release-org-" } } }),
    prisma.user.count({ where: { id: { startsWith: "release-doctor-" } } }),
    prisma.patient.count({ where: { id: { startsWith: "release-patient-" } } }),
    prisma.eCGCase.count({ where: { id: { startsWith: "release-case-" } } }),
    prisma.clinicalReport.count({ where: { id: { startsWith: "release-report-" } } }),
    prisma.notification.count({ where: { id: { startsWith: "release-notification-" } } }),
    prisma.copilotConversation.count({ where: { id: { startsWith: "release-copilot-conversation-" } } }),
    prisma.copilotMessage.count({ where: { id: { startsWith: "release-copilot-message-" } } }),
  ]);

  console.log("Enterprise dashboard release seed complete.", {
    copilotConversations: counts[6],
    copilotMessages: counts[7],
    doctors: counts[1],
    ecgCases: counts[3],
    notifications: counts[5],
    organizations: counts[0],
    patients: counts[2],
    reports: counts[4],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
