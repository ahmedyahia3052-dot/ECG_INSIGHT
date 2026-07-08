import type {
  CaseAttachmentCategory,
  CaseHistoryEventType,
  CaseManagementStatus,
  ECGCase,
  ECGCaseStatus,
  Prisma,
} from "@prisma/client";
import type { z } from "zod";
import type { caseManagementUpdateSchema } from "./schemas";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import {
  fromApiCaseStatus,
  fromApiPriority,
  serializeCase,
} from "../../utils/clinical";
import { assertCaseEditable, assertCaseStatusTransition, statusTimestampPatch } from "../../cases/state-machine";
import { detectDuplicateCases } from "./duplicate-detection";
import type { CaseSnapshotFields } from "./types";
import {
  managementStatusFromCaseStatus,
  serializeCaseAttachment,
  serializeCaseAudit,
  serializeCaseComment,
  serializeCaseHistory,
  serializeCaseVersion,
} from "./types";

const caseInclude = {
  assignedDoctor: { select: { email: true, id: true, name: true, role: true } },
  files: true,
  patient: true,
  reviewedBy: { select: { email: true, id: true, name: true, role: true } },
  reviewer: { select: { email: true, id: true, name: true, role: true } },
  uploadedBy: { select: { email: true, id: true, name: true, role: true } },
} satisfies Prisma.ECGCaseInclude;

function severityFromApi(severity?: "abnormal" | "critical" | "normal") {
  if (severity === "critical") return "CRITICAL" as const;
  if (severity === "abnormal") return "ABNORMAL" as const;
  return "NORMAL" as const;
}

function fromApiManagementStatus(status: string): CaseManagementStatus {
  const map: Record<string, CaseManagementStatus> = {
    archived: "ARCHIVED",
    confirmed: "CONFIRMED",
    draft: "DRAFT",
    pending_review: "PENDING_REVIEW",
    reviewed: "REVIEWED",
    signed: "SIGNED",
  };
  const resolved = map[status];
  if (!resolved) throw new AppError(400, "Invalid case management status.", "INVALID_MANAGEMENT_STATUS");
  return resolved;
}

function fromApiAttachmentCategory(category: string): CaseAttachmentCategory {
  const map: Record<string, CaseAttachmentCategory> = {
    clinical_document: "CLINICAL_DOCUMENT",
    ecg_image: "ECG_IMAGE",
    other: "OTHER",
    pdf: "PDF",
    report: "REPORT",
  };
  return map[category] ?? "OTHER";
}

export async function findCaseForManagement(caseRef: string) {
  return prisma.eCGCase.findFirst({
    include: caseInclude,
    where: { OR: [{ id: caseRef }, { caseId: caseRef }, { caseNumber: caseRef }] },
  });
}

export async function recordCaseHistory(input: {
  actorId?: string;
  caseId: string;
  eventType: CaseHistoryEventType;
  fromStatus?: CaseManagementStatus | null;
  payload?: Prisma.InputJsonValue;
  summary?: string;
  title: string;
  toStatus?: CaseManagementStatus | null;
}) {
  try {
    return await prisma.caseHistory.create({
      data: {
        actorId: input.actorId,
        caseId: input.caseId,
        eventType: input.eventType,
        fromStatus: input.fromStatus ?? undefined,
        payload: input.payload,
        summary: input.summary,
        title: input.title,
        toStatus: input.toStatus ?? undefined,
      },
    });
  } catch {
    return null;
  }
}

export async function recordCaseAudit(input: {
  action: string;
  actorId: string;
  caseId: string;
  entityId?: string;
  entityType?: string;
  ipAddress?: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  oldValue?: Prisma.InputJsonValue;
}) {
  try {
    const entry = await prisma.caseAudit.create({
      data: {
        action: input.action,
        actorId: input.actorId,
        caseId: input.caseId,
        entityId: input.entityId,
        entityType: input.entityType ?? "Case",
        ipAddress: input.ipAddress,
        message: input.message,
        metadata: input.metadata,
        newValue: input.newValue,
        oldValue: input.oldValue,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: input.action as Prisma.AuditLogCreateInput["action"],
        actor: { connect: { id: input.actorId } },
        case: { connect: { id: input.caseId } },
        message: input.message,
        metadata: input.metadata,
        newValue: input.newValue,
        oldValue: input.oldValue,
      },
    }).catch(() => undefined);
    return entry;
  } catch {
    return null;
  }
}

function snapshotFromCase(ecgCase: ECGCase): CaseSnapshotFields {
  return {
    assignedDoctorId: ecgCase.assignedDoctorId,
    clinicalComments: ecgCase.clinicalComments,
    clinicalNotes: ecgCase.clinicalNotes,
    doctorDiagnosis: ecgCase.doctorDiagnosis,
    ecgType: ecgCase.ecgType,
    finalDiagnosis: ecgCase.finalDiagnosis,
    heartRate: ecgCase.heartRate,
    managementStatus: ecgCase.managementStatus,
    priority: ecgCase.priority,
    recommendations: ecgCase.recommendations,
    reviewerId: ecgCase.reviewerId,
    rhythm: ecgCase.rhythm,
    severity: ecgCase.severity,
    status: ecgCase.status,
    tags: ecgCase.tags,
  };
}

async function nextCaseVersionNumber(caseId: string) {
  const latest = await prisma.caseVersion.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
    where: { caseId },
  });
  return (latest?.version ?? 0) + 1;
}

export async function createCaseVersion(caseId: string, actorId: string, reason?: string) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  const version = await prisma.caseVersion.create({
    data: {
      caseId,
      createdById: actorId,
      reason,
      snapshot: snapshotFromCase(ecgCase),
      version: await nextCaseVersionNumber(caseId),
    },
  });
  await recordCaseHistory({
    actorId,
    caseId,
    eventType: "VERSION_CREATED",
    payload: { reason, version: version.version },
    title: `Version ${version.version} created`,
  });
  await recordCaseAudit({
    action: "CASE_MANAGEMENT_VERSION_CREATED",
    actorId,
    caseId,
    entityId: version.id,
    message: `Case version ${version.version} created.`,
    metadata: { reason, version: version.version },
  });
  return serializeCaseVersion(version);
}

export async function listCaseHistory(caseId: string, limit = 100, offset = 0) {
  const [total, history] = await Promise.all([
    prisma.caseHistory.count({ where: { caseId } }),
    prisma.caseHistory.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      where: { caseId },
    }),
  ]);
  return { history: history.map(serializeCaseHistory), offset, total };
}

export async function listCaseAudit(caseId: string, limit = 100, offset = 0) {
  const [total, audit] = await Promise.all([
    prisma.caseAudit.count({ where: { caseId } }),
    prisma.caseAudit.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      where: { caseId },
    }),
  ]);
  return { audit: audit.map(serializeCaseAudit), offset, total };
}

export async function listCaseVersions(caseId: string) {
  const versions = await prisma.caseVersion.findMany({
    orderBy: { version: "desc" },
    where: { caseId },
  });
  return versions.map(serializeCaseVersion);
}

export async function listCaseComments(caseId: string) {
  const comments = await prisma.caseComment.findMany({
    orderBy: { createdAt: "asc" },
    where: { caseId },
  });
  return comments.map(serializeCaseComment);
}

export async function listCaseAttachments(caseId: string) {
  const attachments = await prisma.caseAttachment.findMany({
    orderBy: { createdAt: "desc" },
    where: { caseId },
  });
  return attachments.map(serializeCaseAttachment);
}

export async function addCaseComment(input: {
  actorId: string;
  body: string;
  caseId: string;
  isClinical?: boolean;
  mentions?: string[];
  parentId?: string;
}) {
  const comment = await prisma.caseComment.create({
    data: {
      authorId: input.actorId,
      body: input.body,
      caseId: input.caseId,
      isClinical: input.isClinical ?? false,
      mentions: input.mentions ?? [],
      parentId: input.parentId,
    },
  });
  await recordCaseHistory({
    actorId: input.actorId,
    caseId: input.caseId,
    eventType: input.isClinical ? "CLINICAL_NOTE_ADDED" : "COMMENT_ADDED",
    payload: { commentId: comment.id, isClinical: comment.isClinical },
    title: input.isClinical ? "Clinical note added" : "Comment added",
  });
  await recordCaseAudit({
    action: "CASE_MANAGEMENT_COMMENT_ADDED",
    actorId: input.actorId,
    caseId: input.caseId,
    entityId: comment.id,
    message: input.isClinical ? "Clinical note added to case." : "Comment added to case.",
    newValue: { body: comment.body, isClinical: comment.isClinical },
  });
  return serializeCaseComment(comment);
}

export async function addCaseAttachment(input: {
  actorId: string;
  caseId: string;
  category?: string;
  checksum?: string;
  fileName: string;
  metadata?: Prisma.InputJsonValue;
  mimeType: string;
  sizeBytes?: number;
  storagePath: string;
}) {
  const attachment = await prisma.caseAttachment.create({
    data: {
      caseId: input.caseId,
      category: fromApiAttachmentCategory(input.category ?? "other"),
      checksum: input.checksum,
      fileName: input.fileName,
      metadata: input.metadata,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      uploadedById: input.actorId,
    },
  });
  await recordCaseHistory({
    actorId: input.actorId,
    caseId: input.caseId,
    eventType: "ATTACHMENT_ADDED",
    payload: { attachmentId: attachment.id, category: attachment.category, fileName: attachment.fileName },
    title: "Attachment added",
  });
  await recordCaseAudit({
    action: "CASE_MANAGEMENT_ATTACHMENT_ADDED",
    actorId: input.actorId,
    caseId: input.caseId,
    entityId: attachment.id,
    message: `Attachment ${attachment.fileName} added.`,
    newValue: { category: attachment.category, fileName: attachment.fileName },
  });
  return serializeCaseAttachment(attachment);
}

export async function assignReviewer(caseId: string, actorId: string, reviewerId: string) {
  const previous = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!previous) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertCaseEditable(previous);
  const ecgCase = await prisma.eCGCase.update({
    data: { reviewerId },
    include: caseInclude,
    where: { id: caseId },
  });
  await recordCaseHistory({
    actorId,
    caseId,
    eventType: "REVIEWER_ASSIGNED",
    payload: { previousReviewerId: previous.reviewerId, reviewerId },
    title: "Reviewer assigned",
  });
  await recordCaseAudit({
    action: "CASE_ASSIGNED",
    actorId,
    caseId,
    message: "Reviewer assigned to case.",
    newValue: { reviewerId },
    oldValue: { reviewerId: previous.reviewerId },
  });
  return serializeCase(ecgCase);
}

export async function acquireCaseLock(caseId: string, actorId: string, resource = "case", ttlMinutes = 30) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const blockingLock = await prisma.caseLock.findFirst({
    orderBy: { createdAt: "desc" },
    where: { caseId, resource, status: "ACTIVE", expiresAt: { gt: new Date() }, userId: { not: actorId } },
  });
  if (blockingLock) {
    throw new AppError(409, "Case is locked by another clinician.", "CASE_LOCKED");
  }
  await prisma.caseLock.updateMany({
    data: { releasedAt: new Date(), status: "RELEASED" },
    where: { caseId, resource, status: "ACTIVE", userId: actorId },
  });
  const lock = await prisma.caseLock.create({
    data: { caseId, expiresAt, resource, status: "ACTIVE", userId: actorId },
  });
  await recordCaseHistory({
    actorId,
    caseId,
    eventType: "LOCKED",
    payload: { expiresAt: expiresAt.toISOString(), resource },
    title: "Case locked",
  });
  await recordCaseAudit({
    action: "CASE_MANAGEMENT_LOCKED",
    actorId,
    caseId,
    entityId: lock.id,
    message: `Case lock acquired for ${resource}.`,
  });
  return lock;
}

export async function releaseCaseLock(caseId: string, actorId: string, resource = "case") {
  const lock = await prisma.caseLock.findFirst({
    orderBy: { createdAt: "desc" },
    where: { caseId, resource, status: "ACTIVE" },
  });
  if (!lock) return null;
  const released = await prisma.caseLock.update({
    data: { releasedAt: new Date(), status: "RELEASED" },
    where: { id: lock.id },
  });
  await recordCaseHistory({
    actorId,
    caseId,
    eventType: "UNLOCKED",
    payload: { resource },
    title: "Case unlocked",
  });
  await recordCaseAudit({
    action: "CASE_MANAGEMENT_UNLOCKED",
    actorId,
    caseId,
    entityId: released.id,
    message: `Case lock released for ${resource}.`,
  });
  return released;
}

export async function updateCaseTags(caseId: string, actorId: string, tags: string[]) {
  const previous = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!previous) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertCaseEditable(previous);
  const ecgCase = await prisma.eCGCase.update({
    data: { tags },
    include: caseInclude,
    where: { id: caseId },
  });
  await recordCaseHistory({
    actorId,
    caseId,
    eventType: "TAG_ADDED",
    payload: { tags },
    title: "Case tags updated",
  });
  return serializeCase(ecgCase);
}

type CaseManagementUpdateBody = z.infer<typeof caseManagementUpdateSchema>;

export async function updateManagedCase(caseRef: string, actorId: string, body: CaseManagementUpdateBody) {
  const previous = await findCaseForManagement(caseRef);
  if (!previous) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertCaseEditable(previous);

  const nextStatus = body.status ? fromApiCaseStatus(body.status) : undefined;
  if (nextStatus) assertCaseStatusTransition(previous.status, nextStatus);

  const nextManagementStatus = body.managementStatus
    ? fromApiManagementStatus(body.managementStatus)
    : nextStatus
      ? managementStatusFromCaseStatus(nextStatus)
      : undefined;

  await createCaseVersion(previous.id, actorId, "Automatic snapshot before update");

  const ecgCase = await prisma.eCGCase.update({
    data: {
      acquisitionDate: body.acquisitionDate,
      assignedDoctorId: body.assignedDoctorId,
      clinicalComments: body.clinicalComments,
      clinicalNotes: body.clinicalNotes,
      doctorDiagnosis: body.doctorDiagnosis,
      ecgType: body.ecgType,
      finalDiagnosis: body.finalDiagnosis,
      heartRate: body.heartRate,
      managementStatus: nextManagementStatus,
      priority: body.priority ? fromApiPriority(body.priority) : undefined,
      recommendations: body.recommendations,
      reviewerId: body.reviewerId,
      rhythm: body.rhythm,
      severity: body.severity ? severityFromApi(body.severity) : undefined,
      status: nextStatus,
      tags: body.tags,
      ...(nextStatus ? statusTimestampPatch(nextStatus, actorId) : {}),
    },
    include: caseInclude,
    where: { id: previous.id },
  });

  await recordCaseHistory({
    actorId,
    caseId: ecgCase.id,
    eventType: nextStatus || nextManagementStatus ? "STATUS_CHANGED" : "UPDATED",
    fromStatus: previous.managementStatus,
    payload: { fields: Object.keys(body) },
    title: "Case updated",
    toStatus: ecgCase.managementStatus,
  });
  await recordCaseAudit({
    action: nextStatus ? "CASE_STATUS_CHANGED" : "CASE_UPDATED",
    actorId,
    caseId: ecgCase.id,
    message: `Case ${ecgCase.caseNumber ?? ecgCase.caseId} updated.`,
    newValue: { managementStatus: ecgCase.managementStatus, status: ecgCase.status },
    oldValue: { managementStatus: previous.managementStatus, status: previous.status },
  });

  return serializeCase(ecgCase);
}

export async function archiveManagedCase(caseRef: string, actorId: string, reason?: string) {
  const previous = await findCaseForManagement(caseRef);
  if (!previous) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  if (previous.status === "ARCHIVED") {
    throw new AppError(409, "Case is already archived.", "CASE_ALREADY_ARCHIVED");
  }

  await createCaseVersion(previous.id, actorId, reason ?? "Archive snapshot");

  const ecgCase = await prisma.eCGCase.update({
    data: {
      archivedAt: new Date(),
      managementStatus: "ARCHIVED",
      status: "ARCHIVED",
    },
    include: caseInclude,
    where: { id: previous.id },
  });

  await recordCaseHistory({
    actorId,
    caseId: ecgCase.id,
    eventType: "ARCHIVED",
    fromStatus: previous.managementStatus,
    payload: { previousStatus: previous.status, reason },
    summary: reason,
    title: "Case archived",
    toStatus: "ARCHIVED",
  });
  await recordCaseAudit({
    action: "CASE_MANAGEMENT_ARCHIVED",
    actorId,
    caseId: ecgCase.id,
    message: `Case ${ecgCase.caseNumber ?? ecgCase.caseId} archived.`,
    metadata: { reason },
    newValue: { managementStatus: "ARCHIVED", status: "ARCHIVED" },
    oldValue: { managementStatus: previous.managementStatus, status: previous.status },
  });

  return serializeCase(ecgCase);
}

export async function restoreManagedCase(
  caseRef: string,
  actorId: string,
  input?: { managementStatus?: string; reason?: string; status?: ECGCaseStatus },
) {
  const previous = await findCaseForManagement(caseRef);
  if (!previous) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  if (previous.status !== "ARCHIVED" && previous.managementStatus !== "ARCHIVED") {
    throw new AppError(409, "Only archived cases can be restored.", "CASE_NOT_ARCHIVED");
  }

  const restoredStatus = input?.status ?? "REVIEWED";
  const restoredManagementStatus = input?.managementStatus
    ? fromApiManagementStatus(input.managementStatus)
    : managementStatusFromCaseStatus(restoredStatus);

  const ecgCase = await prisma.eCGCase.update({
    data: {
      archivedAt: null,
      managementStatus: restoredManagementStatus,
      restoredAt: new Date(),
      status: restoredStatus,
      ...statusTimestampPatch(restoredStatus, actorId),
    },
    include: caseInclude,
    where: { id: previous.id },
  });

  await recordCaseHistory({
    actorId,
    caseId: ecgCase.id,
    eventType: "RESTORED",
    fromStatus: "ARCHIVED",
    payload: { reason: input?.reason, restoredStatus },
    summary: input?.reason,
    title: "Case restored",
    toStatus: restoredManagementStatus,
  });
  await recordCaseAudit({
    action: "CASE_MANAGEMENT_RESTORED",
    actorId,
    caseId: ecgCase.id,
    message: `Case ${ecgCase.caseNumber ?? ecgCase.caseId} restored.`,
    metadata: { reason: input?.reason },
    newValue: { managementStatus: restoredManagementStatus, status: restoredStatus },
    oldValue: { managementStatus: previous.managementStatus, status: previous.status },
  });

  return serializeCase(ecgCase);
}

export async function runDuplicateDetection(caseRef: string) {
  const ecgCase = await findCaseForManagement(caseRef);
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  const duplicates = await detectDuplicateCases(ecgCase);
  if (duplicates[0]) {
    await prisma.eCGCase.update({
      data: { duplicateOfCaseId: duplicates[0].caseId },
      where: { id: ecgCase.id },
    }).catch(() => undefined);
    await recordCaseHistory({
      caseId: ecgCase.id,
      eventType: "DUPLICATE_DETECTED",
      payload: { duplicates },
      title: "Potential duplicate cases detected",
    });
    await recordCaseAudit({
      action: "CASE_MANAGEMENT_DUPLICATE_DETECTED",
      actorId: ecgCase.uploadedById,
      caseId: ecgCase.id,
      message: "Duplicate detection flagged potential matching cases.",
      metadata: { duplicates },
    });
  }
  return duplicates;
}

export async function onCaseCreated(ecgCase: ECGCase, actorId: string) {
  const managementStatus = managementStatusFromCaseStatus(ecgCase.status);
  if (ecgCase.managementStatus !== managementStatus) {
    await prisma.eCGCase.update({
      data: { managementStatus },
      where: { id: ecgCase.id },
    }).catch(() => undefined);
  }
  await recordCaseHistory({
    actorId,
    caseId: ecgCase.id,
    eventType: "CREATED",
    payload: { caseId: ecgCase.caseId, caseNumber: ecgCase.caseNumber },
    title: "Case created",
    toStatus: managementStatus,
  });
  await recordCaseAudit({
    action: "CASE_CREATED",
    actorId,
    caseId: ecgCase.id,
    message: `Case ${ecgCase.caseNumber ?? ecgCase.caseId} created.`,
    newValue: { caseId: ecgCase.caseId, caseNumber: ecgCase.caseNumber, status: ecgCase.status },
  });
  await runDuplicateDetection(ecgCase.id);
}

export async function onCaseDeleted(ecgCase: Pick<ECGCase, "caseId" | "caseNumber" | "id" | "patientId">, actorId: string) {
  await recordCaseHistory({
    actorId,
    caseId: ecgCase.id,
    eventType: "DELETED",
    payload: { caseId: ecgCase.caseId, caseNumber: ecgCase.caseNumber },
    title: "Case deleted",
  });
  await recordCaseAudit({
    action: "CASE_DELETED",
    actorId,
    caseId: ecgCase.id,
    message: `Case ${ecgCase.caseNumber ?? ecgCase.caseId} deleted.`,
    metadata: { deletedCaseId: ecgCase.id, publicCaseId: ecgCase.caseId },
  });
}
