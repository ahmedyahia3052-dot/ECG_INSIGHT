import type { ClinicalReport } from "@prisma/client";
import {
  lifecycleFromStatus,
  serializeMeasurements,
  type MedicalReportDto,
  type MedicalReportVersionDto,
} from "./dto";
import { MEDICAL_REPORT_ENGINE_VERSION, MEDICAL_REPORT_SECTIONS } from "./types";
import { isDraftStatus, isFinalStatus } from "./validators";

type ReportWithVersions = ClinicalReport & {
  versions?: Array<{
    authorId: string;
    createdAt: Date;
    id: string;
    modifications: string;
    versionNumber: number;
  }>;
};

function normalizeConfidence(value: number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

export function toMedicalReportDto(report: ReportWithVersions): MedicalReportDto {
  const measurements = serializeMeasurements(report.ecgMeasurements);
  const versions: MedicalReportVersionDto[] | undefined = report.versions?.map((version) => ({
    authorId: version.authorId,
    createdAt: version.createdAt.toISOString(),
    id: version.id,
    modifications: version.modifications,
    versionNumber: version.versionNumber,
  }));

  return {
    acquisitionDate: report.acquisitionDate.toISOString(),
    aiFindings: report.aiFindings
      ? {
          interpretation: report.aiFindings,
          severity: report.severityClassification ?? undefined,
        }
      : undefined,
    authorId: report.authorId,
    caseId: report.caseId,
    clinicalIndication: report.clinicalIndication ?? undefined,
    createdAt: report.createdAt.toISOString(),
    engineVersion: MEDICAL_REPORT_ENGINE_VERSION,
    finalizedAt: report.finalizedAt?.toISOString(),
    id: report.id,
    impression: report.finalPhysicianImpression ?? undefined,
    isDraft: isDraftStatus(report.status),
    isFinal: isFinalStatus(report.status),
    measurements,
    patientId: report.patientId,
    physicianInterpretation: {
      impression: report.finalPhysicianImpression ?? undefined,
      interpretation: report.rhythmInterpretation ?? undefined,
      licenseNumber: report.physicianLicenseNumber ?? undefined,
      name: report.physicianName,
      recommendations: report.recommendations,
      specialty: report.physicianSpecialty ?? undefined,
    },
    recommendations: report.recommendations,
    reportNumber: report.reportNumber,
    reportType: report.reportType,
    reportUuid: report.reportUuid,
    reportingDate: report.reportingDate.toISOString(),
    sections: [...MEDICAL_REPORT_SECTIONS],
    signature: {
      imagePath: report.electronicSignaturePath ?? undefined,
      signedAt: report.signedAt?.toISOString(),
      signedById: report.signedById ?? undefined,
      source: report.electronicSignaturePath ? "electronic" : undefined,
      status: report.status === "SIGNED" ? "signed" : "pending",
    },
    signedAt: report.signedAt?.toISOString(),
    status: lifecycleFromStatus(report.status),
    updatedAt: report.updatedAt.toISOString(),
    verification: {
      contentHash: report.contentHash ?? undefined,
      qrCodeData: report.qrCodeData ?? undefined,
      reportUuid: report.reportUuid,
      verificationHash: report.verificationHash ?? undefined,
      verificationToken: report.verificationToken,
      verificationUrl: report.verificationUrl ?? undefined,
    },
    versions,
  };
}

export function enrichMedicalReportDto(
  dto: MedicalReportDto,
  extras: {
    aiConfidence?: number;
    aiDiagnosis?: string;
    aiModelVersion?: string;
  },
): MedicalReportDto {
  return {
    ...dto,
    aiFindings: {
      ...dto.aiFindings,
      confidence: extras.aiConfidence != null ? normalizeConfidence(extras.aiConfidence) : dto.aiFindings?.confidence,
      diagnosis: extras.aiDiagnosis ?? dto.aiFindings?.diagnosis,
      modelVersion: extras.aiModelVersion ?? dto.aiFindings?.modelVersion,
    },
  };
}
