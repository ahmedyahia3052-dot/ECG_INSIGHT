import type { EnterpriseReportType, ReportTemplateCategory } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { defaultTemplateForType, templateBySlug } from "./templates";
import { computeContentHash, computeVerificationHash, pseudoBarcodeSvg, pseudoQrSvg } from "./security";
import type { EnterpriseReportDocument } from "./types";

function text(value: unknown, fallback = "Not recorded") {
  const rendered = String(value ?? "").trim();
  return rendered || fallback;
}

function ageFromDob(dateOfBirth: Date) {
  const years = Math.floor((Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${years} years`;
}

function normalizeConfidence(value: number | null | undefined) {
  if (value === null || value === undefined) return "Pending";
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

type MiPayload = {
  findings?: Array<{
    category?: string;
    confidence?: { score?: number };
    explainability?: { rationale?: string; supportingEvidence?: string[] };
    label?: string;
    severity?: string;
    urgency?: string;
    differentialDiagnosis?: Array<{ explanation?: string; label?: string; likelihood?: number }>;
  }>;
  overallConfidence?: { score?: number };
  recommendations?: Array<{ action?: string; priority?: string; rationale?: string }>;
  clinicalSummary?: string;
  abnormalLeads?: string[];
};

export async function composeEnterpriseReportDocument(
  reportId: string,
  baseUrl = "",
  options?: { templateSlug?: string; reportType?: EnterpriseReportType; templateCategory?: ReportTemplateCategory },
): Promise<EnterpriseReportDocument> {
  const report = await prisma.clinicalReport.findUnique({
    include: {
      author: { select: { email: true, id: true, licenseNumber: true, name: true, specialization: true } },
      case: {
        include: {
          analyses: { orderBy: { createdAt: "desc" }, take: 1 },
          files: { orderBy: { createdAt: "desc" }, take: 5 },
          measurements: { orderBy: { createdAt: "desc" }, take: 1 },
          uploadedBy: { select: { name: true } },
        },
      },
      patient: {
        include: {
          contractor: true,
          fitnessAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
          organization: {
            include: { branding: true },
          },
        },
      },
      template: true,
    },
    where: { id: reportId },
  });
  if (!report) throw new AppError(404, "Clinical report not found.", "REPORT_NOT_FOUND");

  const reportType = options?.reportType ?? report.reportType;
  const resolvedTemplate = options?.templateSlug
    ? templateBySlug(options.templateSlug) ?? defaultTemplateForType(reportType)
    : report.template
      ? {
          slug: report.template.slug,
          name: report.template.name,
          category: report.template.category,
          reportType: report.template.reportType,
          description: report.template.description ?? "",
          sections: report.template.sections as EnterpriseReportDocument["sections"],
          branding: (report.template.branding as EnterpriseReportDocument["branding"] | null) ?? undefined,
        }
      : defaultTemplateForType(reportType);
  const template = resolvedTemplate;

  const miRecord = report.medicalIntelligenceReportId
    ? await prisma.medicalIntelligenceReport.findUnique({ where: { id: report.medicalIntelligenceReportId } })
    : await prisma.medicalIntelligenceReport.findFirst({
        orderBy: { createdAt: "desc" },
        where: { caseId: report.caseId },
      });
  const mi = (miRecord?.reportJson ?? null) as MiPayload | null;

  const analysis = report.case.analyses[0];
  const measurement = report.case.measurements[0];
  const ecgMeasurements = (report.ecgMeasurements ?? {}) as Record<string, unknown>;
  const organization = report.patient.organization;
  const branding = organization?.branding;
  const brandingSnapshot = (report.brandingSnapshot ?? {}) as Record<string, unknown>;
  const occupational = (report.occupationalReportSection ?? report.patient.fitnessAssessments[0]?.occupationalReportSection ?? null) as Record<string, unknown> | null;
  const imageFile = report.case.files.find((file) => file.mimeType.startsWith("image/"));
  const verificationUrl = report.verificationUrl ?? `/api/enterprise-report-engine/verify/${report.reportUuid}?token=${report.verificationToken}`;
  const patientName = `${report.patient.firstName} ${report.patient.middleName ?? ""} ${report.patient.lastName}`.replace(/\s+/g, " ").trim();

  const document: EnterpriseReportDocument = {
    ai: {
      abnormalLeads: mi?.abnormalLeads ?? [],
      clinicalNotes: report.aiFindings ?? undefined,
      clinicalSummary: mi?.clinicalSummary ?? analysis?.interpretation ?? report.aiFindings ?? undefined,
      confidence: normalizeConfidence(mi?.overallConfidence?.score ?? analysis?.confidenceScore ?? report.case.confidenceScore),
      diagnosis: analysis?.diagnosis ?? report.case.aiDiagnosis ?? report.finalPhysicianImpression ?? undefined,
      differentialDiagnosis: (mi?.findings ?? [])
        .flatMap((finding) => finding.differentialDiagnosis ?? [])
        .map((row) => ({
          label: row.label ?? "Unknown",
          likelihood: row.likelihood != null ? `${Math.round(row.likelihood * 100)}%` : undefined,
          notes: row.explanation,
        })),
      recommendations: [
        ...report.recommendations,
        ...(mi?.recommendations ?? []).map((item) => item.action).filter(Boolean) as string[],
      ],
      supportingFindings: (mi?.findings ?? []).flatMap((finding) => finding.explainability?.supportingEvidence ?? []),
      urgency: mi?.findings?.[0]?.urgency ?? report.severityClassification ?? report.case.severity,
    },
    attachments: {
      aiHeatmap: undefined,
      comparisonImages: [],
      digitizedEcg: report.case.preprocessedImagePath ?? undefined,
      measurements: measurement ? `/api/ecg/measurements/${measurement.id}` : undefined,
      originalEcg: imageFile ? `${baseUrl}/api/ecg/files/${imageFile.id}/download` : report.case.imagePath ?? report.case.pdfPath ?? undefined,
      overlay: undefined,
      processedEcg: report.case.preprocessedImagePath ?? undefined,
    },
    branding: {
      primaryColor: String(brandingSnapshot.primaryColor ?? branding?.primaryColor ?? template.branding?.primaryColor ?? "#0F766E"),
      reportFooter: String(brandingSnapshot.reportFooter ?? branding?.reportFooter ?? "ECG Insight Enterprise Medical AI Platform"),
      reportHeader: String(brandingSnapshot.reportHeader ?? branding?.reportHeader ?? organization?.name ?? report.organizationName ?? "ECG Insight"),
      secondaryColor: String(brandingSnapshot.secondaryColor ?? branding?.secondaryColor ?? template.branding?.secondaryColor ?? "#134E4A"),
      watermark: template.branding?.watermark ?? "ECG Insight",
    },
    contentHash: "",
    doctor: {
      comments: report.finalPhysicianImpression ?? undefined,
      digitalSignature: report.electronicSignaturePath ?? undefined,
      finalDiagnosis: report.finalPhysicianImpression ?? report.case.finalDiagnosis ?? undefined,
      fitnessDecision: occupational ? text(occupational.finalFitnessDecision) : undefined,
      interpretation: report.finalPhysicianImpression ?? analysis?.interpretation ?? report.aiFindings ?? undefined,
      recommendation: report.recommendations,
      restrictions: Array.isArray(occupational?.restrictions)
        ? occupational.restrictions.filter((item): item is string => typeof item === "string")
        : [],
      signedAt: report.signedAt?.toISOString(),
      stamp: organization?.name ?? report.organizationName ?? undefined,
    },
    ecg: {
      acquisitionDevice: report.case.ecgType,
      axis: measurement?.electricalAxis != null ? `${Math.round(measurement.electricalAxis)}°` : undefined,
      filter: "Standard clinical bandpass",
      gain: "10 mm/mV",
      heartRate: measurement?.heartRate != null ? `${measurement.heartRate} bpm` : analysis?.heartRate != null ? `${Math.round(analysis.heartRate)} bpm` : undefined,
      intervals: measurement
        ? `PR ${measurement.prInterval} ms · QRS ${measurement.qrsDuration} ms · QT ${measurement.qtInterval} ms`
        : undefined,
      leadQuality: text(measurement?.signalQuality ?? ecgMeasurements.signalQuality),
      measurements: (report.ecgMeasurements as Record<string, unknown> | null) ?? (measurement
        ? {
            heartRate: measurement.heartRate,
            prInterval: measurement.prInterval,
            qrsDuration: measurement.qrsDuration,
            qtInterval: measurement.qtInterval,
            qtcInterval: measurement.qtcInterval,
            stDeviation: measurement.stDeviation,
          }
        : undefined),
      noise: "Low",
      paperSpeed: "25 mm/s",
      pr: measurement?.prInterval != null ? `${measurement.prInterval} ms` : report.case.prInterval != null ? `${report.case.prInterval} ms` : undefined,
      qrs: measurement?.qrsDuration != null ? `${measurement.qrsDuration} ms` : report.case.qrsDuration != null ? `${report.case.qrsDuration} ms` : undefined,
      qt: measurement?.qtInterval != null ? `${measurement.qtInterval} ms` : report.case.qtInterval != null ? `${report.case.qtInterval} ms` : undefined,
      qtc: measurement?.qtcInterval != null ? `${measurement.qtcInterval} ms` : report.case.qtcInterval != null ? `${report.case.qtcInterval} ms` : undefined,
      rhythm: analysis?.rhythm ?? report.rhythmInterpretation ?? report.case.ecgType,
      signalQuality: text(measurement?.signalQuality ?? ecgMeasurements.signalQuality),
      st: measurement?.stDeviation != null ? `${measurement.stDeviation} mm` : undefined,
      voltage: undefined,
    },
    generatedAt: report.generatedAt.toISOString(),
    header: {
      address: organization?.address ?? undefined,
      barcodeData: pseudoBarcodeSvg(report.reportNumber),
      department: report.departmentName ?? report.patient.departmentName ?? undefined,
      doctorLicense: report.physicianLicenseNumber ?? report.author.licenseNumber ?? undefined,
      doctorName: report.physicianName,
      doctorTitle: report.physicianSpecialty ?? report.author.specialization ?? undefined,
      email: organization?.email ?? undefined,
      hospitalLogo: branding?.logoUrl ?? organization?.logo ?? undefined,
      hospitalName: organization?.name ?? report.organizationName ?? "ECG Insight",
      phone: organization?.phone ?? undefined,
      qrCodeData: report.qrCodeData ?? pseudoQrSvg(verificationUrl),
      reportDate: report.reportingDate.toISOString(),
      reportNumber: report.reportNumber,
      reportUuid: report.reportUuid,
      verificationHash: report.verificationHash ?? undefined,
      verificationUrl,
    },
    patient: {
      age: ageFromDob(report.patient.dateOfBirth),
      caseNumber: report.case.caseNumber ?? report.case.caseId,
      company: report.patient.company ?? organization?.name ?? report.contractorName ?? undefined,
      department: report.patient.departmentName ?? report.departmentName ?? undefined,
      gender: report.patient.gender,
      medicalRecordNumber: report.patient.medicalRecordNumber ?? undefined,
      occupation: report.patient.occupation ?? report.patient.jobTitle ?? undefined,
      orderingPhysician: report.referringPhysician ?? undefined,
      patientId: report.patient.patientCode ?? report.patient.id,
      patientName,
      studyDate: report.acquisitionDate.toISOString().slice(0, 10),
      studyTime: report.acquisitionDate.toISOString().slice(11, 19),
      technician: report.case.uploadedBy.name,
    },
    readOnly: report.status === "SIGNED" || report.status === "ARCHIVED",
    reportId: report.id,
    reportNumber: report.reportNumber,
    reportType,
    reportUuid: report.reportUuid,
    sections: template.sections,
    status: report.status.toLowerCase(),
    templateCategory: options?.templateCategory ?? report.templateCategory ?? template.category,
    templateSlug: template.slug,
    updatedAt: report.updatedAt.toISOString(),
    verificationHash: "",
  };

  document.contentHash = computeContentHash(document);
  document.verificationHash = computeVerificationHash(report.reportUuid, document.contentHash, report.verificationToken);
  document.header.verificationHash = document.verificationHash;
  return document;
}

export async function persistReportSecurityHashes(reportId: string, document: EnterpriseReportDocument) {
  return prisma.clinicalReport.update({
    data: {
      attachmentManifest: document.attachments,
      brandingSnapshot: document.branding,
      contentHash: document.contentHash,
      verificationHash: document.verificationHash,
    },
    where: { id: reportId },
  });
}
