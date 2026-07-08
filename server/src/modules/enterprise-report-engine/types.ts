import type { EnterpriseReportType, ReportTemplateCategory } from "@prisma/client";

export type ReportSectionKey =
  | "header"
  | "patient"
  | "ecg"
  | "ai"
  | "doctor"
  | "attachments"
  | "comparison"
  | "teaching"
  | "occupational"
  | "fitness"
  | "disclaimer";

export type EnterpriseReportTemplateDefinition = {
  slug: string;
  name: string;
  category: ReportTemplateCategory;
  reportType: EnterpriseReportType;
  description: string;
  sections: ReportSectionKey[];
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    watermark?: string;
  };
};

export type ReportHeaderBlock = {
  hospitalLogo?: string;
  hospitalName: string;
  department?: string;
  address?: string;
  phone?: string;
  email?: string;
  doctorName: string;
  doctorTitle?: string;
  doctorLicense?: string;
  reportNumber: string;
  reportDate: string;
  reportUuid: string;
  qrCodeData?: string;
  barcodeData?: string;
  verificationUrl?: string;
  verificationHash?: string;
};

export type ReportPatientBlock = {
  patientName: string;
  patientId?: string;
  age?: string;
  gender?: string;
  company?: string;
  department?: string;
  occupation?: string;
  medicalRecordNumber?: string;
  caseNumber?: string;
  studyDate?: string;
  studyTime?: string;
  technician?: string;
  orderingPhysician?: string;
};

export type ReportEcgBlock = {
  heartRate?: string;
  rhythm?: string;
  axis?: string;
  pr?: string;
  qrs?: string;
  qt?: string;
  qtc?: string;
  st?: string;
  voltage?: string;
  intervals?: string;
  measurements?: Record<string, unknown>;
  leadQuality?: string;
  signalQuality?: string;
  noise?: string;
  paperSpeed?: string;
  gain?: string;
  filter?: string;
  acquisitionDevice?: string;
};

export type ReportAiBlock = {
  diagnosis?: string;
  confidence?: string;
  clinicalSummary?: string;
  supportingFindings?: string[];
  abnormalLeads?: string[];
  differentialDiagnosis?: Array<{ label: string; likelihood?: string; notes?: string }>;
  recommendations?: string[];
  urgency?: string;
  clinicalNotes?: string;
};

export type ReportDoctorBlock = {
  interpretation?: string;
  finalDiagnosis?: string;
  recommendation?: string[];
  restrictions?: string[];
  fitnessDecision?: string;
  comments?: string;
  digitalSignature?: string;
  stamp?: string;
  signedAt?: string;
};

export type ReportAttachmentBlock = {
  originalEcg?: string;
  processedEcg?: string;
  digitizedEcg?: string;
  measurements?: string;
  overlay?: string;
  aiHeatmap?: string;
  comparisonImages?: string[];
};

export type EnterpriseReportDocument = {
  reportId: string;
  reportNumber: string;
  reportUuid: string;
  reportType: EnterpriseReportType;
  templateCategory?: ReportTemplateCategory;
  templateSlug?: string;
  status: string;
  readOnly: boolean;
  verificationHash: string;
  contentHash: string;
  header: ReportHeaderBlock;
  patient: ReportPatientBlock;
  ecg: ReportEcgBlock;
  ai: ReportAiBlock;
  doctor: ReportDoctorBlock;
  attachments: ReportAttachmentBlock;
  sections: ReportSectionKey[];
  branding: {
    primaryColor: string;
    secondaryColor: string;
    reportHeader?: string;
    reportFooter?: string;
    watermark?: string;
  };
  generatedAt: string;
  updatedAt: string;
};

export type FhirExportBundle = {
  resourceType: "Bundle";
  type: "document";
  timestamp: string;
  identifier: { system: string; value: string };
  entry: Array<{ fullUrl: string; resource: Record<string, unknown> }>;
};
