import type { ECGFollowUpStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import type { TrendSnapshotDto } from "../types";
import { clinicalSignificanceFromTrends, summarizeTrends } from "./trend-analysis.service";

export function buildFollowUpSummary(trends: TrendSnapshotDto[], comparedWithDate?: string): string {
  const prefix = comparedWithDate
    ? `Compared with previous ECG (${comparedWithDate}): `
    : "Compared with previous ECG: ";
  const body = summarizeTrends(trends);
  const significance = clinicalSignificanceFromTrends(trends);

  const lines = [prefix + body];
  if (significance.includes("progression") || significance.includes("meaningful")) {
    lines.push("Recommend clinical follow-up.");
  }
  if (trends.some((t) => t.trendType === "QT_PROLONGATION" || t.trendType === "QTC_PROLONGATION") && trends.some((t) => t.direction === "WORSENING")) {
    lines.push("Progressive QT prolongation noted.");
  }
  if (trends.some((t) => t.trendType === "ST_IMPROVEMENT")) {
    lines.push("Improved ST elevation pattern.");
  }
  if (trends.some((t) => t.trendType === "AF_BURDEN")) {
    lines.push("Persistent atrial fibrillation.");
  }

  return lines.join(" ");
}

export async function persistFollowUp(input: {
  patientId: string;
  caseId?: string;
  timelineId?: string;
  createdById: string;
  recommendation: string;
  summary: string;
  status?: ECGFollowUpStatus;
  metadata?: Record<string, unknown>;
}) {
  return prisma.eCGFollowUp.create({
    data: {
      patientId: input.patientId,
      caseId: input.caseId,
      timelineId: input.timelineId,
      recommendation: input.recommendation,
      summary: input.summary,
      status: input.status ?? "RECOMMENDED",
      createdById: input.createdById,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function generateFollowUpFromComparison(input: {
  patientId: string;
  caseId: string;
  timelineId?: string;
  createdById: string;
  trends: TrendSnapshotDto[];
  previousAcquisitionDate?: Date;
}) {
  const summary = buildFollowUpSummary(input.trends, input.previousAcquisitionDate?.toISOString());
  const needsFollowUp = input.trends.some((t) => t.direction === "WORSENING" || t.direction === "NEW");

  if (!needsFollowUp) {
    return null;
  }

  return persistFollowUp({
    patientId: input.patientId,
    caseId: input.caseId,
    timelineId: input.timelineId,
    createdById: input.createdById,
    recommendation: "Recommend clinical follow-up based on serial ECG comparison.",
    summary,
    metadata: { trendCount: input.trends.length, engine: "sprint63-ecg-longitudinal-timeline-v1" },
  });
}
