import { registerEnterpriseInterceptors } from "./api/interceptors";
import { offlineDetector } from "./api/offline-detector";
import { assertApiConfiguration } from "./config/api-config";
import { BACKEND_FOUNDATION_VERSION } from "./version";
import {
  setFoundationAccessTokenProvider,
  setFoundationUserRoleProvider,
} from "./auth/middleware";
import { enterpriseLogger } from "./logging/enterprise-logger";

let initialized = false;

export interface ApiFoundationOptions {
  getAccessToken?: () => string | null;
  getUserRole?: () => import("./auth/roles").FoundationRole | null;
}

export function initializeApiFoundation(options: ApiFoundationOptions = {}) {
  if (initialized) {
    if (options.getAccessToken) setFoundationAccessTokenProvider(options.getAccessToken);
    if (options.getUserRole) setFoundationUserRoleProvider(options.getUserRole);
    return BACKEND_FOUNDATION_VERSION;
  }

  const configuration = assertApiConfiguration();
  if (!configuration.ok) {
    enterpriseLogger.warn("bootstrap", configuration.warning);
  } else {
    enterpriseLogger.info("bootstrap", "API configuration validated", {
      source: configuration.source,
      version: BACKEND_FOUNDATION_VERSION,
    });
  }

  registerEnterpriseInterceptors();
  offlineDetector.start();

  if (options.getAccessToken) setFoundationAccessTokenProvider(options.getAccessToken);
  if (options.getUserRole) setFoundationUserRoleProvider(options.getUserRole);

  initialized = true;
  enterpriseLogger.info("bootstrap", "Backend foundation initialized", {
    version: BACKEND_FOUNDATION_VERSION,
  });
  return BACKEND_FOUNDATION_VERSION;
}

export function isApiFoundationInitialized() {
  return initialized;
}

export {
  setFoundationAccessTokenProvider,
  setFoundationUserRoleProvider,
} from "./auth/middleware";
