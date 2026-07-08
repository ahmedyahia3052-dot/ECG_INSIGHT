/**
 * Sprint 80 — Enterprise database foundation contracts.
 * Canonical entity registry for organizations, clinical records, billing, and audit.
 */

export const DATABASE_FOUNDATION_VERSION = "sprint80-v1";

export type DatabaseEntityId =
  | "organization"
  | "department"
  | "doctor"
  | "patient"
  | "ecgCase"
  | "clinicalDocument"
  | "clinicalReport"
  | "subscription"
  | "license"
  | "auditLog"
  | "notification"
  | "aiAnalysis";

export type AuditFieldPolicy = {
  createdAt: boolean;
  createdById: boolean;
  deletedAt: boolean;
  recordUuid: boolean;
  updatedAt: boolean;
  updatedById: boolean;
};

export type DatabaseEntityContract = {
  /** Prisma model name */
  model: string;
  /** Table name in PostgreSQL */
  table: string;
  /** Primary key strategy */
  primaryKey: "cuid" | "uuid" | "composite";
  /** External stable UUID for API references */
  recordUuidField?: string;
  /** Soft-delete column (null = active) */
  softDeleteField?: "deletedAt" | "archivedAt" | "revokedAt";
  audit: AuditFieldPolicy;
  /** Doctor is represented by User with role DOCTOR */
  notes?: string;
};

/** Normalized enterprise entity registry — Sprint 80 canonical surface. */
export const DATABASE_ENTITY_REGISTRY: Record<DatabaseEntityId, DatabaseEntityContract> = {
  organization: {
    audit: { createdAt: true, createdById: true, deletedAt: true, recordUuid: true, updatedAt: true, updatedById: true },
    model: "Organization",
    primaryKey: "cuid",
    recordUuidField: "recordUuid",
    softDeleteField: "deletedAt",
    table: "Organization",
  },
  department: {
    audit: { createdAt: true, createdById: true, deletedAt: true, recordUuid: true, updatedAt: true, updatedById: true },
    model: "Department",
    primaryKey: "cuid",
    recordUuidField: "recordUuid",
    softDeleteField: "deletedAt",
    table: "Department",
  },
  doctor: {
    audit: { createdAt: true, createdById: false, deletedAt: false, recordUuid: false, updatedAt: true, updatedById: false },
    model: "User",
    notes: "Doctors are User records with role DOCTOR; organization membership via OrganizationMember.",
    primaryKey: "cuid",
    table: "User",
  },
  patient: {
    audit: { createdAt: true, createdById: true, deletedAt: true, recordUuid: true, updatedAt: true, updatedById: true },
    model: "Patient",
    primaryKey: "cuid",
    recordUuidField: "recordUuid",
    softDeleteField: "deletedAt",
    table: "Patient",
  },
  ecgCase: {
    audit: { createdAt: true, createdById: true, deletedAt: true, recordUuid: true, updatedAt: true, updatedById: true },
    model: "ECGCase",
    primaryKey: "cuid",
    recordUuidField: "recordUuid",
    softDeleteField: "deletedAt",
    table: "ECGCase",
  },
  clinicalDocument: {
    audit: { createdAt: true, createdById: true, deletedAt: true, recordUuid: true, updatedAt: true, updatedById: true },
    model: "ClinicalDocument",
    notes: "createdById maps to uploadedById.",
    primaryKey: "cuid",
    recordUuidField: "recordUuid",
    softDeleteField: "deletedAt",
    table: "ClinicalDocument",
  },
  clinicalReport: {
    audit: { createdAt: true, createdById: true, deletedAt: true, recordUuid: true, updatedAt: true, updatedById: false },
    model: "ClinicalReport",
    notes: "authorId is the creating physician; reportUuid is the external identifier.",
    primaryKey: "cuid",
    recordUuidField: "reportUuid",
    softDeleteField: "deletedAt",
    table: "ClinicalReport",
  },
  subscription: {
    audit: { createdAt: true, createdById: false, deletedAt: false, recordUuid: false, updatedAt: true, updatedById: false },
    model: "UserSubscription",
    notes: "User-level billing via UserSubscription; org-level via OrganizationSubscription.",
    primaryKey: "cuid",
    table: "UserSubscription",
  },
  license: {
    audit: { createdAt: true, createdById: true, deletedAt: false, recordUuid: false, updatedAt: true, updatedById: false },
    model: "License",
    notes: "Revocation tracked via revokedAt/revokedById rather than deletedAt.",
    primaryKey: "cuid",
    softDeleteField: "revokedAt",
    table: "License",
  },
  auditLog: {
    audit: { createdAt: true, createdById: false, deletedAt: false, recordUuid: false, updatedAt: false, updatedById: false },
    model: "AuditLog",
    notes: "Immutable append-only audit trail; actorId references User.",
    primaryKey: "cuid",
    table: "AuditLog",
  },
  notification: {
    audit: { createdAt: true, createdById: false, deletedAt: true, recordUuid: false, updatedAt: true, updatedById: false },
    model: "Notification",
    primaryKey: "cuid",
    softDeleteField: "deletedAt",
    table: "Notification",
  },
  aiAnalysis: {
    audit: { createdAt: true, createdById: true, deletedAt: true, recordUuid: true, updatedAt: true, updatedById: false },
    model: "AIAnalysis",
    primaryKey: "cuid",
    recordUuidField: "recordUuid",
    softDeleteField: "deletedAt",
    table: "AIAnalysis",
  },
};

/** Core relationship edges for repository validation and documentation. */
export const DATABASE_RELATIONSHIP_REGISTRY = [
  { from: "Organization", to: "Department", cardinality: "1:N", fk: "organizationId" },
  { from: "Organization", to: "Patient", cardinality: "1:N", fk: "organizationId" },
  { from: "Organization", to: "User", cardinality: "1:N", fk: "organizationId" },
  { from: "Department", to: "Patient", cardinality: "1:N", fk: "departmentId" },
  { from: "Patient", to: "ECGCase", cardinality: "1:N", fk: "patientId" },
  { from: "ECGCase", to: "AIAnalysis", cardinality: "1:N", fk: "caseId" },
  { from: "ECGCase", to: "ClinicalDocument", cardinality: "1:N", fk: "caseId" },
  { from: "ECGCase", to: "ClinicalReport", cardinality: "1:N", fk: "caseId" },
  { from: "User", to: "ECGCase", cardinality: "1:N", fk: "uploadedById", role: "doctor/uploader" },
  { from: "User", to: "License", cardinality: "1:N", fk: "userId" },
  { from: "User", to: "UserSubscription", cardinality: "1:N", fk: "userId" },
  { from: "Organization", to: "OrganizationSubscription", cardinality: "1:1", fk: "organizationId" },
  { from: "ECGCase", to: "AuditLog", cardinality: "1:N", fk: "caseId" },
  { from: "ECGCase", to: "Notification", cardinality: "1:N", fk: "caseId" },
] as const;

export function getEntityContract(entityId: DatabaseEntityId): DatabaseEntityContract {
  return DATABASE_ENTITY_REGISTRY[entityId];
}

export function entitiesWithSoftDelete(): DatabaseEntityId[] {
  return (Object.entries(DATABASE_ENTITY_REGISTRY) as Array<[DatabaseEntityId, DatabaseEntityContract]>)
    .filter(([, contract]) => contract.softDeleteField === "deletedAt")
    .map(([id]) => id);
}

export function assertDatabaseFoundationRegistry() {
  const requiredEntities: DatabaseEntityId[] = [
    "organization",
    "department",
    "doctor",
    "patient",
    "ecgCase",
    "clinicalDocument",
    "clinicalReport",
    "subscription",
    "license",
    "auditLog",
    "notification",
    "aiAnalysis",
  ];
  for (const entityId of requiredEntities) {
    if (!DATABASE_ENTITY_REGISTRY[entityId]) {
      throw new Error(`Missing database entity contract: ${entityId}`);
    }
  }
  return true;
}
