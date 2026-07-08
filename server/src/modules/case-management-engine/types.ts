import type {
  CaseAttachment,
  CaseAttachmentCategory,
  CaseAudit,
  CaseComment,
  CaseHistory,
  CaseHistoryEventType,
  CaseManagementStatus,
  CaseVersion,
  ECGCase,
  ECGCaseStatus,
  User,
} from "@prisma/client";

export type CaseManagementCase = ECGCase & {
  assignedDoctor?: Pick<User, "id" | "name" | "email"> | null;
  reviewer?: Pick<User, "id" | "name" | "email"> | null;
  reviewedBy?: Pick<User, "id" | "name" | "email"> | null;
  uploadedBy?: Pick<User, "id" | "name" | "email"> | null;
};

export type SerializedCaseHistory = {
  actorId: string | null;
  createdAt: string;
  eventType: CaseHistoryEventType;
  fromStatus: CaseManagementStatus | null;
  id: string;
  payload: unknown;
  summary: string | null;
  title: string;
  toStatus: CaseManagementStatus | null;
};

export type SerializedCaseComment = {
  authorId: string;
  body: string;
  caseId: string;
  createdAt: string;
  id: string;
  isClinical: boolean;
  mentions: string[];
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

export type DuplicateCandidate = {
  caseId: string;
  caseNumber: string | null;
  createdAt: string;
  matchScore: number;
  patientId: string;
  publicCaseId: string;
  reasons: string[];
};

export function managementStatusFromCaseStatus(status: ECGCaseStatus): CaseManagementStatus {
  switch (status) {
    case "ARCHIVED":
      return "ARCHIVED";
    case "SIGNED":
      return "SIGNED";
    case "APPROVED":
    case "FINALIZED":
      return "CONFIRMED";
    case "REVIEWED":
      return "REVIEWED";
    case "UNDER_REVIEW":
    case "AWAITING_SECOND_OPINION":
    case "ESCALATED":
    case "AI_COMPLETED":
      return "PENDING_REVIEW";
    default:
      return "DRAFT";
  }
}

export function serializeCaseHistory(entry: CaseHistory): SerializedCaseHistory {
  return {
    actorId: entry.actorId,
    createdAt: entry.createdAt.toISOString(),
    eventType: entry.eventType,
    fromStatus: entry.fromStatus,
    id: entry.id,
    payload: entry.payload,
    summary: entry.summary,
    title: entry.title,
    toStatus: entry.toStatus,
  };
}

export function serializeCaseComment(comment: CaseComment): SerializedCaseComment {
  return {
    authorId: comment.authorId,
    body: comment.body,
    caseId: comment.caseId,
    createdAt: comment.createdAt.toISOString(),
    id: comment.id,
    isClinical: comment.isClinical,
    mentions: comment.mentions,
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
