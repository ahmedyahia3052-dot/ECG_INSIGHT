import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { composeAiClinicalReport } from "./composer";
import { measurementFromDatabase, resolveCaseMeasurement } from "./measurement-adapter";
import type { ComposedAiReport, SerializedClinicalGeneratedReport } from "./types";
import { AI_REPORT_GENERATOR_VERSION } from "./types";

type PersistInput = {
  caseId: string;
  clinicalIndication?: string;
  composed: ComposedAiReport;
  generatedById?: string;
  reportGroupId?: string;
  status: "GENERATED" | "REGENERATED";
  versionNumber: number;
};

async function loadCaseContext(caseId: string) {
  const ecgCase = await prisma.eCGCase.findUnique({
    include: {
      patient: {
        select: {
          company: true,
          dateOfBirth: true,
          departmentName: true,
          firstName: true,
          gender: true,
          id: true,
          lastName: true,
          middleName: true,
          occupation: true,
          patientCode: true,
        },
      },
    },
    where: { id: caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return ecgCase;
}

async function persistComposedReport(input: PersistInput) {
  const ecgCase = await prisma.eCGCase.findUnique({
    select: { patientId: true },
    where: { id: input.caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

  const report = await prisma.clinicalGeneratedReport.create({
    data: {
      acquisitionQuality: input.composed.acquisitionQuality,
      aiConfidence: input.composed.aiConfidence,
      caseId: input.caseId,
      clinicalFlags: input.composed.clinicalFlags,
      clinicalIndication: input.composed.clinicalIndication,
      clinicalUrgency: input.composed.clinicalUrgency,
      emergencyWarning: input.composed.emergencyWarning,
      executiveSummary: input.composed.executiveSummary as unknown as Prisma.InputJsonValue,
      explanations: {
        create: input.composed.explanations.map((item) => ({
          clinicalReferences: item.clinicalReferences,
          findingCode: item.findingCode,
          howText: item.howText,
          supportingEvidence: item.supportingEvidence,
          whyText: item.whyText,
        })),
      },
      findings: {
        create: input.composed.findings.map((item) => ({
          category: item.category,
          code: item.code,
          confidence: item.confidence,
          evidence: item.evidence as unknown as Prisma.InputJsonValue,
          label: item.label,
          severity: item.severity,
        })),
      },
      fullInterpretation: input.composed.fullInterpretation as unknown as Prisma.InputJsonValue,
      generatedById: input.generatedById,
      overallImpression: input.composed.overallImpression,
      patientId: ecgCase.patientId,
      primaryDiagnosis: input.composed.primaryDiagnosis,
      recommendations: {
        create: input.composed.recommendations.map((item) => ({
          action: item.action,
          category: item.category,
          priority: item.priority,
          rationale: item.rationale,
        })),
      },
      reportGroupId: input.reportGroupId ?? randomUUID(),
      riskLevel: input.composed.riskLevel,
      severity: input.composed.severity,
      sourceEngineVersion: AI_REPORT_GENERATOR_VERSION,
      status: input.status,
      versionNumber: input.versionNumber,
    },
    include: {
      explanations: true,
      findings: true,
      recommendations: true,
    },
  });

  return report;
}

export function serializeClinicalGeneratedReport(
  report: Awaited<ReturnType<typeof getClinicalGeneratedReport>>,
): SerializedClinicalGeneratedReport {
  if (!report) throw new AppError(404, "Clinical generated report not found.", "REPORT_NOT_FOUND");
  return {
    acquisitionQuality: report.acquisitionQuality,
    aiConfidence: report.aiConfidence,
    caseId: report.caseId,
    clinicalFlags: report.clinicalFlags,
    clinicalIndication: report.clinicalIndication ?? undefined,
    clinicalUrgency: report.clinicalUrgency,
    createdAt: report.createdAt.toISOString(),
    emergencyWarning: report.emergencyWarning ?? undefined,
    executiveSummary: report.executiveSummary as SerializedClinicalGeneratedReport["executiveSummary"],
    explanations: report.explanations.map((item) => ({
      clinicalReferences: item.clinicalReferences,
      findingCode: item.findingCode ?? undefined,
      howText: item.howText,
      supportingEvidence: item.supportingEvidence,
      whyText: item.whyText,
    })),
    findings: report.findings.map((item) => ({
      category: item.category,
      code: item.code,
      confidence: item.confidence ?? undefined,
      evidence: (item.evidence as Array<{ feature: string; value: string }> | null) ?? undefined,
      label: item.label,
      severity: item.severity,
    })),
    fullInterpretation: report.fullInterpretation as SerializedClinicalGeneratedReport["fullInterpretation"],
    generatedById: report.generatedById ?? undefined,
    id: report.id,
    overallImpression: report.overallImpression,
    patientId: report.patientId,
    primaryDiagnosis: report.primaryDiagnosis,
    recommendations: report.recommendations.map((item) => ({
      action: item.action,
      category: item.category,
      priority: item.priority,
      rationale: item.rationale ?? undefined,
    })),
    reportGroupId: report.reportGroupId,
    riskLevel: report.riskLevel,
    severity: report.severity,
    sourceEngineVersion: report.sourceEngineVersion,
    status: report.status,
    updatedAt: report.updatedAt.toISOString(),
    versionNumber: report.versionNumber,
  };
}

export async function getClinicalGeneratedReport(reportId: string) {
  return prisma.clinicalGeneratedReport.findUnique({
    include: {
      explanations: { orderBy: { createdAt: "asc" } },
      findings: { orderBy: { createdAt: "asc" } },
      recommendations: { orderBy: { createdAt: "asc" } },
    },
    where: { id: reportId },
  });
}

export async function generateClinicalReport(input: {
  caseId: string;
  clinicalIndication?: string;
  generatedById?: string;
}) {
  const ecgCase = await loadCaseContext(input.caseId);
  const [measurement, dbMeasurement, analysis] = await Promise.all([
    resolveCaseMeasurement(input.caseId),
    prisma.eCGMeasurement.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId: input.caseId } }),
    prisma.aIAnalysis.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId: input.caseId } }),
  ]);

  const resolvedMeasurement =
    measurement.confidence > 0
      ? measurement
      : measurementFromDatabase(ecgCase, dbMeasurement, analysis);

  const composed = composeAiClinicalReport({
    analysis,
    clinicalIndication: input.clinicalIndication,
    dbMeasurement,
    ecgCase,
    measurement: resolvedMeasurement,
    patient: ecgCase.patient,
  });

  const report = await persistComposedReport({
    caseId: input.caseId,
    clinicalIndication: input.clinicalIndication,
    composed,
    generatedById: input.generatedById,
    status: "GENERATED",
    versionNumber: 1,
  });

  return { composed, report };
}

export async function regenerateClinicalReport(
  reportId: string,
  generatedById?: string,
  clinicalIndication?: string,
) {
  const existing = await getClinicalGeneratedReport(reportId);
  if (!existing) throw new AppError(404, "Clinical generated report not found.", "REPORT_NOT_FOUND");

  const latestVersion = await prisma.clinicalGeneratedReport.findFirst({
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
    where: { reportGroupId: existing.reportGroupId },
  });
  const nextVersion = (latestVersion?.versionNumber ?? existing.versionNumber) + 1;

  const ecgCase = await loadCaseContext(existing.caseId);
  const [measurement, dbMeasurement, analysis] = await Promise.all([
    resolveCaseMeasurement(existing.caseId),
    prisma.eCGMeasurement.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId: existing.caseId } }),
    prisma.aIAnalysis.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId: existing.caseId } }),
  ]);

  const resolvedMeasurement =
    measurement.confidence > 0
      ? measurement
      : measurementFromDatabase(ecgCase, dbMeasurement, analysis);

  const composed = composeAiClinicalReport({
    analysis,
    clinicalIndication: clinicalIndication ?? existing.clinicalIndication ?? undefined,
    dbMeasurement,
    ecgCase,
    measurement: resolvedMeasurement,
    patient: ecgCase.patient,
  });

  const report = await persistComposedReport({
    caseId: existing.caseId,
    clinicalIndication: clinicalIndication ?? existing.clinicalIndication ?? undefined,
    composed,
    generatedById,
    reportGroupId: existing.reportGroupId,
    status: "REGENERATED",
    versionNumber: nextVersion,
  });

  return { composed, report };
}

export async function listClinicalGeneratedReportHistory(reportId: string) {
  const report = await getClinicalGeneratedReport(reportId);
  if (!report) throw new AppError(404, "Clinical generated report not found.", "REPORT_NOT_FOUND");

  const versions = await prisma.clinicalGeneratedReport.findMany({
    orderBy: { versionNumber: "asc" },
    select: {
      createdAt: true,
      generatedById: true,
      id: true,
      primaryDiagnosis: true,
      riskLevel: true,
      severity: true,
      status: true,
      versionNumber: true,
    },
    where: { reportGroupId: report.reportGroupId },
  });

  return {
    currentReportId: report.id,
    reportGroupId: report.reportGroupId,
    versions: versions.map((version) => ({
      createdAt: version.createdAt.toISOString(),
      generatedById: version.generatedById ?? undefined,
      id: version.id,
      primaryDiagnosis: version.primaryDiagnosis,
      riskLevel: version.riskLevel,
      severity: version.severity,
      status: version.status,
      versionNumber: version.versionNumber,
    })),
  };
}
