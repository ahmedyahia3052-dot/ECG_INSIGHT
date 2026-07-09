import type { EnterpriseReportType, ReportStatus } from "@prisma/client";
import type { FhirExportBundle } from "../enterprise-report-engine/types";
import type { AiOverlayReportExportDto } from "../ai-annotation-overlay-engine/dto";
import type { MedicalReportLifecycle, MedicalReportSectionKey, PdfRenderStage } from "./types";

export type MedicalReportMeasurementsDto = {
  heartRate?: number;
  prInterval?: number;
  qrsDuration?: number;
  qtInterval?: number;
  qtcInterval?: number;
  rhythmRegularity?: number;
  signalQuality?: string;
  stDeviation?: number;
  raw?: Record<string, unknown>;
};

export type MedicalReportAiFindingsDto = {
  confidence?: string;
  diagnosis?: string;
  interpretation?: string;
  modelVersion?: string;
  severity?: string;
  supportingFindings?: string[];
  urgentActions?: string[];
};

export type MedicalReportPhysicianDto = {
  impression?: string;
  interpretation?: string;
  licenseNumber?: string;
  name: string;
  recommendations?: string[];
  specialty?: string;
};

export type MedicalReportSignatureDto = {
  imagePath?: string;
  signedAt?: string;
  signedById?: string;
  source?: "drawn" | "electronic" | "uploaded";
  status: "pending" | "signed";
};

export type MedicalReportVerificationDto = {
  contentHash?: string;
  qrCodeData?: string;
  reportUuid: string;
  verificationHash?: string;
  verificationToken: string;
  verificationUrl?: string;
};

export type MedicalReportVersionDto = {
  authorId: string;
  createdAt: string;
  id: string;
  modifications: string;
  versionNumber: number;
};

export type MedicalReportDto = {
  acquisitionDate: string;
  aiFindings?: MedicalReportAiFindingsDto;
  authorId: string;
  caseId: string;
  clinicalIndication?: string;
  createdAt: string;
  engineVersion: string;
  finalizedAt?: string;
  id: string;
  impression?: string;
  isFinal: boolean;
  isDraft: boolean;
  measurements?: MedicalReportMeasurementsDto;
  patientId: string;
  physicianInterpretation?: MedicalReportPhysicianDto;
  recommendations: string[];
  reportNumber: string;
  reportType: EnterpriseReportType;
  reportUuid: string;
  reportingDate: string;
  sections: MedicalReportSectionKey[];
  signature: MedicalReportSignatureDto;
  signedAt?: string;
  status: MedicalReportLifecycle;
  updatedAt: string;
  verification: MedicalReportVerificationDto;
  versions?: MedicalReportVersionDto[];
};

export type MedicalReportJsonExportDto = {
  document: MedicalReportDto;
  engineVersion: string;
  exportedAt: string;
  format: "json";
  overlayExport?: AiOverlayReportExportDto;
};

export type MedicalReportFhirExportDto = {
  bundle: FhirExportBundle;
  engineVersion: string;
  exportedAt: string;
  format: "fhir";
};

export type PrintLayoutDto = {
  columns: number;
  marginsMm: { bottom: number; left: number; right: number; top: number };
  orientation: "portrait" | "landscape";
  pageSize: "A4" | "Letter";
  sections: MedicalReportSectionKey[];
  watermark?: string;
};

export type PdfArchitectureDto = {
  engineVersion: string;
  outputFormats: Array<"pdf" | "html" | "svg" | "png">;
  renderer: "enterprise-vector-pdf-v1";
  stages: Array<{
    description: string;
    outputArtifact?: string;
    stage: PdfRenderStage;
  }>;
  storageTargets: string[];
};

export function lifecycleFromStatus(status: ReportStatus): MedicalReportLifecycle {
  return status.toLowerCase() as MedicalReportLifecycle;
}

export function serializeMeasurements(raw: unknown): MedicalReportMeasurementsDto | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  return {
    heartRate: typeof value.heartRate === "number" ? value.heartRate : undefined,
    prInterval: typeof value.prInterval === "number" ? value.prInterval : undefined,
    qrsDuration: typeof value.qrsDuration === "number" ? value.qrsDuration : undefined,
    qtInterval: typeof value.qtInterval === "number" ? value.qtInterval : undefined,
    qtcInterval: typeof value.qtcInterval === "number" ? value.qtcInterval : undefined,
    raw: value,
    rhythmRegularity: typeof value.rhythmRegularity === "number" ? value.rhythmRegularity : undefined,
    signalQuality: typeof value.signalQuality === "string" ? value.signalQuality : undefined,
    stDeviation: typeof value.stDeviation === "number" ? value.stDeviation : undefined,
  };
}
