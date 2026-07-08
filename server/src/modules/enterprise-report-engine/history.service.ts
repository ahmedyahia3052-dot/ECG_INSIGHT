import type { ReportExportFormat, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export async function recordReportHistory(
  reportId: string,
  action: string,
  actorId?: string,
  details?: string,
  metadata?: Record<string, unknown>,
) {
  return prisma.reportHistoryEvent.create({
    data: {
      action,
      actorId,
      details,
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      reportId,
    },
  });
}

export async function recordReportExport(
  reportId: string,
  format: ReportExportFormat,
  exportedById: string,
  metadata?: Record<string, unknown>,
) {
  const [exportLog] = await Promise.all([
    prisma.reportExportLog.create({
      data: {
        exportedById,
        format,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        reportId,
      },
    }),
    recordReportHistory(reportId, "exported", exportedById, `Exported as ${format}`, metadata),
    prisma.auditLog.create({
      data: {
        action: format === "PRINT" ? "REPORT_PRINTED" : "REPORT_EXPORTED",
        actorId: exportedById,
        entityId: reportId,
        entityType: "ClinicalReport",
        message: `Clinical report exported as ${format}.`,
      },
    }),
  ]);
  return exportLog;
}

export async function listReportHistory(reportId: string) {
  const [events, exports, versions] = await Promise.all([
    prisma.reportHistoryEvent.findMany({
      include: { actor: { select: { email: true, id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      where: { reportId },
    }),
    prisma.reportExportLog.findMany({
      include: { exportedBy: { select: { email: true, id: true, name: true } } },
      orderBy: { exportedAt: "desc" },
      where: { reportId },
    }),
    prisma.reportVersion.findMany({
      include: { author: { select: { email: true, id: true, name: true } } },
      orderBy: { versionNumber: "desc" },
      where: { reportId },
    }),
  ]);
  return { events, exports, versions };
}
