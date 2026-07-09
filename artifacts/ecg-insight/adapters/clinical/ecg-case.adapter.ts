import type { ApiECGCase, ApiPatient } from "@/services/clinical";
import type { NotificationRecord } from "@/services/collaboration";
import type { ClinicalReport } from "@/services/reports";
import type {
  DashboardKpiView,
  EcgCaseDetailView,
  EcgCaseListItemView,
} from "@/types/clinical";

function patientLabel(patient: ApiECGCase["patient"]) {
  const name = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim();
  return name || patient.medicalRecordNumber || "Unknown patient";
}

export function toEcgCaseListItemView(record: ApiECGCase): EcgCaseListItemView {
  return {
    acquisitionDate: record.acquisitionDate,
    aiStatus: record.aiStatus,
    caseId: record.caseId,
    caseNumber: record.caseNumber,
    ecgType: record.ecgType,
    heartRate: record.heartRate,
    id: record.id,
    patientLabel: patientLabel(record.patient),
    priority: record.priority,
    rhythm: record.rhythm,
    severity: record.severity,
    status: record.status,
    uploadDate: record.uploadDate,
  };
}

export function toEcgCaseDetailView(record: ApiECGCase, imageUrl?: string): EcgCaseDetailView {
  return {
    ...toEcgCaseListItemView(record),
    aiDiagnosis: record.aiDiagnosis,
    clinicalComments: record.clinicalComments,
    confidence: record.confidenceScore ?? record.confidence,
    doctorDiagnosis: record.doctorDiagnosis,
    finalDiagnosis: record.finalDiagnosis,
    imageUrl,
    interpretation: record.interpretation,
    prInterval: record.prInterval,
    qrsDuration: record.qrsDuration,
    qtInterval: record.qtInterval,
    qtcInterval: record.qtcInterval,
  };
}

export function toDashboardKpiView(input: {
  cases: ApiECGCase[];
  notifications: NotificationRecord[];
  patients: ApiPatient[];
  reports: ClinicalReport[];
}): DashboardKpiView {
  const cases = input.cases;
  const reports = input.reports;
  return {
    abnormalCases: cases.filter((item) => item.finalDiagnosis || item.priority === "high").length,
    criticalCases: cases.filter((item) => item.priority === "critical").length,
    pendingReports: reports.filter((item) => item.status === "draft" || item.status === "under_review").length,
    pendingReviews: cases.filter((item) => item.status === "under_review" || item.status === "ai_completed").length,
    totalCases: cases.length,
    totalNotifications: input.notifications.length,
    totalPatients: input.patients.length,
    totalReports: reports.length,
  };
}
