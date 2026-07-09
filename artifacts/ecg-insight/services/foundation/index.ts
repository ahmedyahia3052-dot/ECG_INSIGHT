/** Sprint 79 backend foundation — API abstraction, repositories, and enterprise client infrastructure. */

export { BACKEND_FOUNDATION_VERSION } from "./version";

export {
  foundationEnvironment,
  type FoundationEnvironment,
} from "./config/environment";

export {
  apiClientConfiguration,
  assertApiConfiguration,
  type ApiClientConfiguration,
} from "./config/api-config";

export {
  FEATURE_FLAGS,
  enabledFeatureFlags,
  isFeatureEnabled,
  resetFeatureFlagsForTests,
  serializeFeatureFlagsHeader,
  type FeatureFlagKey,
} from "./config/feature-flags";

export { enterpriseLogger, createCorrelationId } from "./logging/enterprise-logger";

export { useApiLoadingStore, trackApiLoading } from "./state/api-loading-store";

export {
  mapFoundationError,
  isRetryableFoundationError,
  logFoundationError,
  offlineRequestError,
  configurationRequestError,
  assertProductionApiConfiguration,
  type FoundationApiErrorDetails,
} from "./api/error-handler";

export { offlineDetector } from "./api/offline-detector";
export { withRetryStrategy, type RetryStrategyOptions } from "./api/retry-strategy";
export {
  requestCancellationRegistry,
  createCancellableRequestKey,
} from "./api/cancellation";
export { registerEnterpriseInterceptors } from "./api/interceptors";
export { executeFoundationRequest, apiRequest } from "./api/abstraction";
export type {
  FoundationRequestOptions,
  FoundationRequestContext,
  RepositoryContext,
  RepositoryResult,
  FoundationError,
  PaginatedQuery,
  HttpMethod,
} from "./api/types";

export {
  FOUNDATION_ROLE_HIERARCHY,
  type FoundationRole,
} from "./auth/roles";

export {
  setFoundationAccessTokenProvider,
  setFoundationUserRoleProvider,
  getFoundationAccessToken,
  requireFoundationAccessToken,
  getFoundationUserRole,
  assertFoundationRole,
  withAuthMiddleware,
} from "./auth/middleware";

export {
  PROTECTED_ROUTE_ROLES,
  canAccessRoute,
  requiredRolesForRoute,
  routeAccessDeniedMessage,
  normalizeRoutePath,
} from "./auth/route-protection";

export { BaseRepository } from "./repositories/base-repository";
export {
  CaseRepository,
  caseRepository,
  type CaseTimelineEvent,
  type CaseTimelineResponse,
} from "./repositories/case-repository";
export { PatientRepository, patientRepository } from "./repositories/patient-repository";
export {
  OrganizationRepository,
  organizationRepository,
  type ClinicalDoctor,
} from "./repositories/organization-repository";
export { WorkspaceRepository, workspaceRepository } from "./repositories/workspace-repository";
export { ViewerRepository, viewerRepository } from "./repositories/viewer-repository";
export { MonitorRepository, monitorRepository } from "./repositories/monitor-repository";
export { SubscriptionRepository, subscriptionRepository } from "./repositories/subscription-repository";
export { DeveloperRepository, developerRepository } from "./repositories/developer-repository";
export { ReportRepository, reportRepository } from "./repositories/report-repository";
export { NotificationRepository, notificationRepository } from "./repositories/notification-repository";
export { AuditRepository, auditRepository } from "./repositories/audit-repository";
export { DoctorRepository, doctorRepository } from "./repositories/doctor-repository";

export { BaseService } from "./services/base-service";
export { ClinicalApiService, clinicalApiService } from "./services/clinical-api-service";

export { useApiLoading, useActiveRequestCount } from "./hooks/use-api-loading";
export { useOfflineStatus } from "./hooks/use-offline-status";
export { useFeatureFlag } from "./hooks/use-feature-flag";
export { useRequestCancellation } from "./hooks/use-request-cancellation";

export {
  initializeApiFoundation,
  isApiFoundationInitialized,
  type ApiFoundationOptions,
} from "./bootstrap";
