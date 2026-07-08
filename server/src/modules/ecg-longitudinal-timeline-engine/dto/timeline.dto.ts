import type { ECGTimeline } from "@prisma/client";
import type { TimelineEntryDto } from "../types";

export function serializeTimelineEntry(entry: ECGTimeline): TimelineEntryDto {
  return {
    id: entry.id,
    patientId: entry.patientId,
    caseId: entry.caseId,
    organizationId: entry.organizationId,
    branchId: entry.branchId,
    physicianId: entry.physicianId,
    studyDate: entry.studyDate.toISOString(),
    acquisitionDate: entry.acquisitionDate.toISOString(),
    reportUuid: entry.reportUuid,
    diagnosis: entry.diagnosis,
    interpretation: entry.interpretation,
    aiConfidence: entry.aiConfidence,
    heartRate: entry.heartRate,
    prInterval: entry.prInterval,
    qrsDuration: entry.qrsDuration,
    qtInterval: entry.qtInterval,
    qtcInterval: entry.qtcInterval,
    axis: entry.axis,
    rhythm: entry.rhythm,
    measurements: entry.measurements,
    attachments: entry.attachments,
    sequenceNumber: entry.sequenceNumber,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}
