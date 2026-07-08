import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { ConfidenceLevel, MedicalIntelligenceReport } from "./types";
import type { MedicalConfidenceLevel as PrismaConfidenceLevel, MedicalReportSeverity, MedicalReportUrgency } from "@prisma/client";

function toPrismaSeverity(severity: string): MedicalReportSeverity {
  return severity.toUpperCase() as MedicalReportSeverity;
}

function toPrismaUrgency(urgency: string): MedicalReportUrgency {
  const map: Record<string, MedicalReportUrgency> = {
    routine: "ROUTINE",
    urgent: "URGENT",
    emergent: "EMERGENT",
    critical: "CRITICAL",
  };
  return map[urgency] ?? "ROUTINE";
}

function toPrismaConfidence(level: ConfidenceLevel): PrismaConfidenceLevel {
  return level.toUpperCase() as PrismaConfidenceLevel;
}

export async function persistMedicalIntelligenceReport(
  report: MedicalIntelligenceReport,
  opts: { caseId?: string; patientId?: string; evaluatedById: string },
) {
  const record = await prisma.medicalIntelligenceReport.create({
    data: {
      caseId: opts.caseId ?? null,
      patientId: opts.patientId ?? null,
      evaluatedById: opts.evaluatedById,
      engineVersion: report.version,
      engineId: report.engineId,
      primaryDiagnosisCode: report.primaryDiagnosis.code,
      primaryDiagnosisLabel: report.primaryDiagnosis.label,
      overallSeverity: toPrismaSeverity(report.overallSeverity),
      overallUrgency: toPrismaUrgency(report.overallUrgency),
      overallConfidenceLevel: toPrismaConfidence(report.overallConfidence.level),
      overallConfidenceScore: report.overallConfidence.score,
      reportJson: report as unknown as Prisma.InputJsonValue,
      findingsCount: report.findings.length,
      criticalFindingsCount: report.criticalFindings.length,
      explainabilitySummary: report.explainabilitySummary,
    },
  });

  if (report.findings.length) {
    await prisma.medicalDiagnosisFinding.createMany({
      data: report.findings.map((finding) => ({
        reportId: record.id,
        diagnosisCode: finding.code,
        diagnosisLabel: finding.label,
        category: finding.category,
        severity: toPrismaSeverity(finding.severity),
        urgency: toPrismaUrgency(finding.urgency),
        confidenceLevel: toPrismaConfidence(finding.confidence.level),
        confidenceScore: finding.confidence.score,
        explainabilityJson: finding.explainability as unknown as Prisma.InputJsonValue,
        differentialJson: finding.differentialDiagnosis as unknown as Prisma.InputJsonValue,
      })),
    });
  }

  return record;
}

export async function getMedicalIntelligenceReport(reportId: string) {
  return prisma.medicalIntelligenceReport.findUnique({
    where: { id: reportId },
    include: { findings: true },
  });
}

export async function listMedicalIntelligenceReports(caseId: string, limit = 20) {
  return prisma.medicalIntelligenceReport.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      caseId: true,
      createdAt: true,
      criticalFindingsCount: true,
      engineId: true,
      engineVersion: true,
      evaluatedById: true,
      explainabilitySummary: true,
      findingsCount: true,
      id: true,
      overallConfidenceLevel: true,
      overallConfidenceScore: true,
      overallSeverity: true,
      overallUrgency: true,
      patientId: true,
      primaryDiagnosisCode: true,
      primaryDiagnosisLabel: true,
    },
    take: limit,
    where: { caseId },
  });
}

export async function seedKnowledgeBaseEntries() {
  const { KNOWLEDGE_BASE } = await import("./knowledge-base/index.js");
  let seeded = 0;
  for (const entry of KNOWLEDGE_BASE) {
    const existing = await prisma.medicalKnowledgeBaseEntry.findUnique({
      where: { code: entry.code },
    });
    if (existing) continue;
    await prisma.medicalKnowledgeBaseEntry.create({
      data: {
        code: entry.code,
        label: entry.label,
        category: entry.category,
        severity: entry.severity,
        urgency: entry.urgency,
        diagnosticCriteria: entry.diagnosticCriteria,
        ecgCharacteristics: entry.ecgCharacteristics,
        measurements: entry.measurements,
        differentialDiagnosis: entry.differentialDiagnosis,
        pitfalls: entry.pitfalls,
        clinicalNotes: entry.clinicalNotes,
        guidelineReferences: entry.guidelineReferences as unknown as Prisma.InputJsonValue,
      },
    });
    seeded += 1;
  }
  return { seeded, total: KNOWLEDGE_BASE.length };
}
