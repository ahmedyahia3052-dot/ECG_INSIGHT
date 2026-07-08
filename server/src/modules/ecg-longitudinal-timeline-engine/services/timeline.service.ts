import type { ECGCase, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { AppError } from "../../../middleware/error";
import { serializeTimelineEntry } from "../dto/timeline.dto";
import type { CaseNavigationDto, TimelineEntryDto } from "../types";
import { logLongitudinalAudit } from "./audit.service";

const caseSignalsInclude = {
  analyses: { orderBy: { createdAt: "desc" as const }, take: 1 },
  measurements: { orderBy: { createdAt: "desc" as const }, take: 1 },
  reports: { orderBy: { createdAt: "desc" as const }, take: 1 },
  caseAttachments: { orderBy: { createdAt: "desc" as const } },
  patient: { select: { organizationId: true, departmentId: true } },
} satisfies Prisma.ECGCaseInclude;

export type CaseSignals = Prisma.ECGCaseGetPayload<{ include: typeof caseSignalsInclude }>;

export async function resolveCaseWithSignals(caseRef: string): Promise<CaseSignals> {
  const ecgCase = await prisma.eCGCase.findFirst({
    include: caseSignalsInclude,
    where: { OR: [{ id: caseRef }, { caseId: caseRef }, { caseNumber: caseRef }] },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return ecgCase;
}

async function resolveBranchId(organizationId: string | null | undefined, departmentId: string | null | undefined) {
  if (!organizationId || !departmentId) return null;
  const branch = await prisma.organizationBranch.findFirst({
    where: { organizationId, departmentId },
    select: { id: true },
  });
  return branch?.id ?? null;
}

function diagnosisFromCase(ecgCase: CaseSignals) {
  const analysis = ecgCase.analyses[0];
  return analysis?.diagnosis ?? ecgCase.finalDiagnosis ?? ecgCase.doctorDiagnosis ?? ecgCase.aiDiagnosis ?? null;
}

function interpretationFromCase(ecgCase: CaseSignals) {
  const analysis = ecgCase.analyses[0];
  return analysis?.interpretation ?? ecgCase.clinicalComments ?? ecgCase.clinicalNotes ?? null;
}

function measurementsFromCase(ecgCase: CaseSignals): Prisma.InputJsonValue {
  const measurement = ecgCase.measurements[0];
  if (!measurement) {
    return {
      heartRate: ecgCase.heartRate,
      prInterval: ecgCase.prInterval,
      qrsDuration: ecgCase.qrsDuration,
      qtInterval: ecgCase.qtInterval,
      qtcInterval: ecgCase.qtcInterval,
      source: "case_fields",
    };
  }
  return {
    heartRate: measurement.heartRate,
    prInterval: measurement.prInterval,
    qrsDuration: measurement.qrsDuration,
    qtInterval: measurement.qtInterval,
    qtcInterval: measurement.qtcInterval,
    electricalAxis: measurement.electricalAxis,
    stDeviation: measurement.stDeviation,
    rhythmRegularity: measurement.rhythmRegularity,
    signalQuality: measurement.signalQuality,
    detailsJson: measurement.detailsJson,
    source: "ecg_measurement",
  };
}

function attachmentsFromCase(ecgCase: CaseSignals): Prisma.InputJsonValue {
  return ecgCase.caseAttachments.map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    category: attachment.category,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    storagePath: attachment.storagePath,
    createdAt: attachment.createdAt.toISOString(),
  }));
}

export async function upsertTimelineEntryForCase(ecgCase: CaseSignals, sequenceNumber: number) {
  const measurement = ecgCase.measurements[0];
  const analysis = ecgCase.analyses[0];
  const report = ecgCase.reports[0];
  const organizationId = ecgCase.patient.organizationId;
  const branchId = await resolveBranchId(organizationId, ecgCase.patient.departmentId);
  const physicianId = ecgCase.reviewedById ?? ecgCase.assignedDoctorId ?? ecgCase.uploadedById;

  const data = {
    patientId: ecgCase.patientId,
    organizationId,
    branchId,
    physicianId,
    studyDate: ecgCase.uploadDate,
    acquisitionDate: ecgCase.acquisitionDate,
    reportUuid: report?.reportUuid ?? null,
    diagnosis: diagnosisFromCase(ecgCase),
    interpretation: interpretationFromCase(ecgCase),
    aiConfidence: analysis?.confidenceScore ?? ecgCase.confidenceScore ?? null,
    heartRate: measurement?.heartRate ?? ecgCase.heartRate ?? null,
    prInterval: measurement?.prInterval ?? ecgCase.prInterval ?? null,
    qrsDuration: measurement?.qrsDuration ?? ecgCase.qrsDuration ?? null,
    qtInterval: measurement?.qtInterval ?? ecgCase.qtInterval ?? null,
    qtcInterval: measurement?.qtcInterval ?? ecgCase.qtcInterval ?? null,
    axis: measurement?.electricalAxis ?? null,
    rhythm: analysis?.rhythm ?? ecgCase.rhythm ?? null,
    measurements: measurementsFromCase(ecgCase),
    attachments: attachmentsFromCase(ecgCase),
    sequenceNumber,
  };

  return prisma.eCGTimeline.upsert({
    create: { caseId: ecgCase.id, ...data },
    update: data,
    where: { caseId: ecgCase.id },
  });
}

export async function syncPatientTimeline(patientId: string) {
  const cases = await prisma.eCGCase.findMany({
    include: caseSignalsInclude,
    orderBy: { acquisitionDate: "asc" },
    where: { patientId },
  });

  const entries = [];
  for (let index = 0; index < cases.length; index += 1) {
    entries.push(await upsertTimelineEntryForCase(cases[index]!, index + 1));
  }
  return entries;
}

export async function getPatientTimeline(input: {
  patientId: string;
  limit: number;
  offset: number;
  sync?: boolean;
  actorId: string;
  organizationId?: string | null;
}) {
  if (input.sync) {
    await syncPatientTimeline(input.patientId);
  }

  const [total, entries] = await Promise.all([
    prisma.eCGTimeline.count({ where: { patientId: input.patientId } }),
    prisma.eCGTimeline.findMany({
      orderBy: [{ acquisitionDate: "asc" }, { sequenceNumber: "asc" }],
      skip: input.offset,
      take: input.limit,
      where: { patientId: input.patientId },
    }),
  ]);

  await logLongitudinalAudit({
    action: "ECG_TIMELINE_VIEWED",
    actorId: input.actorId,
    patientId: input.patientId,
    organizationId: input.organizationId,
    message: "Patient ECG longitudinal timeline viewed.",
    metadata: { total, limit: input.limit, offset: input.offset },
  });

  return {
    patientId: input.patientId,
    total,
    limit: input.limit,
    offset: input.offset,
    timeline: entries.map(serializeTimelineEntry),
  };
}

export async function getCaseChronologicalHistory(input: {
  caseRef: string;
  actorId: string;
  organizationId?: string | null;
}) {
  const ecgCase = await resolveCaseWithSignals(input.caseRef);
  await syncPatientTimeline(ecgCase.patientId);

  const timeline = await prisma.eCGTimeline.findMany({
    orderBy: [{ acquisitionDate: "asc" }, { sequenceNumber: "asc" }],
    where: { patientId: ecgCase.patientId },
  });

  await logLongitudinalAudit({
    action: "ECG_HISTORICAL_DATA_ACCESSED",
    actorId: input.actorId,
    caseId: ecgCase.id,
    patientId: ecgCase.patientId,
    organizationId: input.organizationId,
    message: "Chronological ECG case history accessed.",
    metadata: { entryCount: timeline.length },
  });

  return {
    caseId: ecgCase.id,
    patientId: ecgCase.patientId,
    currentSequence: timeline.find((entry) => entry.caseId === ecgCase.id)?.sequenceNumber ?? null,
    history: timeline.map(serializeTimelineEntry),
  };
}

async function navigationEntry(ecgCase: ECGCase, timelineEntry: TimelineEntryDto | null): Promise<CaseNavigationDto> {
  return {
    caseId: ecgCase.id,
    patientId: ecgCase.patientId,
    acquisitionDate: ecgCase.acquisitionDate.toISOString(),
    sequenceNumber: timelineEntry?.sequenceNumber ?? 0,
    timelineEntry,
  };
}

export async function getAdjacentCase(input: {
  caseRef: string;
  direction: "previous" | "next";
  actorId: string;
  organizationId?: string | null;
}) {
  const ecgCase = await resolveCaseWithSignals(input.caseRef);
  await syncPatientTimeline(ecgCase.patientId);

  const currentEntry = await prisma.eCGTimeline.findUnique({ where: { caseId: ecgCase.id } });
  if (!currentEntry) {
    throw new AppError(404, "Timeline entry not found for case.", "TIMELINE_ENTRY_NOT_FOUND");
  }

  const neighbor = await prisma.eCGTimeline.findFirst({
    orderBy: { acquisitionDate: input.direction === "previous" ? "desc" : "asc" },
    where: {
      patientId: ecgCase.patientId,
      acquisitionDate:
        input.direction === "previous"
          ? { lt: currentEntry.acquisitionDate }
          : { gt: currentEntry.acquisitionDate },
    },
  });

  await logLongitudinalAudit({
    action: "ECG_HISTORICAL_DATA_ACCESSED",
    actorId: input.actorId,
    caseId: ecgCase.id,
    patientId: ecgCase.patientId,
    organizationId: input.organizationId,
    message: input.direction === "previous" ? "Previous ECG accessed." : "Next ECG accessed.",
    metadata: { neighborCaseId: neighbor?.caseId ?? null },
  });

  if (!neighbor) {
    return { caseId: ecgCase.id, [input.direction]: null };
  }

  const neighborCase = await prisma.eCGCase.findUnique({ where: { id: neighbor.caseId } });
  if (!neighborCase) {
    return { caseId: ecgCase.id, [input.direction]: null };
  }

  return {
    caseId: ecgCase.id,
    [input.direction]: await navigationEntry(neighborCase, serializeTimelineEntry(neighbor)),
  };
}
