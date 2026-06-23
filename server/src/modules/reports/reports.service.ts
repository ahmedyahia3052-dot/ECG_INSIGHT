import type { ClinicalReport, Prisma, ReportStatus, Role, User } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";

type ReportWithRelations = ClinicalReport & {
  author: Pick<User, "email" | "id" | "name" | "specialization">;
  emailLogs?: Array<{ id: string; recipient: string; senderId: string; sentAt: Date; status: string }>;
  versions?: Array<{ authorId: string; createdAt: Date; id: string; modifications: string; versionNumber: number }>;
};

export function canManageReport(
  auth: { id: string; role: Role },
  report: Pick<ClinicalReport, "authorId">,
) {
  return auth.role === "SUPER_ADMIN" || auth.role === "ADMIN" || report.authorId === auth.id;
}

export function assertCanEditReport(auth: { id: string; role: Role }, report: Pick<ClinicalReport, "authorId" | "status">) {
  if (auth.role === "STUDENT") throw new AppError(403, "Students have read-only report access.", "FORBIDDEN");
  if (!canManageReport(auth, report)) throw new AppError(403, "You can only modify your own reports.", "FORBIDDEN");
  if (report.status === "SIGNED" || report.status === "ARCHIVED") {
    throw new AppError(409, "Signed or archived reports cannot be edited.", "REPORT_LOCKED");
  }
}

export function assertCanFinalize(auth: { id: string; role: Role }, report: Pick<ClinicalReport, "authorId" | "status">) {
  if (auth.role !== "SUPER_ADMIN" && auth.role !== "ADMIN" && auth.role !== "DOCTOR") {
    throw new AppError(403, "Only doctors or admins may finalize reports.", "FORBIDDEN");
  }
  if (!canManageReport(auth, report)) throw new AppError(403, "You can only finalize your own reports.", "FORBIDDEN");
  if (report.status === "SIGNED" || report.status === "ARCHIVED") {
    throw new AppError(409, "This report lifecycle state cannot be finalized.", "REPORT_LOCKED");
  }
}

function reportNumber() {
  return `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
}

function reportSnapshot(report: ClinicalReport): Prisma.InputJsonObject {
  return {
    aiFindings: report.aiFindings,
    clinicalIndication: report.clinicalIndication,
    differentialDiagnosis: report.differentialDiagnosis,
    finalPhysicianImpression: report.finalPhysicianImpression,
    recommendations: report.recommendations,
    rhythmInterpretation: report.rhythmInterpretation,
    severityClassification: report.severityClassification,
    status: report.status,
    urgentActions: report.urgentActions,
  };
}

export async function createReportVersion(report: ClinicalReport, authorId: string, modifications: string) {
  const latest = await prisma.reportVersion.findFirst({
    orderBy: { versionNumber: "desc" },
    where: { reportId: report.id },
  });
  return prisma.reportVersion.create({
    data: {
      authorId,
      modifications,
      reportId: report.id,
      snapshot: reportSnapshot(report),
      versionNumber: (latest?.versionNumber ?? 0) + 1,
    },
  });
}

export async function generateClinicalReport(caseId: string, authorId: string) {
  const [ecgCase, author] = await Promise.all([
    prisma.eCGCase.findUnique({
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
        measurements: { orderBy: { createdAt: "desc" }, take: 1 },
        patient: {
          include: {
            contractor: true,
            fitnessAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
            organization: true,
          },
        },
      },
      where: { id: caseId },
    }),
    prisma.user.findUnique({ where: { id: authorId } }),
  ]);
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  if (!author) throw new AppError(404, "Physician not found.", "USER_NOT_FOUND");

  const analysis = ecgCase.analyses[0];
  const measurement = ecgCase.measurements[0];
  const occupationalAssessment = ecgCase.patient.fitnessAssessments[0];
  const report = await prisma.clinicalReport.create({
    data: {
      acquisitionDate: ecgCase.uploadDate,
      aiFindings: analysis?.interpretation ?? ecgCase.finalDiagnosis ?? undefined,
      authorId,
      caseId: ecgCase.id,
      clinicalIndication: ecgCase.clinicalNotes,
      contractorName: ecgCase.patient.contractor?.name,
      differentialDiagnosis: analysis?.diagnosis ? [analysis.diagnosis] : [],
      ecgMeasurements: measurement
        ? {
            heartRate: measurement.heartRate,
            prInterval: measurement.prInterval,
            qrsDuration: measurement.qrsDuration,
            qtInterval: measurement.qtInterval,
            qtcInterval: measurement.qtcInterval,
            rhythmRegularity: measurement.rhythmRegularity,
            signalQuality: measurement.signalQuality,
            stDeviation: measurement.stDeviation,
          }
        : undefined,
      finalPhysicianImpression: ecgCase.finalDiagnosis,
      organizationName: ecgCase.patient.organization?.name,
      occupationalReportSection:
        occupationalAssessment?.occupationalReportSection === null
          ? undefined
          : (occupationalAssessment?.occupationalReportSection as Prisma.InputJsonValue | undefined),
      patientId: ecgCase.patientId,
      physicianLicenseNumber: author.licenseNumber,
      physicianName: author.name,
      physicianSpecialty: author.specialization,
      recommendations: analysis?.recommendations ?? [],
      referringPhysician: ecgCase.assignedDoctorId ? undefined : author.name,
      reportNumber: reportNumber(),
      rhythmInterpretation: analysis?.rhythm ?? ecgCase.ecgType,
      severityClassification: analysis?.severity ?? ecgCase.priority,
      urgentActions: analysis?.urgentActions ?? [],
    },
  });
  await createReportVersion(report, authorId, "Initial report generated from ECG case data.");
  await prisma.auditLog.create({
    data: {
      action: "REPORT_CREATED",
      actorId: authorId,
      caseId: ecgCase.id,
      message: `Clinical report ${report.reportNumber} generated.`,
      patientId: ecgCase.patientId,
    },
  });
  return report;
}

export function serializeReport(report: ReportWithRelations | ClinicalReport) {
  return {
    acquisitionDate: report.acquisitionDate.toISOString(),
    aiFindings: report.aiFindings ?? undefined,
    archivedAt: report.archivedAt?.toISOString(),
    authorId: report.authorId,
    caseId: report.caseId,
    clinicalIndication: report.clinicalIndication ?? undefined,
    contractorName: report.contractorName ?? undefined,
    createdAt: report.createdAt.toISOString(),
    differentialDiagnosis: report.differentialDiagnosis,
    ecgMeasurements: report.ecgMeasurements,
    electronicSignaturePath: report.electronicSignaturePath ?? undefined,
    emailLogs: "emailLogs" in report ? report.emailLogs?.map((log) => ({
      id: log.id,
      recipient: log.recipient,
      senderId: log.senderId,
      sentAt: log.sentAt.toISOString(),
      status: log.status,
    })) : undefined,
    finalPhysicianImpression: report.finalPhysicianImpression ?? undefined,
    finalizedAt: report.finalizedAt?.toISOString(),
    finalizedById: report.finalizedById ?? undefined,
    generatedAt: report.generatedAt.toISOString(),
    id: report.id,
    organizationName: report.organizationName ?? undefined,
    occupationalReportSection: report.occupationalReportSection,
    patientId: report.patientId,
    physicianLicenseNumber: report.physicianLicenseNumber ?? undefined,
    physicianName: report.physicianName,
    physicianSpecialty: report.physicianSpecialty ?? undefined,
    recommendations: report.recommendations,
    referringPhysician: report.referringPhysician ?? undefined,
    reportNumber: report.reportNumber,
    reportingDate: report.reportingDate.toISOString(),
    rhythmInterpretation: report.rhythmInterpretation ?? undefined,
    severityClassification: report.severityClassification ?? undefined,
    signedAt: report.signedAt?.toISOString(),
    signedById: report.signedById ?? undefined,
    status: report.status.toLowerCase(),
    updatedAt: report.updatedAt.toISOString(),
    urgentActions: report.urgentActions,
    versions: "versions" in report ? report.versions?.map((version) => ({
      authorId: version.authorId,
      createdAt: version.createdAt.toISOString(),
      id: version.id,
      modifications: version.modifications,
      versionNumber: version.versionNumber,
    })) : undefined,
  };
}

export function statusFromApi(status: "draft" | "under_review"): ReportStatus {
  return status === "under_review" ? "UNDER_REVIEW" : "DRAFT";
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildReportPdf(report: ClinicalReport, watermark = "ECG Insight") {
  const lines = [
    "ECG Insight Clinical Report",
    `Watermark: ${watermark}`,
    `Report Number: ${report.reportNumber}`,
    `Case ID: ${report.caseId}`,
    `Organization: ${report.organizationName ?? "N/A"}`,
    `Contractor: ${report.contractorName ?? "N/A"}`,
    `ECG Acquisition: ${report.acquisitionDate.toISOString()}`,
    `Reporting Date: ${report.reportingDate.toISOString()}`,
    `Physician: ${report.physicianName}`,
    `Specialty: ${report.physicianSpecialty ?? "N/A"}`,
    `License: ${report.physicianLicenseNumber ?? "N/A"}`,
    `Status: ${report.status}`,
    `Clinical Indication: ${report.clinicalIndication ?? "N/A"}`,
    `AI Findings: ${report.aiFindings ?? "N/A"}`,
    `Rhythm: ${report.rhythmInterpretation ?? "N/A"}`,
    `Severity: ${report.severityClassification ?? "N/A"}`,
    `Differential Diagnosis: ${report.differentialDiagnosis.join(", ") || "N/A"}`,
    `Recommendations: ${report.recommendations.join("; ") || "N/A"}`,
    `Urgent Actions: ${report.urgentActions.join("; ") || "N/A"}`,
    `Final Impression: ${report.finalPhysicianImpression ?? "N/A"}`,
    `Occupational Fitness: ${report.occupationalReportSection ? JSON.stringify(report.occupationalReportSection).slice(0, 100) : "N/A"}`,
    `Electronic Signature: ${report.electronicSignaturePath ? "Applied" : "Not applied"}`,
    "Page 1 of 1",
  ];
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 780 Td",
    ...lines.map((line, index) => `${index === 0 ? "" : "0 -24 Td"}(${escapePdfText(line).slice(0, 110)}) Tj`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  const bodyParts: string[] = ["%PDF-1.4\n"];
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(bodyParts.join("")));
    bodyParts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }
  const xrefOffset = Buffer.byteLength(bodyParts.join(""));
  bodyParts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) {
    bodyParts.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  }
  bodyParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.from(bodyParts.join(""), "utf8");
}
