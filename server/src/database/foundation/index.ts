/** Sprint 80 — Enterprise database foundation. */

export {
  assertDatabaseFoundationRegistry,
  DATABASE_ENTITY_REGISTRY,
  DATABASE_FOUNDATION_VERSION,
  DATABASE_RELATIONSHIP_REGISTRY,
  entitiesWithSoftDelete,
  getEntityContract,
} from "./contracts";
export type { AuditFieldPolicy, DatabaseEntityContract, DatabaseEntityId } from "./contracts";

export { buildAuditLogEntry, buildCreateAudit, buildCreateUpdateAudit, buildUpdateAudit } from "./audit";
export type { AuditActor, CreateAuditFields, UpdateAuditFields } from "./audit";

export { isSoftDeleted, notDeletedWhere, restoreSoftDeleteData, softDeleteData, withNotDeleted } from "./soft-delete";

export { assertRepositoryQuery, softDeleteRequiredEntities, validateRepositoryQuery } from "./repository-validator";
export type { RepositoryQueryValidation } from "./repository-validator";
