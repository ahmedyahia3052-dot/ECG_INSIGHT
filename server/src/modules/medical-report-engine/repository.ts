import type { ClinicalReport, Prisma, ReportStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import type { UpdateDraftReportInput } from "./schemas";
import type { MedicalReportDto } from "./dto";
import { toMedicalReportDto } from "./report-builder";

const reportInclude = {
  author: { select: { email: true, id: true, name: true, specialization: true } },
  finalizedBy: { select: { id: true, name: true } },
  signedBy: { select: { id: true, name: true } },
  versions: { orderBy: { versionNumber: "desc" as const } },
} satisfies Prisma.ClinicalReportInclude;

export async function findReportById(reportId: string) {
  return prisma.clinicalReport.findUnique({
    include: reportInclude,
    where: { id: reportId },
  });
}

export async function findReportByUuid(reportUuid: string) {
  return prisma.clinicalReport.findUnique({
    include: reportInclude,
    where: { reportUuid },
  });
}

export async function listReports(filters?: {
  caseId?: string;
  limit?: number;
  patientId?: string;
  status?: ReportStatus;
}) {
  return prisma.clinicalReport.findMany({
    include: reportInclude,
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 50,
    where: {
      deletedAt: null,
      ...(filters?.caseId ? { caseId: filters.caseId } : {}),
      ...(filters?.patientId ? { patientId: filters.patientId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
  });
}

export async function updateDraftReportRecord(reportId: string, patch: UpdateDraftReportInput) {
  return prisma.clinicalReport.update({
    data: {
      aiFindings: patch.aiFindings,
      clinicalIndication: patch.clinicalIndication,
      differentialDiagnosis: patch.differentialDiagnosis,
      ecgMeasurements: patch.ecgMeasurements as Prisma.InputJsonValue | undefined,
      finalPhysicianImpression: patch.finalPhysicianImpression,
      recommendations: patch.recommendations,
      rhythmInterpretation: patch.rhythmInterpretation,
      severityClassification: patch.severityClassification,
      urgentActions: patch.urgentActions,
    },
    include: reportInclude,
    where: { id: reportId },
  });
}

export async function createReportVersionRecord(
  report: ClinicalReport,
  authorId: string,
  modifications: string,
) {
  const latest = await prisma.reportVersion.findFirst({
    orderBy: { versionNumber: "desc" },
    where: { reportId: report.id },
  });
  return prisma.reportVersion.create({
    data: {
      authorId,
      modifications,
      reportId: report.id,
      snapshot: {
        aiFindings: report.aiFindings,
        finalPhysicianImpression: report.finalPhysicianImpression,
        recommendations: report.recommendations,
        rhythmInterpretation: report.rhythmInterpretation,
        status: report.status,
      } as Prisma.InputJsonValue,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
    },
  });
}

export async function finalizeReportRecord(reportId: string, actorId: string) {
  return prisma.clinicalReport.update({
    data: {
      finalizedAt: new Date(),
      finalizedById: actorId,
      status: "FINALIZED",
    },
    include: reportInclude,
    where: { id: reportId },
  });
}

export async function signReportRecord(reportId: string, actorId: string, signaturePath?: string) {
  return prisma.clinicalReport.update({
    data: {
      electronicSignaturePath: signaturePath,
      signedAt: new Date(),
      signedById: actorId,
      status: "SIGNED",
    },
    include: reportInclude,
    where: { id: reportId },
  });
}

export async function submitReportForReviewRecord(reportId: string) {
  return prisma.clinicalReport.update({
    data: { status: "UNDER_REVIEW" },
    include: reportInclude,
    where: { id: reportId },
  });
}

export async function listReportVersions(reportId: string) {
  return prisma.reportVersion.findMany({
    include: { author: { select: { email: true, id: true, name: true } } },
    orderBy: { versionNumber: "desc" },
    where: { reportId },
  });
}

export async function getPhysicianSignature(physicianId: string) {
  return prisma.reportSignature.findUnique({ where: { physicianId } });
}

export function assertReportExists<T>(report: T | null): T {
  if (!report) throw new AppError(404, "Medical report not found.", "MEDICAL_REPORT_NOT_FOUND");
  return report;
}

export function mapReportsToDto(reports: Awaited<ReturnType<typeof listReports>>): MedicalReportDto[] {
  return reports.map((report) => toMedicalReportDto(report));
}
