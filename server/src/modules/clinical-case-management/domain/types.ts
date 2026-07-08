import type {
  CaseAttachment,
  CaseAttachmentCategory,
  CaseAudit,
  CaseComment,
  CaseCommentNoteType,
  CaseHistory,
  CaseHistoryEventType,
  CaseLock,
  CaseManagementStatus,
  CaseVersion,
  ECGCase,
  User,
} from "@prisma/client";
import type { ClinicalCaseLifecycle } from "./lifecycle";

export type ClinicalCaseRecord = ECGCase & {
  assignedDoctor?: Pick<User, "email" | "id" | "name" | "role"> | null;
  reviewer?: Pick<User, "email" | "id" | "name" | "role"> | null;
  reviewedBy?: Pick<User, "email" | "id" | "name" | "role"> | null;
  uploadedBy?: Pick<User, "email" | "id" | "name" | "role"> | null;
};

export type SerializedClinicalCase = {
  assignedDoctorId: string | null;
  caseId: string;
  caseNumber: string | null;
  createdAt: string;
  critical: boolean;
  id: string;
  labels: string[];
  lifecycle: ClinicalCaseLifecycle;
  managementStatus: CaseManagementStatus;
  patientId: string;
  priority: string;
  reviewerId: string | null;
  severity: string;
  status: string;
  tags: string[];
  updatedAt: string;
};

export type SerializedCaseEvent = {
  actorId: string | null;
  createdAt: string;
  eventType: CaseHistoryEventType;
  fromStatus: CaseManagementStatus | null;
  id: string;
  payload: unknown;
  source: "history";
  summary: string | null;
  title: string;
  toStatus: CaseManagementStatus | null;
};

export type SerializedTimelineEntry = SerializedCaseEvent | {
  action: string;
  actorId: string;
  createdAt: string;
  id: string;
  message: string;
  metadata: unknown;
  source: "audit";
};

export type SerializedClinicalNote = {
  authorId: string;
  body: string;
  caseId: string;
  createdAt: string;
  id: string;
  isClinical: boolean;
  mentions: string[];
  noteType: CaseCommentNoteType;
  parentId: string | null;
  updatedAt: string;
};

export type SerializedCaseAttachment = {
  caseId: string;
  category: CaseAttachmentCategory;
  checksum: string | null;
  createdAt: string;
  fileName: string;
  id: string;
  metadata: unknown;
  mimeType: string;
  sizeBytes: number | null;
  storagePath: string;
  uploadedById: string;
};

export type SerializedCaseAudit = {
  action: string;
  actorId: string;
  caseId: string;
  createdAt: string;
  entityId: string | null;
  entityType: string;
  id: string;
  ipAddress: string | null;
  message: string;
  metadata: unknown;
  newValue: unknown;
  oldValue: unknown;
};

export type SerializedCaseVersion = {
  caseId: string;
  createdAt: string;
  createdById: string;
  id: string;
  reason: string | null;
  restoredAt: string | null;
  snapshot: unknown;
  version: number;
};

export type SerializedCaseLock = {
  caseId: string;
  createdAt: string;
  expiresAt: string;
  id: string;
  releasedAt: string | null;
  resource: string;
  status: string;
  userId: string;
};

export type CaseSnapshotFields = Pick<
  ECGCase,
  | "assignedDoctorId"
  | "clinicalComments"
  | "clinicalNotes"
  | "doctorDiagnosis"
  | "ecgType"
  | "finalDiagnosis"
  | "heartRate"
  | "managementStatus"
  | "priority"
  | "recommendations"
  | "reviewerId"
  | "rhythm"
  | "severity"
  | "status"
  | "tags"
>;

export function serializeClinicalCase(ecgCase: ECGCase, lifecycle: ClinicalCaseLifecycle): SerializedClinicalCase {
  return {
    assignedDoctorId: ecgCase.assignedDoctorId,
    caseId: ecgCase.caseId,
    caseNumber: ecgCase.caseNumber,
    createdAt: ecgCase.createdAt.toISOString(),
    critical: ecgCase.priority === "CRITICAL" || ecgCase.severity === "CRITICAL",
    id: ecgCase.id,
    labels: ecgCase.tags,
    lifecycle,
    managementStatus: ecgCase.managementStatus,
    patientId: ecgCase.patientId,
    priority: ecgCase.priority,
    reviewerId: ecgCase.reviewerId,
    severity: ecgCase.severity,
    status: ecgCase.status,
    tags: ecgCase.tags,
    updatedAt: ecgCase.updatedAt.toISOString(),
  };
}

export function serializeCaseEvent(entry: CaseHistory): SerializedCaseEvent {
  return {
    actorId: entry.actorId,
    createdAt: entry.createdAt.toISOString(),
    eventType: entry.eventType,
    fromStatus: entry.fromStatus,
    id: entry.id,
    payload: entry.payload,
    source: "history",
    summary: entry.summary,
    title: entry.title,
    toStatus: entry.toStatus,
  };
}

export function serializeClinicalNote(comment: CaseComment): SerializedClinicalNote {
  return {
    authorId: comment.authorId,
    body: comment.body,
    caseId: comment.caseId,
    createdAt: comment.createdAt.toISOString(),
    id: comment.id,
    isClinical: comment.isClinical,
    mentions: comment.mentions,
    noteType: comment.noteType,
    parentId: comment.parentId,
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function serializeCaseAttachment(attachment: CaseAttachment): SerializedCaseAttachment {
  return {
    caseId: attachment.caseId,
    category: attachment.category,
    checksum: attachment.checksum,
    createdAt: attachment.createdAt.toISOString(),
    fileName: attachment.fileName,
    id: attachment.id,
    metadata: attachment.metadata,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    storagePath: attachment.storagePath,
    uploadedById: attachment.uploadedById,
  };
}

export function serializeCaseAudit(entry: CaseAudit): SerializedCaseAudit {
  return {
    action: entry.action,
    actorId: entry.actorId,
    caseId: entry.caseId,
    createdAt: entry.createdAt.toISOString(),
    entityId: entry.entityId,
    entityType: entry.entityType,
    id: entry.id,
    ipAddress: entry.ipAddress,
    message: entry.message,
    metadata: entry.metadata,
    newValue: entry.newValue,
    oldValue: entry.oldValue,
  };
}

export function serializeCaseVersion(version: CaseVersion): SerializedCaseVersion {
  return {
    caseId: version.caseId,
    createdAt: version.createdAt.toISOString(),
    createdById: version.createdById,
    id: version.id,
    reason: version.reason,
    restoredAt: version.restoredAt?.toISOString() ?? null,
    snapshot: version.snapshot,
    version: version.version,
  };
}

export function serializeCaseLock(lock: CaseLock): SerializedCaseLock {
  return {
    caseId: lock.caseId,
    createdAt: lock.createdAt.toISOString(),
    expiresAt: lock.expiresAt.toISOString(),
    id: lock.id,
    releasedAt: lock.releasedAt?.toISOString() ?? null,
    resource: lock.resource,
    status: lock.status,
    userId: lock.userId,
  };
}
