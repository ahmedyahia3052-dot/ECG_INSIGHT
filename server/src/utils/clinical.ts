import type {
  AIAnalysis,
  AuditLog,
  ClinicalReport,
  ECGCase,
  ECGCaseSeverity,
  ECGCaseStatus,
  ECGFile,
  ECGMeasurement,
  ECGPriority,
  Gender,
  Patient,
  SmokingStatus,
  User,
} from "@prisma/client";
import { toApiRole } from "./users";

export type ApiGender = "child" | "child_female" | "child_male" | "female" | "male" | "other" | "unknown";
export type ApiCaseStatus = "ai_completed" | "approved" | "finalized" | "pending" | "processing" | "rejected" | "reviewed" | "under_review" | "uploaded";
export type ApiPriority = "low" | "medium" | "high" | "critical";
export type ApiCaseSeverity = "abnormal" | "critical" | "normal";
export type ApiSmokingStatus = "never" | "former" | "current" | "unknown";

const genderToApi: Record<Gender, ApiGender> = {
  CHILD: "child",
  CHILD_FEMALE: "child_female",
  CHILD_MALE: "child_male",
  FEMALE: "female",
  MALE: "male",
  OTHER: "other",
  UNKNOWN: "unknown",
};

const genderFromApi: Record<ApiGender, Gender> = {
  child: "CHILD",
  child_female: "CHILD_FEMALE",
  child_male: "CHILD_MALE",
  female: "FEMALE",
  male: "MALE",
  other: "OTHER",
  unknown: "UNKNOWN",
};

const statusToApi: Record<ECGCaseStatus, ApiCaseStatus> = {
  AI_COMPLETED: "ai_completed",
  APPROVED: "approved",
  FINALIZED: "finalized",
  PENDING: "pending",
  PROCESSING: "processing",
  REJECTED: "rejected",
  REVIEWED: "reviewed",
  UNDER_REVIEW: "under_review",
  UPLOADED: "uploaded",
};

const statusFromApi: Record<ApiCaseStatus, ECGCaseStatus> = {
  ai_completed: "AI_COMPLETED",
  approved: "APPROVED",
  finalized: "FINALIZED",
  pending: "PENDING",
  processing: "PROCESSING",
  rejected: "REJECTED",
  reviewed: "REVIEWED",
  under_review: "UNDER_REVIEW",
  uploaded: "UPLOADED",
};

const severityToApi: Record<ECGCaseSeverity, ApiCaseSeverity> = {
  ABNORMAL: "abnormal",
  CRITICAL: "critical",
  NORMAL: "normal",
};

const priorityToApi: Record<ECGPriority, ApiPriority> = {
  CRITICAL: "critical",
  HIGH: "high",
  LOW: "low",
  MEDIUM: "medium",
};

const priorityFromApi: Record<ApiPriority, ECGPriority> = {
  critical: "CRITICAL",
  high: "HIGH",
  low: "LOW",
  medium: "MEDIUM",
};

const smokingToApi: Record<SmokingStatus, ApiSmokingStatus> = {
  CURRENT: "current",
  FORMER: "former",
  NEVER: "never",
  UNKNOWN: "unknown",
};

const smokingFromApi: Record<ApiSmokingStatus, SmokingStatus> = {
  current: "CURRENT",
  former: "FORMER",
  never: "NEVER",
  unknown: "UNKNOWN",
};

export function fromApiGender(gender: ApiGender): Gender {
  return genderFromApi[gender];
}

export function fromApiCaseStatus(status: ApiCaseStatus): ECGCaseStatus {
  return statusFromApi[status];
}

export function fromApiPriority(priority: ApiPriority): ECGPriority {
  return priorityFromApi[priority];
}

export function fromApiSmokingStatus(status: ApiSmokingStatus): SmokingStatus {
  return smokingFromApi[status];
}

export function computeAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = today.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

export function serializePatient(patient: Patient) {
  return {
    address: patient.address ?? undefined,
    alcoholStatus: patient.alcoholStatus ?? undefined,
    age: computeAge(patient.dateOfBirth),
    allergies: patient.allergies ?? undefined,
    arrhythmiaHistory: patient.arrhythmiaHistoryFlag,
    archivedAt: patient.archivedAt?.toISOString(),
    bloodGroup: patient.bloodGroup ?? undefined,
    bmi: patient.bmi ?? undefined,
    company: patient.company ?? undefined,
    contractor: patient.contractorName ?? undefined,
    dateOfBirth: patient.dateOfBirth.toISOString().slice(0, 10),
    contractorCompanyId: patient.contractorCompanyId ?? undefined,
    contractorId: patient.contractorId ?? undefined,
    departmentId: patient.departmentId ?? undefined,
    department: patient.departmentName ?? undefined,
    diabetes: patient.diabetes,
    dyslipidemia: patient.dyslipidemia,
    email: patient.email ?? undefined,
    employeeId: patient.employeeId ?? undefined,
    emergencyContact: patient.emergencyContact ?? undefined,
    emergencyContactName: patient.emergencyContactName ?? undefined,
    emergencyContactPhone: patient.emergencyContactPhone ?? undefined,
    familyHistory: patient.familyHistory ?? undefined,
    firstName: patient.firstName,
    fullName: patient.fullName ?? `${patient.firstName} ${patient.middleName ?? ""} ${patient.lastName}`.replace(/\s+/g, " ").trim(),
    gender: genderToApi[patient.gender],
    hireDate: patient.hireDate?.toISOString().slice(0, 10),
    heartFailure: patient.heartFailure,
    heightCm: patient.heightCm ?? undefined,
    hypertension: patient.hypertension,
    id: patient.id,
    ischemicHeartDisease: patient.ischemicHeartDisease,
    jobTitle: patient.jobTitle ?? patient.occupation ?? undefined,
    knownAllergies: patient.knownAllergies ?? patient.allergies ?? undefined,
    lastName: patient.lastName,
    maritalStatus: patient.maritalStatus ?? undefined,
    medicalHistory: patient.medicalHistory ?? undefined,
    medicalRecordNumber: patient.medicalRecordNumber,
    medications: patient.medications ?? undefined,
    middleName: patient.middleName ?? undefined,
    nationalId: patient.nationalId ?? undefined,
    notes: patient.notes ?? undefined,
    obesity: patient.obesity,
    occupation: patient.occupation ?? undefined,
    organizationId: patient.organizationId ?? undefined,
    passportNumber: patient.passportNumber ?? undefined,
    patientCode: patient.patientCode ?? patient.medicalRecordNumber,
    phone: patient.phone ?? undefined,
    previousCABG: patient.previousCABG,
    previousMI: patient.previousMI,
    previousPCI: patient.previousPCI,
    smokingStatus: smokingToApi[patient.smokingStatus],
    status: patient.status.toLowerCase(),
    stentsHistory: patient.stentsHistory ?? undefined,
    weightKg: patient.weightKg ?? undefined,
  };
}

export function serializeCase(
  ecgCase: ECGCase & {
    analyses?: AIAnalysis[];
    assignedDoctor?: Pick<User, "email" | "id" | "name" | "role"> | null;
    files?: ECGFile[];
    measurements?: ECGMeasurement[];
    patient: Patient;
    reports?: ClinicalReport[];
    reviewedBy?: Pick<User, "email" | "id" | "name" | "role"> | null;
    uploadedBy?: Pick<User, "email" | "id" | "name" | "role">;
  },
) {
  const latestAnalysis = ecgCase.analyses?.[0];
  const latestMeasurement = ecgCase.measurements?.[0];
  const originalFile = ecgCase.files?.[0];
  const imageFile = ecgCase.files?.find((file) => file.mimeType.startsWith("image/"));
  const pdfFile = ecgCase.files?.find((file) => file.mimeType === "application/pdf");
  return {
    aiStatus: ecgCase.aiStatus.toLowerCase(),
    aiDiagnosis: ecgCase.aiDiagnosis ?? latestAnalysis?.diagnosis ?? undefined,
    assignedDoctor: ecgCase.assignedDoctor
      ? {
          email: ecgCase.assignedDoctor.email,
          id: ecgCase.assignedDoctor.id,
          name: ecgCase.assignedDoctor.name,
          role: toApiRole(ecgCase.assignedDoctor.role),
        }
      : null,
    assignedDoctorId: ecgCase.assignedDoctorId,
    approvedAt: ecgCase.approvedAt?.toISOString(),
    acquisitionDate: ecgCase.acquisitionDate.toISOString(),
    caseId: ecgCase.caseId,
    caseNumber: ecgCase.caseNumber ?? ecgCase.caseId,
    clinicalNotes: ecgCase.clinicalNotes ?? undefined,
    clinicalComments: ecgCase.clinicalComments ?? ecgCase.clinicalNotes ?? undefined,
    confidenceScore: ecgCase.confidenceScore ?? latestAnalysis?.confidenceScore ?? undefined,
    createdAt: ecgCase.createdAt.toISOString(),
    doctorDiagnosis: ecgCase.doctorDiagnosis ?? ecgCase.finalDiagnosis ?? undefined,
    ecgType: ecgCase.ecgType,
    files: ecgCase.files?.map(serializeFile) ?? [],
    finalDiagnosis: ecgCase.finalDiagnosis ?? undefined,
    finalizedAt: ecgCase.finalizedAt?.toISOString(),
    heartRate: ecgCase.heartRate ?? latestMeasurement?.heartRate ?? latestAnalysis?.heartRate ?? undefined,
    id: ecgCase.id,
    imagePath: ecgCase.imagePath ?? (imageFile ? `/api/uploads/ecg/${imageFile.storedName}` : undefined),
    originalFileUrl: originalFile ? `/api/uploads/ecg/${originalFile.storedName}` : undefined,
    patient: serializePatient(ecgCase.patient),
    patientId: ecgCase.patientId,
    pdfPath: ecgCase.pdfPath ?? (pdfFile ? `/api/uploads/ecg/${pdfFile.storedName}` : undefined),
    preprocessedImagePath: ecgCase.preprocessedImagePath ?? undefined,
    prInterval: ecgCase.prInterval ?? latestMeasurement?.prInterval ?? undefined,
    priority: priorityToApi[ecgCase.priority],
    qrsDuration: ecgCase.qrsDuration ?? latestMeasurement?.qrsDuration ?? undefined,
    qtInterval: ecgCase.qtInterval ?? latestMeasurement?.qtInterval ?? undefined,
    qtcInterval: ecgCase.qtcInterval ?? latestMeasurement?.qtcInterval ?? undefined,
    recommendations: ecgCase.recommendations ?? latestAnalysis?.recommendations.join("\n") ?? undefined,
    rejectedAt: ecgCase.rejectedAt?.toISOString(),
    reviewedAt: ecgCase.reviewedAt?.toISOString(),
    reviewedBy: ecgCase.reviewedBy
      ? {
          email: ecgCase.reviewedBy.email,
          id: ecgCase.reviewedBy.id,
          name: ecgCase.reviewedBy.name,
          role: toApiRole(ecgCase.reviewedBy.role),
        }
      : null,
    reviewedById: ecgCase.reviewedById ?? undefined,
    rhythm: ecgCase.rhythm ?? latestAnalysis?.rhythm ?? undefined,
    severity: severityToApi[ecgCase.severity],
    status: statusToApi[ecgCase.status],
    reportCount: ecgCase.reports?.length ?? 0,
    updatedAt: ecgCase.updatedAt.toISOString(),
    uploadDate: ecgCase.uploadDate.toISOString(),
    uploadedBy: ecgCase.uploadedBy
      ? {
          email: ecgCase.uploadedBy.email,
          id: ecgCase.uploadedBy.id,
          name: ecgCase.uploadedBy.name,
          role: toApiRole(ecgCase.uploadedBy.role),
        }
      : undefined,
    uploadedById: ecgCase.uploadedById,
  };
}

export function serializeFile(file: ECGFile) {
  return {
    caseId: file.caseId,
    createdAt: file.createdAt.toISOString(),
    downloadUrl: `/api/uploads/ecg/${file.storedName}`,
    id: file.id,
    mimeType: file.mimeType,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    storedName: file.storedName,
  };
}

export function serializeAuditLog(log: AuditLog) {
  return {
    action: log.action,
    actorId: log.actorId,
    caseId: log.caseId ?? undefined,
    createdAt: log.createdAt.toISOString(),
    id: log.id,
    message: log.message,
    metadata: log.metadata,
    patientId: log.patientId ?? undefined,
  };
}
